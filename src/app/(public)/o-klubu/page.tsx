import type { Metadata } from "next";
import OKlubuClient from "./OKlubuClient";

export const metadata: Metadata = {
  title: "O klubu",
  description: "Historie, výbor a kontakty TJ Dolany u Jaroměře.",
  openGraph: {
    title: "O klubu | TJ Dolany",
    description: "Historie, výbor a kontakty TJ Dolany u Jaroměře.",
  },
};

export default function OKlubuPage() {
  return <OKlubuClient />;
}
