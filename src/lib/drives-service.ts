import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getAdminSupabase(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jzgqeemyrnmtaagdwalc.supabase.co";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

function isValidUuid(id: any): boolean {
    if (typeof id !== "string") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function createDrive(data: any, userId?: string) {
    const sb = getAdminSupabase();
    const effectiveUserId = isValidUuid(userId) ? userId! : "00000000-0000-0000-0000-000000000001";
    const driveId = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const driveRecord = {
        ...data,
        id: driveId,
        user_id: effectiveUserId,
        status: data.status || "active",
        created_at: data.created_at || now,
        updated_at: now,
    };

    // 1. Try marketing_drives table if exists
    try {
        const { data: res, error } = await sb.from("marketing_drives").insert(driveRecord).select().single();
        if (!error && res) return res;
    } catch {
        // fallback
    }

    // 2. Resilient fallback to reports table
    try {
        await sb.from("reports").insert({
            id: driveId,
            user_id: effectiveUserId,
            name: "marketing_drive",
            report_data: driveRecord,
        });
        return driveRecord;
    } catch (err: any) {
        console.error("Error creating drive in fallback:", err);
        return driveRecord;
    }
}

export async function getDrives(params: { city?: string; category?: string; status?: string } = {}) {
    const sb = getAdminSupabase();
    const { city, category, status = "active" } = params;

    // 1. Try marketing_drives
    try {
        let q = sb.from("marketing_drives").select("*");
        if (status && status !== "all") q = q.eq("status", status);
        if (city && city !== "all") q = q.ilike("city", `%${city}%`);
        if (category && category !== "all") q = q.eq("category", category);
        const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
        if (!error && data) {
            // Populate applications count
            for (const d of data) {
                const apps = await getDriveApplications(d.id);
                d.applications_count = apps.length;
            }
            return data;
        }
    } catch {
        // fallback
    }

    // 2. Fallback to reports
    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "marketing_drive")
            .order("created_at", { ascending: false })
            .limit(100);

        if (error || !data) return [];

        const drives = [];
        for (const row of data) {
            const d = row.report_data || {};
            d.id = d.id || row.id;
            d.user_id = d.user_id || row.user_id;
            d.created_at = d.created_at || row.created_at;

            if (status && status !== "all" && d.status !== status) continue;
            if (city && city !== "all" && !d.city?.toLowerCase().includes(city.toLowerCase())) continue;
            if (category && category !== "all" && d.category !== category) continue;

            const apps = await getDriveApplications(d.id);
            d.applications_count = apps.length;
            drives.push(d);
        }
        return drives;
    } catch (err) {
        console.error("Error getDrives fallback:", err);
        return [];
    }
}

export async function getDrive(driveId: string) {
    if (!isValidUuid(driveId)) return null;
    const sb = getAdminSupabase();

    try {
        const { data, error } = await sb.from("marketing_drives").select("*").eq("id", driveId).maybeSingle();
        if (!error && data) {
            const apps = await getDriveApplications(driveId);
            data.applications = apps;
            data.applications_count = apps.length;
            return data;
        }
    } catch {
        // fallback
    }

    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "marketing_drive")
            .eq("id", driveId)
            .maybeSingle();

        if (!error && data) {
            const d = data.report_data || {};
            d.id = data.id;
            d.user_id = data.user_id;
            const apps = await getDriveApplications(driveId);
            d.applications = apps;
            d.applications_count = apps.length;
            return d;
        }
    } catch {
        // fallback
    }
    return null;
}

export async function getUserDrives(userId: string) {
    const sb = getAdminSupabase();
    const effectiveUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000001";

    try {
        const { data, error } = await sb
            .from("marketing_drives")
            .select("*")
            .eq("user_id", effectiveUserId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            for (const d of data) {
                const apps = await getDriveApplications(d.id);
                d.applications = apps;
                d.applications_count = apps.length;
            }
            return data;
        }
    } catch {
        // fallback
    }

    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "marketing_drive")
            .eq("user_id", effectiveUserId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];

        const drives = [];
        for (const row of data) {
            const d = row.report_data || {};
            d.id = row.id;
            d.user_id = row.user_id;
            d.created_at = d.created_at || row.created_at;
            const apps = await getDriveApplications(d.id);
            d.applications = apps;
            d.applications_count = apps.length;
            drives.push(d);
        }
        return drives;
    } catch (err) {
        console.error("Error getUserDrives fallback:", err);
        return [];
    }
}

export async function deleteDrive(driveId: string) {
    if (!isValidUuid(driveId)) return false;
    const sb = getAdminSupabase();

    try {
        await sb.from("marketing_drives").delete().eq("id", driveId);
    } catch {
        // fallback
    }

    try {
        await sb.from("reports").delete().eq("id", driveId);
        // Delete child applications
        const apps = await getDriveApplications(driveId);
        for (const app of apps) {
            if (app.id) {
                await sb.from("reports").delete().eq("id", app.id);
            }
        }
        return true;
    } catch {
        return false;
    }
}

export async function applyToDrive(driveId: string, data: any, userId?: string) {
    const sb = getAdminSupabase();
    const effectiveUserId = isValidUuid(userId) ? userId! : "00000000-0000-0000-0000-000000000001";
    const appId = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const applicationRecord = {
        ...data,
        id: appId,
        drive_id: driveId,
        user_id: effectiveUserId,
        status: "pending",
        created_at: now,
    };

    try {
        const { data: res, error } = await sb.from("drive_applications").insert(applicationRecord).select().single();
        if (!error && res) return res;
    } catch {
        // fallback
    }

    try {
        await sb.from("reports").insert({
            id: appId,
            user_id: effectiveUserId,
            name: "drive_application",
            report_data: applicationRecord,
        });
        return applicationRecord;
    } catch (err) {
        console.error("Error applying to drive fallback:", err);
        return applicationRecord;
    }
}

export async function getDriveApplications(driveId: string) {
    if (!isValidUuid(driveId)) return [];
    const sb = getAdminSupabase();

    try {
        const { data, error } = await sb
            .from("drive_applications")
            .select("*")
            .eq("drive_id", driveId)
            .order("created_at", { ascending: false });
        if (!error && data) return data;
    } catch {
        // fallback
    }

    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "drive_application")
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        return data
            .map((r: any) => {
                const a = r.report_data || {};
                a.id = a.id || r.id;
                a.user_id = a.user_id || r.user_id;
                return a;
            })
            .filter((a: any) => String(a.drive_id) === String(driveId));
    } catch {
        return [];
    }
}

export async function getUserApplications(userId: string) {
    const sb = getAdminSupabase();
    const effectiveUserId = isValidUuid(userId) ? userId : "00000000-0000-0000-0000-000000000001";

    try {
        const { data, error } = await sb
            .from("drive_applications")
            .select("*, marketing_drives(*)")
            .eq("user_id", effectiveUserId)
            .order("created_at", { ascending: false });
        if (!error && data) return data;
    } catch {
        // fallback
    }

    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "drive_application")
            .eq("user_id", effectiveUserId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];
        const apps = [];
        for (const row of data) {
            const a = row.report_data || {};
            a.id = a.id || row.id;
            a.user_id = a.user_id || row.user_id;
            if (a.drive_id) {
                const parentDrive = await getDrive(a.drive_id);
                if (parentDrive) {
                    a.marketing_drives = parentDrive;
                }
            }
            apps.push(a);
        }
        return apps;
    } catch {
        return [];
    }
}

export async function updateApplicationStatus(applicationId: string, status: string) {
    const sb = getAdminSupabase();

    try {
        const { data, error } = await sb
            .from("drive_applications")
            .update({ status })
            .eq("id", applicationId)
            .select()
            .single();
        if (!error && data) return data;
    } catch {
        // fallback
    }

    try {
        const { data, error } = await sb
            .from("reports")
            .select("*")
            .eq("name", "drive_application")
            .eq("id", applicationId)
            .maybeSingle();

        if (!error && data) {
            const appData = data.report_data || {};
            appData.status = status;
            appData.id = applicationId;
            await sb.from("reports").update({ report_data: appData }).eq("id", applicationId);
            return appData;
        }
    } catch (err) {
        console.error("Error updating application status in fallback:", err);
    }
    return { id: applicationId, status };
}
