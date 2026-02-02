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

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/director-mode",
    "/director-node",
    "/ads-mode",
    "/dashboard",
    "/project",
    "/account",
    "/music",
    "/image",
    "/video",
  ];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to auth if not authenticated on protected route
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth", request.url);
    // Preserve original URL for redirect after login
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

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
