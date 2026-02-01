import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Read from document.cookie
          const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`));
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
        },
        set(name: string, value: string, options: any) {
          // Write to document.cookie with proper options
          let cookie = `${name}=${encodeURIComponent(value)}`;

          if (options?.maxAge) {
            cookie += `; max-age=${options.maxAge}`;
          }
          if (options?.path) {
            cookie += `; path=${options.path}`;
          }
          if (options?.domain) {
            cookie += `; domain=${options.domain}`;
          }
          if (options?.sameSite) {
            cookie += `; samesite=${options.sameSite}`;
          }
          if (options?.secure) {
            cookie += `; secure`;
          }

          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          // Remove by setting max-age=0
          this.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
