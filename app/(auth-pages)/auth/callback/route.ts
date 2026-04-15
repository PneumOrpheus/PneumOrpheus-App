import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id && user.email) {
      const rawName =
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
        (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null);

      const clinicianName = rawName?.trim() || user.email.split("@")[0];

      const { error: clinicianUpsertError } = await supabase
        .from("clinicians")
        .upsert(
          {
            id: user.id,
            email: user.email,
            name: clinicianName,
          },
          { onConflict: "id" },
        );

      if (clinicianUpsertError) {
        console.error("Failed to upsert clinician after auth callback", clinicianUpsertError);
      }
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/`);
}