"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoginView } from "@/components/auth/login-view";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceReady, setForceReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/branches");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading && !forceReady && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FFFDF9]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FFFDF9]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <LoginView />;
}
