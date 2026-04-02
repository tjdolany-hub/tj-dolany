import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageNav from "@/components/public/PageNav";
import PageNavSpacer from "@/components/public/PageNavSpacer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <PageNav />
      <main className="flex-1 pt-16">
        <PageNavSpacer />
        {children}
      </main>
      <Footer />
    </>
  );
}
