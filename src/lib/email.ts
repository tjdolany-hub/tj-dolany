import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use onboarding@resend.dev until tjdolany.net domain is verified in Resend
const FROM = "TJ Dolany <onboarding@resend.dev>";
const ADMIN_EMAIL = "tjdolany@gmail.com";

interface RentalRequestData {
  eventType: "pronajem" | "volne";
  eventName: string | null;
  organizer: string | null;
  isPublic: boolean;
  location: string;
  date: string;
  endDate: string | null;
  time: string | null;
  timeTo: string | null;
  allDay: boolean;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  note: string | null;
}

function formatLocation(loc: string): string {
  const labels: Record<string, string> = {
    cely_areal: "Celý areál",
    sokolovna: "Sokolovna",
    kantyna: "Kantýna",
    venkovni_cast: "Venkovní část",
    hriste: "Hřiště",
  };
  if (loc === "cely_areal") return "Celý areál";
  return loc.split(",").map((v) => labels[v.trim()] || v.trim()).join(", ");
}

export async function sendNewRequestNotification(data: RentalRequestData) {
  const typeLabel = data.eventType === "pronajem" ? "Soukromá akce" : "Ostatní";
  const title = data.eventType === "pronajem" ? "Soukromá akce" : (data.eventName || "Bez názvu");
  const dateStr = new Date(data.date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  });
  const timeStr = data.allDay
    ? "Celý den"
    : data.time && data.timeTo
      ? `${data.time} – ${data.timeTo}`
      : (data.time || "—");
  const endDateStr = data.endDate
    ? new Date(data.endDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" })
    : null;

  const html = `
    <h2>Nová žádost o akci v areálu</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Typ:</td><td>${typeLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Název:</td><td>${title}</td></tr>
      ${data.organizer ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Pořadatel:</td><td>${data.organizer}</td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Datum:</td><td>${dateStr}${endDateStr ? ` – ${endDateStr}` : ""}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Čas:</td><td>${timeStr}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Místo:</td><td>${formatLocation(data.location)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Veřejná:</td><td>${data.isPublic ? "Ano" : "Ne"}</td></tr>
    </table>
    ${data.contactName || data.contactPhone || data.contactEmail ? `
    <h3>Kontakt</h3>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      ${data.contactName ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Jméno:</td><td>${data.contactName}</td></tr>` : ""}
      ${data.contactPhone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Telefon:</td><td>${data.contactPhone}</td></tr>` : ""}
      ${data.contactEmail ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${data.contactEmail}</td></tr>` : ""}
    </table>` : ""}
    ${data.note ? `<h3>Poznámka</h3><p>${data.note}</p>` : ""}
    <p style="margin-top:24px;color:#666;">Žádost můžete schválit nebo zamítnout v <a href="https://tjdolany.net/admin/events">administraci</a>.</p>
  `;

  await resend.emails.send({
    from: FROM,
    replyTo: ADMIN_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Nová žádost o akci: ${title} (${dateStr})`,
    html,
  });
}

export async function sendRequestStatusNotification(
  to: string,
  status: "approved" | "rejected",
  eventName: string,
  date: string,
  adminNote: string | null,
) {
  const dateStr = new Date(date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  });

  const isApproved = status === "approved";
  const subject = isApproved
    ? `Žádost schválena: ${eventName} (${dateStr})`
    : `Žádost zamítnuta: ${eventName} (${dateStr})`;

  const html = `
    <h2>${isApproved ? "Vaše žádost byla schválena" : "Vaše žádost byla zamítnuta"}</h2>
    <p><strong>Akce:</strong> ${eventName}</p>
    <p><strong>Datum:</strong> ${dateStr}</p>
    ${adminNote ? `<p><strong>Vzkaz od správce:</strong> ${adminNote}</p>` : ""}
    ${isApproved ? "<p>Vaše akce byla přidána do kalendáře areálu TJ Dolany.</p>" : ""}
    <p style="margin-top:24px;color:#666;">TJ Dolany — tjdolany.net</p>
  `;

  await resend.emails.send({
    from: FROM,
    replyTo: ADMIN_EMAIL,
    to,
    subject,
    html,
  });
}

export async function sendUserInviteEmail(
  to: string,
  name: string,
  role: "admin" | "editor",
  initialPassword: string,
) {
  const roleLabel = role === "admin" ? "Administrátor" : "Editor";
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tjdolany.net"}/login`;

  const html = `
    <h2>Byl Vám vytvořen přístup do administrace TJ Dolany</h2>
    <p>Dobrý den${name ? " " + name : ""},</p>
    <p>byl Vám zřízen přístup do administrace webu <a href="https://tjdolany.net">tjdolany.net</a>.</p>
    <table style="border-collapse:collapse;font-family:sans-serif;margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Role:</td><td>${roleLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">E-mail:</td><td>${to}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Počáteční heslo:</td><td><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${initialPassword}</code></td></tr>
    </table>
    <p>Přihlásit se můžete na adrese <a href="${loginUrl}">${loginUrl}</a>. Doporučujeme si po prvním přihlášení heslo změnit (odkaz „Zapomenuté heslo" na přihlašovací stránce).</p>
    <p style="margin-top:24px;color:#666;">TJ Dolany — tjdolany.net</p>
  `;

  await resend.emails.send({
    from: FROM,
    replyTo: ADMIN_EMAIL,
    to,
    subject: "Přístup do administrace TJ Dolany",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const html = `
    <h2>Obnovení hesla</h2>
    <p>Dobrý den,</p>
    <p>byla vyžádána obnova hesla pro účet <strong>${to}</strong> v administraci TJ Dolany. Pro nastavení nového hesla klikněte na tlačítko níže:</p>
    <p style="margin:24px 0;"><a href="${resetLink}" style="display:inline-block;background:#C41E3A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Nastavit nové heslo</a></p>
    <p style="color:#666;font-size:13px;">Pokud jste o obnovu nežádali, tento email ignorujte. Odkaz je platný 1 hodinu.</p>
    <p style="margin-top:24px;color:#666;">TJ Dolany — tjdolany.net</p>
  `;

  await resend.emails.send({
    from: FROM,
    replyTo: ADMIN_EMAIL,
    to,
    subject: "Obnovení hesla — TJ Dolany",
    html,
  });
}
