"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Navigation to avoid loading heavy dependencies (icons, etc.) on the homepage
const Navigation = dynamic(
    () => import("./navigation").then((mod) => mod.Navigation),
    { ssr: true }
);

export function NavigationWrapper() {
    const pathname = usePathname();

    // Don't render (or load) Navigation on Admin or Homepage
    if (pathname?.startsWith("/admin") || pathname === "/") {
        return null;
    }

    return <Navigation />;
}
