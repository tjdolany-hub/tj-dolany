import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import sharp from "sharp";

/**
 * Removes white/near-white background from a logo using flood-fill from edges.
 * Accepts an image via form data, returns the processed PNG uploaded to Supabase Storage.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const removeBackground = formData.get("removeBackground") !== "false";

  if (!file) {
    return NextResponse.json({ error: "Soubor je povinný" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Neplatný typ souboru. Povoleny: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Soubor je příliš velký (max 5 MB)" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let outputBuffer: Buffer;

  if (removeBackground) {
    // Process: resize to 200x200, remove white background via flood-fill
    const resized = await sharp(buffer)
      .resize(200, 200, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: rawData, info } = resized;
    const w = info.width;
    const h = info.height;
    const buf = Buffer.from(rawData);
    const threshold = 240;

    function isWhitish(idx: number) {
      return buf[idx * 4] >= threshold && buf[idx * 4 + 1] >= threshold && buf[idx * 4 + 2] >= threshold;
    }

    // Flood-fill from edges
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    for (let x = 0; x < w; x++) {
      if (isWhitish(x)) { queue.push(x); visited[x] = 1; }
      const bottom = (h - 1) * w + x;
      if (isWhitish(bottom)) { queue.push(bottom); visited[bottom] = 1; }
    }
    for (let y = 0; y < h; y++) {
      const left = y * w;
      if (isWhitish(left)) { queue.push(left); visited[left] = 1; }
      const right = y * w + (w - 1);
      if (isWhitish(right)) { queue.push(right); visited[right] = 1; }
    }

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const x = idx % w;
      const y = Math.floor(idx / w);
      const neighbors: number[] = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < w - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - w);
      if (y < h - 1) neighbors.push(idx + w);

      for (const n of neighbors) {
        if (!visited[n] && isWhitish(n)) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    for (let i = 0; i < w * h; i++) {
      if (visited[i]) {
        buf[i * 4 + 3] = 0;
      }
    }

    outputBuffer = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();
  } else {
    // Just resize and convert to PNG without background removal
    outputBuffer = await sharp(buffer)
      .resize(200, 200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  // Upload to Supabase Storage
  const filename = `team-logo-${Date.now()}.png`;
  const storagePath = `logos/${filename}`;

  const admin = await createServiceClient();
  const { error: uploadError } = await admin.storage
    .from("photos")
    .upload(storagePath, outputBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from("photos")
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
