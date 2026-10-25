import { NextRequest, NextResponse } from "next/server";

/**
 * Image proxy route — fetches images server-side to bypass
 * Instagram CDN anti-hotlinking protections.
 * Usage: /api/image-proxy?url=<encoded-image-url>
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        const imageResp = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "image/*",
            },
        });

        if (!imageResp.ok) {
            // Instagram CDN URL expired or blocked -> Fallback to initials avatar
            return NextResponse.redirect(`https://ui-avatars.com/api/?name=IG&size=300&background=FF6B9D&color=fff&bold=true&format=png`);
        }

        const contentType = imageResp.headers.get("content-type") || "image/jpeg";
        const buffer = await imageResp.arrayBuffer();

        return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, s-maxage=86400",
            },
        });
    } catch {
        return NextResponse.redirect(`https://ui-avatars.com/api/?name=IG&size=300&background=FF6B9D&color=fff&bold=true&format=png`);
    }
}
