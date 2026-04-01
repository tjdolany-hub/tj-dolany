/**
 * Seed script: imports 10 latest articles from scraped aktuality.json into Supabase.
 *
 * Usage: npx tsx scripts/seed-articles.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

interface ScrapedArticle {
  title: string;
  date: string;
  content: string;
  images?: string[];
  links?: string[];
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(dateStr: string): string {
  // Format: "28.3.2026"
  const [day, month, year] = dateStr.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00.000Z`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const filePath = path.resolve(__dirname, "../../Input/scraped/aktuality.json");
  const raw: ScrapedArticle[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const articles = raw.slice(0, 10);

  console.log(`Seeding ${articles.length} articles...`);

  for (const article of articles) {
    const slug = slugify(article.title);
    const createdAt = parseDate(article.date);

    // Check if already exists
    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  SKIP: "${article.title}" (slug exists)`);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({
        title: article.title,
        slug,
        content: article.content,
        summary: article.content.substring(0, 200).replace(/\n/g, " ").trim(),
        category: "aktuality" as const,
        published: true,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ERROR: "${article.title}":`, error.message);
      continue;
    }

    // Insert article image if available
    if (article.images && article.images.length > 0 && inserted) {
      await supabase.from("article_images").insert(
        article.images.map((url, i) => ({
          article_id: inserted.id,
          url,
          alt: article.title,
          sort_order: i,
        }))
      );
    }

    console.log(`  OK: "${article.title}"`);
  }

  console.log("Done!");
}

main();
