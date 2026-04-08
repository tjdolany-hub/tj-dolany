import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
  BorderStyle,
  PageBreak,
} from "docx";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const admin = await createServiceClient();

  // Build date filter
  let dateFrom: string;
  let dateTo: string;
  if (year && month) {
    const m = parseInt(month);
    dateFrom = `${year}-${String(m).padStart(2, "0")}-01`;
    dateTo = `${year}-${String(m + 1).padStart(2, "0")}-01`;
  } else if (year) {
    dateFrom = `${year}-01-01`;
    dateTo = `${parseInt(year) + 1}-01-01`;
  } else {
    // Default: current year
    const now = new Date();
    dateFrom = `${now.getFullYear()}-01-01`;
    dateTo = `${now.getFullYear() + 1}-01-01`;
  }

  // Fetch articles in date range, ordered by date
  const { data: articles } = await admin
    .from("articles")
    .select("id, title, content, summary, category, created_at, article_images(url, alt, sort_order)")
    .gte("created_at", dateFrom)
    .lt("created_at", dateTo)
    .is("deleted_at", null)
    .eq("published", true)
    .order("created_at", { ascending: true });

  // Fetch matches in date range for match numbers
  const { data: matches } = await admin
    .from("match_results")
    .select("id, date, opponent, score_home, score_away, is_home, match_number, match_type, competition, article_id")
    .gte("date", dateFrom)
    .lt("date", dateTo)
    .is("deleted_at", null)
    .order("date", { ascending: true });

  const matchByArticle = new Map<string, typeof matches extends (infer T)[] | null ? T : never>();
  if (matches) {
    for (const m of matches) {
      if (m.article_id) {
        matchByArticle.set(m.article_id, m);
      }
    }
  }

  const sections: Paragraph[] = [];

  // Title
  const periodLabel = month
    ? `${getMonthName(parseInt(month))} ${year}`
    : year || new Date().getFullYear().toString();

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Kronika TJ Dolany — ${periodLabel}`,
          bold: true,
          size: 36,
          font: "Calibri",
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Vygenerováno: ${new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" })}`,
          italics: true,
          size: 20,
          color: "888888",
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Process each article
  for (const article of articles ?? []) {
    const match = matchByArticle.get(article.id);
    const createdAt = new Date(article.created_at);
    const dateStr = createdAt.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Prague",
    });

    // Article heading with match number if applicable
    let titleText = article.title;
    if (match?.match_number) {
      titleText = `[Zápas #${match.match_number}] ${article.title}`;
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: titleText,
            bold: true,
            size: 28,
            font: "Calibri",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 100 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "C41E3A" },
        },
      })
    );

    // Date and category
    const categoryLabels: Record<string, string> = {
      aktuality: "Aktuality",
      fotbal: "Fotbal",
      sokolovna: "Sokolovna",
      oznameni: "Oznámení",
    };

    const metaParts = [dateStr];
    if (article.category) {
      metaParts.push(categoryLabels[article.category] || article.category);
    }
    if (match) {
      const typeLabel = match.match_type === "pratelsky" ? "Přátelský zápas" : "Mistrovský zápas";
      metaParts.push(typeLabel);
      if (match.competition) metaParts.push(match.competition);
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metaParts.join(" • "),
            italics: true,
            size: 18,
            color: "666666",
            font: "Calibri",
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Article content — split by lines and render as paragraphs
    if (article.content) {
      const lines = article.content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          sections.push(new Paragraph({ spacing: { after: 100 } }));
          continue;
        }

        // Handle markdown headings
        if (trimmed.startsWith("## ")) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmed.replace(/^##\s*/, ""),
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
          continue;
        }

        // Handle bold lines (**text**)
        const runs: TextRun[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let boldMatch;
        while ((boldMatch = boldRegex.exec(trimmed)) !== null) {
          if (boldMatch.index > lastIndex) {
            runs.push(
              new TextRun({
                text: trimmed.slice(lastIndex, boldMatch.index),
                size: 22,
                font: "Calibri",
              })
            );
          }
          runs.push(
            new TextRun({
              text: boldMatch[1],
              bold: true,
              size: 22,
              font: "Calibri",
            })
          );
          lastIndex = boldMatch.index + boldMatch[0].length;
        }
        if (lastIndex < trimmed.length) {
          runs.push(
            new TextRun({
              text: trimmed.slice(lastIndex),
              size: 22,
              font: "Calibri",
            })
          );
        }

        if (runs.length === 0) {
          runs.push(
            new TextRun({ text: trimmed, size: 22, font: "Calibri" })
          );
        }

        sections.push(
          new Paragraph({
            children: runs,
            spacing: { after: 100 },
          })
        );
      }
    }

    // Images
    const images = (article.article_images ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    );

    for (const img of images) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) continue;
        const buffer = Buffer.from(await response.arrayBuffer());

        sections.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width: 500, height: 350 },
                type: "jpg",
              }),
            ],
            spacing: { before: 200, after: 100 },
            alignment: AlignmentType.CENTER,
          })
        );

        if (img.alt) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: img.alt,
                  italics: true,
                  size: 18,
                  color: "888888",
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }
      } catch {
        // Skip images that fail to download
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Obrázek: ${img.alt || img.url}]`,
                italics: true,
                size: 18,
                color: "999999",
                font: "Calibri",
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Page break between articles
    sections.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  }

  // Generate document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  const filename = `kronika-tj-dolany-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.docx`;

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function getMonthName(month: number): string {
  const names = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
  ];
  return names[month - 1] || "";
}
