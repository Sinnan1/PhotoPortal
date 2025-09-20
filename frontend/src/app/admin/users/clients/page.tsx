"use client";

import React from "react";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminClientsPage() {
  return <UserManagement defaultRole="CLIENT" />;
}