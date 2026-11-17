import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export async function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              // 30 days persistent token max-age
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 30,
              sameSite: "lax",
              path: "/",
            });
          }
        } catch {
          // Server Components cannot write cookies. The request proxy refreshes sessions.
        }
      },
    },
  });
}
