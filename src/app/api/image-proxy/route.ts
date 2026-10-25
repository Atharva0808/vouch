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
            // Instagram CDN URL expired or blocked -> Fallback to consistent real portrait
            const hash = encodeURIComponent(url.slice(-25).replace(/[^a-zA-Z0-9]/g, ""));
            return NextResponse.redirect(`https://i.pravatar.cc/300?u=${hash || "creator"}`);
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
        const hash = encodeURIComponent(url.slice(-25).replace(/[^a-zA-Z0-9]/g, ""));
        return NextResponse.redirect(`https://i.pravatar.cc/300?u=${hash || "creator"}`);
    }
}
