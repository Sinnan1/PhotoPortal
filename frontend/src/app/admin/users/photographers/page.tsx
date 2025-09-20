"use client";

import React from "react";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminPhotographersPage() {
  return <UserManagement defaultRole="PHOTOGRAPHER" />;
}