import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
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

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // 1. SKIP middleware logic for the auth callback and onboarding
    if (path.startsWith("/auth/callback") || path === "/onboarding") {
        return supabaseResponse;
    }

    // 2. If user is NOT signed in and trying to access dashboard
    if (!user && path.startsWith("/dashboard")) {
        const isDemoOrOnboarded =
            request.cookies.get("vouch_demo_user")?.value === "true" ||
            request.cookies.get("vouch_onboarded")?.value === "true";

        if (isDemoOrOnboarded) {
            return supabaseResponse;
        }

        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", path);
        const redirectRes = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value));
        return redirectRes;
    }

    // 3. If user IS signed in and trying to access /login or /signup -> Redirect to /dashboard
    if (user && (path === "/login" || path === "/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        const redirectRes = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value));
        return redirectRes;
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (svg, png, etc)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
