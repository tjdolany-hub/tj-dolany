import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand-red focus:px-4 focus:py-2 focus:text-white"
      >
        Přeskočit na obsah
      </a>
      <Header />
      <main id="obsah" className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
