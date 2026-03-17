"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function HeaderSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="rounded-md border border-brand/30 px-3 py-1.5 text-zinc-700 transition hover:bg-brand/10 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}