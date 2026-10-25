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
        const headers: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        };

        if (url.includes("iqsaved.com") || url.includes("stories-viewer")) {
            headers["Referer"] = "https://insta-stories-viewer.com/";
        } else if (url.includes("cdninstagram.com") || url.includes("fbcdn.net") || url.includes("instagram.com")) {
            headers["Referer"] = "https://www.instagram.com/";
        }

        const imageResp = await fetch(url, { headers });

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
