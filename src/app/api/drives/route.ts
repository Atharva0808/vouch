import { NextRequest, NextResponse } from "next/server";
import { createDrive, getDrives } from "@/lib/drives-service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const city = searchParams.get("city") || undefined;
        const category = searchParams.get("category") || undefined;
        const status = searchParams.get("status") || "active";

        const drives = await getDrives({ city, category, status });
        return NextResponse.json({ drives, count: drives.length });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to fetch drives" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id") || undefined;

        const drive = await createDrive(body, userId);
        return NextResponse.json({ drive, message: "Marketing drive created successfully" }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to create drive" }, { status: 500 });
    }
}

