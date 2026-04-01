import type { Metadata } from "next";
import HistorieClient from "./HistorieClient";

export const metadata: Metadata = {
  title: "Historie",
  description: "Historie TJ Dolany u Jaroměře — od založení sokolovny po současnost.",
  openGraph: {
    title: "Historie | TJ Dolany",
    description: "Historie TJ Dolany u Jaroměře — od založení sokolovny po současnost.",
  },
};

export default function HistoriePage() {
  return <HistorieClient />;
}
