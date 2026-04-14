import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminRoleProvider, type AdminRole } from "@/components/admin/AdminRoleContext";

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

  const admin = await createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role: AdminRole = (profile?.role === "admin" ? "admin" : "editor");

  return (
    <AdminRoleProvider role={role} userId={user.id}>
      <div className="min-h-screen bg-surface-muted flex">
        <AdminSidebar role={role} />
        <main className="flex-1 p-4 pt-18 sm:p-6 sm:pt-18 lg:p-8 lg:pt-8 ml-0 lg:ml-64">{children}</main>
      </div>
    </AdminRoleProvider>
  );
}
