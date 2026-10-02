"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Admin and merchant now share one sign-in form — anything still linking here goes straight to it. */
export default function AdminLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
