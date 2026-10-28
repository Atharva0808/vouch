import { NextRequest, NextResponse } from "next/server";
import { getUserDrives } from "@/lib/drives-service";

export async function GET(req: NextRequest) {
    try {
        const userId = req.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000001";
        const drives = await getUserDrives(userId);
        return NextResponse.json({ drives, count: drives.length });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to fetch user drives" }, { status: 500 });
    }
}
