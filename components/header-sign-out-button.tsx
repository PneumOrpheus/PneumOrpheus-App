"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function HeaderSignOutButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="h-8 cursor-pointer border-brand/30"
    >
      {isSigningOut ? t.common.signingOut : t.common.signOut}
    </Button>
  );
}