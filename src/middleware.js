import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
  const { user, response } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/auth/callback", "/api/health"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return Response.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return Response.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|icons/|api/).*)",
  ],
};
