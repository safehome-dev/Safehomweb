import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const payload = {
          id: data.user.id,
          name:
            (data.user.user_metadata?.name as string | undefined) ??
            (data.user.user_metadata?.full_name as string | undefined) ??
            null,
          avatar_url:
            (data.user.user_metadata?.avatar_url as string | undefined) ??
            (data.user.user_metadata?.picture as string | undefined) ??
            null,
          terms_accepted_at: new Date().toISOString(),
        };
        await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id", ignoreDuplicates: false });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
