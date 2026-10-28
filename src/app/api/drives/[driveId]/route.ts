import { NextRequest, NextResponse } from "next/server";
import { getDrive, deleteDrive } from "@/lib/drives-service";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ driveId: string }> }
) {
    try {
        const { driveId } = await context.params;
        const drive = await getDrive(driveId);
        if (!drive) {
            return NextResponse.json({ error: "Drive not found" }, { status: 404 });
        }
        return NextResponse.json(drive);
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to fetch drive" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ driveId: string }> }
) {
    try {
        const { driveId } = await context.params;
        const success = await deleteDrive(driveId);
        return NextResponse.json({ deleted: success, message: "Drive deleted successfully" });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to delete drive" }, { status: 500 });
    }
}

