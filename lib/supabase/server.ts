import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Must be created fresh on every request (cookies()
 * is request-scoped in the Next.js App Router).
 *
 * NOTE: Server Components cannot write cookies (Next.js will throw if you
 * try). That's fine — the `set` calls below are wrapped in try/catch so
 * this client can also be safely used read-only inside Server Components,
 * while still being able to write cookies when called from a Server
 * Action or Route Handler (e.g. /auth/callback).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware handles
            // session refresh, so this can be safely ignored.
          }
        },
      },
    }
  );
}
