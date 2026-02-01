import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to request for subsequent middleware
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Write to response to persist to browser
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - this triggers setAll() if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Return response with persisted cookies
  return supabaseResponse;
}

// Apply middleware to all protected routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/project/:path*",
    "/account/:path*",
    "/auth/:path*",
    "/director-node/:path*",
    "/director-mode/:path*",
    "/ads-mode/:path*",
    "/music/:path*",
    "/image/:path*",
    "/video/:path*",
  ],
};
