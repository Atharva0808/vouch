import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        // Create the response object first
        const supabaseResponse = NextResponse.redirect(`${origin}${next}`)

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        // This is required for the server client to set the cookies
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        )
                        // This is required to pass the cookies back to the browser
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            if (next === '/dashboard') {
                try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('onboarding_completed')
                            .eq('id', user.id)
                            .maybeSingle()

                        if (!profile || profile.onboarding_completed !== true) {
                            return NextResponse.redirect(`${origin}/onboarding`)
                        }
                    }
                } catch {
                    // fallback to dashboard
                }
            }
            return supabaseResponse
        }
    }

    // If something went wrong, redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=Authentication failed. Please try again.`)
}
