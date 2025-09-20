"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { usePathname } from "next/navigation";
import "../../../styles/admin.css";

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Pages that don't require admin authentication
  const publicAdminPages = ['/admin/login', '/admin/setup', '/admin/activate'];
  
  // If it's a public admin page, render without AdminLayout
  if (publicAdminPages.includes(pathname)) {
    return <div className="admin-public-page">{children}</div>;
  }
  
  // Otherwise, use the full AdminLayout with authentication
  return <AdminLayout>{children}</AdminLayout>;
}