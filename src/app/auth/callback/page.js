"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CallbackHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect") || "/";

    if (!code) {
      window.location.href = "/login";
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    supabase.auth.exchangeCodeForSession(code).then(() => {
      window.location.href = redirect;
    }).catch((err) => {
      window.location.href = `/login?error=${encodeURIComponent(err.message)}`;
    });
  }, [searchParams]);

  return (
    <p className="text-zinc-500 text-sm">Signing you in...</p>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Suspense fallback={<p className="text-zinc-500 text-sm">Loading...</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
