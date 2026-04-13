"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { isLoggedIn } from "@/lib/user-profile";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  if (typeof window !== "undefined" && !isLoggedIn()) return null;

  return <DashboardLayout />;
}
