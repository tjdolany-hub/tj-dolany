import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar />
      <main className="flex-1 p-4 pt-18 sm:p-6 sm:pt-18 lg:p-8 lg:pt-8 ml-0 lg:ml-64">{children}</main>
    </div>
  );
}
