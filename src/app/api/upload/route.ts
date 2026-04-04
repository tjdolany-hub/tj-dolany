import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_WIDTH = 1920;
const QUALITY = 80;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 400 }
    );
  }

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/avif",
    "image/heic", "image/heif",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Convert to WebP, resize if needed
  const webpBuffer = await sharp(buffer)
    .rotate() // auto-orient based on EXIF (fixes iPhone portrait rotation)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(filename, webpBuffer, {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
