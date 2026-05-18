import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach((c: any) => cookieStore.set(c.name, c.value, c.options));
          } catch {
            // Server Component içinde set engellenebilir.
          }
        }
      }
    }
  );
}
