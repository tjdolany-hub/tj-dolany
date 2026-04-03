import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import PDFDocument from "pdfkit";

const EVENT_TYPE_LABELS: Record<string, string> = {
  akce: "Akce TJ",
  volne: "Ostatní",
  zapas: "Zápas",
  trenink: "Pravidelné akce",
  pronajem: "Soukromá akce",
};

const LOCATION_LABELS: Record<string, string> = {
  cely_areal: "Celý areál",
  sokolovna: "Sokolovna",
  kantyna: "Kantýna",
  venkovni_cast: "Venkovní část",
  hriste: "Hřiště",
};

function formatLocation(loc: string | null): string {
  if (!loc) return "—";
  if (loc === "cely_areal") return "Celý areál";
  return loc.split(",").map((v) => LOCATION_LABELS[v.trim()] || v.trim()).join(", ");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "Celý den";
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface CalEvent {
  id: string;
  title: string;
  date: string;
  event_type: string;
  location: string | null;
  organizer: string | null;
}

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  title: string;
  time_from: string;
  time_to: string | null;
  location: string | null;
  organizer: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

function getScheduleEvents(schedule: ScheduleEntry[], startDate: Date, endDate: Date): CalEvent[] {
  const events: CalEvent[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dow = current.getDay();
    const dateStr = current.toISOString().slice(0, 10);
    for (const s of schedule) {
      if (s.day_of_week !== dow) continue;
      if (s.valid_from && dateStr < s.valid_from) continue;
      if (s.valid_to && dateStr > s.valid_to) continue;
      events.push({
        id: `sched-${s.id}-${dateStr}`,
        title: s.title,
        date: `${dateStr}T${s.time_from}`,
        event_type: "trenink",
        location: s.location,
        organizer: s.organizer,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return events;
}

function generatePDF(events: CalEvent[], periodLabel: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc.fontSize(16).font("Helvetica-Bold")
      .text("TJ Dolany - Prehled akci", { align: "center" });
    doc.fontSize(10).font("Helvetica")
      .text(periodLabel, { align: "center" });
    doc.moveDown(1);

    // Table header
    const colX = [40, 110, 170, 340, 415, 490];
    const colWidths = [70, 60, 170, 75, 75, 70];
    const headerLabels = ["Datum", "Cas", "Nazev", "Typ", "Misto", "Poradatel"];

    doc.fontSize(8).font("Helvetica-Bold");
    const headerY = doc.y;
    doc.rect(40, headerY - 2, 520, 14).fill("#C41E3A");
    doc.fillColor("white");
    for (let i = 0; i < headerLabels.length; i++) {
      doc.text(headerLabels[i], colX[i], headerY, { width: colWidths[i], align: "left" });
    }
    doc.fillColor("black").font("Helvetica").fontSize(7);
    doc.y = headerY + 16;

    // Rows
    let rowY = doc.y;
    let even = false;
    for (const e of events) {
      if (rowY > 780) {
        doc.addPage();
        rowY = 40;
        // Repeat header
        doc.fontSize(8).font("Helvetica-Bold");
        doc.rect(40, rowY - 2, 520, 14).fill("#C41E3A");
        doc.fillColor("white");
        for (let i = 0; i < headerLabels.length; i++) {
          doc.text(headerLabels[i], colX[i], rowY, { width: colWidths[i], align: "left" });
        }
        doc.fillColor("black").font("Helvetica").fontSize(7);
        rowY += 16;
        even = false;
      }

      if (even) {
        doc.rect(40, rowY - 2, 520, 12).fill("#f5f5f5");
        doc.fillColor("black");
      }
      even = !even;

      const row = [
        formatDate(e.date),
        formatTime(e.date),
        e.title,
        EVENT_TYPE_LABELS[e.event_type] || e.event_type,
        formatLocation(e.location),
        e.organizer || "—",
      ];
      for (let i = 0; i < row.length; i++) {
        doc.text(row[i], colX[i], rowY, { width: colWidths[i], align: "left", lineBreak: false });
      }
      rowY += 12;
      doc.y = rowY;
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).fillColor("#999")
      .text(`Vygenerovano: ${new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, { align: "right" });

    doc.end();
  });
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Period: current month + next 4 weeks
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 28);

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    // Fetch calendar events
    const { data: calEvents } = await supabase
      .from("calendar_events")
      .select("id, title, date, event_type, location, organizer")
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    // Fetch weekly schedule
    const { data: schedule } = await supabase
      .from("weekly_schedule")
      .select("id, day_of_week, title, time_from, time_to, location, organizer, valid_from, valid_to");

    const scheduleEvents = getScheduleEvents(
      (schedule || []) as ScheduleEntry[],
      startDate,
      endDate,
    );

    // Merge and sort
    const allEvents = [
      ...((calEvents || []) as CalEvent[]),
      ...scheduleEvents,
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const periodLabel = `${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())} (${allEvents.length} akci)`;

    const pdfBuffer = await generatePDF(allEvents, periodLabel);

    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fileName = `tj-dolany-akce-${now.toISOString().slice(0, 10)}.pdf`;

    await resend.emails.send({
      from: "TJ Dolany <onboarding@resend.dev>",
      replyTo: "tjdolany@gmail.com",
      to: "tjdolany@gmail.com",
      subject: `Týdenní záloha akcí TJ Dolany — ${formatDate(now.toISOString())}`,
      html: `
        <h2>Týdenní záloha plánu akcí</h2>
        <p>V příloze najdete přehled všech akcí v období ${periodLabel}.</p>
        <p style="color:#666;margin-top:24px;">Automaticky generováno z tjdolany.net</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true, events: allEvents.length, period: periodLabel });
  } catch (error) {
    console.error("Calendar backup failed:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
