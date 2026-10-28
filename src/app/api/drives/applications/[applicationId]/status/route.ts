import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus } from "@/lib/drives-service";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ applicationId: string }> }
) {
    try {
        const { applicationId } = await context.params;
        const { searchParams } = new URL(req.url);
        let status = searchParams.get("status");

        if (!status) {
            try {
                const body = await req.json();
                status = body?.status;
            } catch {
                // ignore
            }
        }

        if (!status) {
            return NextResponse.json({ error: "Missing status parameter" }, { status: 400 });
        }

        const application = await updateApplicationStatus(applicationId, status);
        return NextResponse.json({ application, message: `Application ${status}` });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to update application status" }, { status: 500 });
    }
}

