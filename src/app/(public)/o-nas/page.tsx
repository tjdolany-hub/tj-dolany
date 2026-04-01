import type { Metadata } from "next";
import ONasClient from "./ONasClient";

export const metadata: Metadata = {
  title: "O nás",
  description: "O Tělovýchovné jednotě Dolany u Jaroměře — kontakty, výbor a mapa.",
  openGraph: {
    title: "O nás | TJ Dolany",
    description: "O Tělovýchovné jednotě Dolany u Jaroměře — kontakty, výbor a mapa.",
  },
};

export default function ONasPage() {
  return <ONasClient />;
}
