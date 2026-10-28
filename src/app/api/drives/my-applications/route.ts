import { NextRequest, NextResponse } from "next/server";
import { getUserApplications } from "@/lib/drives-service";

export async function GET(req: NextRequest) {
    try {
        const userId = req.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000001";
        const applications = await getUserApplications(userId);
        return NextResponse.json({ applications, count: applications.length });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to fetch user applications" }, { status: 500 });
    }
}

