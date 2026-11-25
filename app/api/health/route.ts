import { isFirebaseConfigured } from "@/lib/firebase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      ts: Date.now(),
      services: {
        supabase: isSupabaseConfigured(),
        firebase: isFirebaseConfigured(),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
