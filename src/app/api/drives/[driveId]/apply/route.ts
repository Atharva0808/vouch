import { NextRequest, NextResponse } from "next/server";
import { applyToDrive, getDrive } from "@/lib/drives-service";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ driveId: string }> }
) {
    try {
        const { driveId } = await context.params;
        const body = await req.json();
        const userId = req.headers.get("x-user-id") || undefined;

        const drive = await getDrive(driveId);
        if (!drive) {
            return NextResponse.json({ error: "Drive not found" }, { status: 404 });
        }
        if (drive.status && drive.status !== "active") {
            return NextResponse.json({ error: "This drive is no longer accepting applications" }, { status: 400 });
        }

        const application = await applyToDrive(driveId, body, userId);
        return NextResponse.json({ application, message: "Application submitted successfully" }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to submit application" }, { status: 500 });
    }
}
