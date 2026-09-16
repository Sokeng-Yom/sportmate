"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiClient } from "@/lib/apiClient";

// Simple smoke-test page: confirms the frontend can reach both Supabase
// and FastAPI before any real screens are built. Delete or replace once
// login/register/dashboard pages exist.
export default function Home() {
  const [supabaseStatus, setSupabaseStatus] = useState("Checking...");
  const [apiStatus, setApiStatus] = useState("Checking...");

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      setSupabaseStatus(error ? `Error: ${error.message}` : "Connected ✅");
    });

    apiClient
      .get<{ status: string }>("/health", { auth: false })
      .then(() => setApiStatus("Connected ✅"))
      .catch((err) => setApiStatus(`Error: ${err.message}`));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold text-brand">
        SportMate — Frontend Setup
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="font-medium">Supabase client</p>
        <p className="text-sm text-gray-600">{supabaseStatus}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="font-medium">FastAPI backend (/health)</p>
        <p className="text-sm text-gray-600">{apiStatus}</p>
      </div>
      <p className="text-xs text-gray-400">
        If FastAPI shows an error, confirm your teammate&apos;s backend is
        running on the URL in NEXT_PUBLIC_API_URL and that CORS allows
        localhost:3000.
      </p>
    </main>
  );
}
