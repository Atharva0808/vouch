/**
 * API Client — connects Next.js frontend to FastAPI backend
 * All real data flows through these functions
 */

import { createClient } from "./supabase-browser";

function getBackendUrl(): string {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || "https://vouch-crvu.onrender.com";
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

const BACKEND_URL = getBackendUrl();

function getDeviceGuestUuid(): string {
    if (typeof window === "undefined") {
        return "00000000-0000-0000-0000-000000000001";
    }
    try {
        let guestId = localStorage.getItem("vouch_device_guest_uuid");
        if (!guestId || guestId === "00000000-0000-0000-0000-000000000001") {
            guestId = (typeof crypto !== "undefined" && crypto.randomUUID)
                ? crypto.randomUUID()
                : "00000000-0000-4000-8000-" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
            localStorage.setItem("vouch_device_guest_uuid", guestId);
        }
        return guestId;
    } catch {
        return "00000000-0000-0000-0000-000000000001";
    }
}

export async function getEffectiveUserId(): Promise<string> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id) {
            if (typeof window !== "undefined") {
                localStorage.setItem("vouch_active_user_id", user.id);
            }
            return user.id;
        }
    } catch {
        // Fall through to stored/guest UUID
    }

    if (typeof window !== "undefined") {
        const active = localStorage.getItem("vouch_active_user_id");
        if (active && active !== "00000000-0000-0000-0000-000000000001") {
            return active;
        }
    }

    return getDeviceGuestUuid();
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const userId = await getEffectiveUserId();

    const headers = {
        "Content-Type": "application/json",
        "X-User-Id": userId,
        ...options.headers,
    };

    // 1. Try primary backend
    try {
        const res = await fetch(`${BACKEND_URL}${path}`, {
            headers,
            ...options,
        });

        if (res.ok) {
            return res.json();
        }

        // If backend returned 500/502/503/404 and we are in browser, try local Next.js API route
        if (typeof window !== "undefined" && (res.status >= 500 || res.status === 404)) {
            try {
                const localRes = await fetch(path, { headers, ...options });
                if (localRes.ok) {
                    return localRes.json();
                }
            } catch {
                // Ignore fallback error and continue to report backend error
            }
        }

        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API error: ${res.status}`);
    } catch (err: any) {
        // 2. If network failed (e.g. "Failed to fetch" when Render is asleep or cold), try local Next.js API
        if (typeof window !== "undefined") {
            try {
                const localRes = await fetch(path, { headers, ...options });
                if (localRes.ok) {
                    return localRes.json();
                }
                const error = await localRes.json().catch(() => ({ detail: localRes.statusText }));
                throw new Error(error.detail || `API error: ${localRes.status}`);
            } catch (fallbackErr: any) {
                throw new Error(fallbackErr?.message || err?.message || "Failed to fetch");
            }
        }
        throw err;
    }
}

// ======== Influencer APIs ========

export interface InfluencerProfile {
    id: string;
    name: string;
    handle: string;
    platform: string;
    avatar_url: string;
    followers: number;
    following: number;
    posts: number;
    engagement_rate: number;
    avg_likes: number;
    avg_comments: number;
    niche: string[];
    location: string;
    verified: boolean;
    match_score: number;
    risk_level: string;
    predicted_roi: number;
    bot_percentage: number;
    trending: string;
    trend_percent: number;
    bio: string;
    recommendation?: string;
    created_at?: string;
    updated_at?: string;
}

export interface EngagementData {
    date: string;
    followers: number;
    likes: number;
    comments: number;
    shares: number;
    organic: boolean;
}

export interface SentimentData {
    positive: number;
    negative: number;
    neutral: number;
    themes: { label: string; count: number; sentiment: string }[];
    raw_comments_analyzed: number;
    red_flags?: string[];
    brand_safety_score?: number;
}

export interface RiskFlag {
    type: string;
    severity: string;
    description: string;
    detected_at: string;
    source?: string;   // "verified_metric" or "ai_inference"
    evidence?: string;  // the specific data point the flag is based on
}

/** Fetch a REAL influencer from social media and run full AI analysis */
export async function fetchInfluencer(handle: string, platform: string) {
    return apiFetch<{
        profile: InfluencerProfile;
        engagement: EngagementData[];
        sentiment: SentimentData;
        risk: { overall_risk: string; bot_percentage: number; flags: RiskFlag[] };
        fake_engagement: { bot_percentage: number; fake_engagement_detected: boolean; spike_dates: string[] };
        roi: { predicted_roi: number; estimated_reach: number; single_post_value: number; campaign_value: number };
        match: { match_score: number; recommendation: string; strengths: string[]; weaknesses: string[] };
    }>("/api/influencers/fetch", {
        method: "POST",
        body: JSON.stringify({ handle, platform }),
    });
}

/** Search influencers from the database */
export async function searchInfluencers(params: {
    query?: string;
    platform?: string;
    niche?: string;
    min_followers?: number;
    max_followers?: number;
    min_engagement?: number;
    risk_level?: string;
    location?: string;
}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") searchParams.set(k, String(v));
    });
    return apiFetch<{ results: InfluencerProfile[]; count: number }>(
        `/api/influencers/search?${searchParams.toString()}`
    );
}

/** Get all influencers */
export async function getAllInfluencers(limit = 50, offset = 0) {
    return apiFetch<{ results: InfluencerProfile[]; count: number }>(
        `/api/influencers/all?limit=${limit}&offset=${offset}`
    );
}

/** Delete a single influencer */
export async function deleteInfluencer(id: string) {
    return apiFetch<{ deleted: boolean; message: string }>(`/api/influencers/${id}`, {
        method: "DELETE",
    });
}

/** Clear ALL influencers from database */
export async function clearAllInfluencers() {
    return apiFetch<{ deleted: number; message: string }>("/api/influencers/clear-all", {
        method: "DELETE",
    });
}

/** Get full influencer detail */
export async function getInfluencer(id: string) {
    return apiFetch<{
        profile: InfluencerProfile;
        engagement: EngagementData[];
        sentiment: SentimentData | null;
        risk_flags: RiskFlag[];
    }>(`/api/influencers/${id}`);
}

/** Get engagement data */
export async function getEngagement(id: string) {
    return apiFetch<{ data: EngagementData[] }>(`/api/influencers/${id}/engagement`);
}

/** Get sentiment analysis */
export async function getSentiment(id: string) {
    return apiFetch<{ data: SentimentData }>(`/api/influencers/${id}/sentiment`);
}

/** Get risk flags */
export async function getRiskFlags(id: string) {
    return apiFetch<{ data: RiskFlag[] }>(`/api/influencers/${id}/risks`);
}

/** Re-run AI analysis */
export async function reanalyzeInfluencer(id: string) {
    return apiFetch(`/api/influencers/${id}/reanalyze`, { method: "POST" });
}

/** Download influencer profile as PDF */
export async function downloadInfluencerPdf(id: string) {
    const userId = await getEffectiveUserId();

    const res = await fetch(`${BACKEND_URL}/api/influencers/${id}/download`, {
        headers: { "X-User-Id": userId }
    });
    if (!res.ok) throw new Error("Failed to download PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^";\n]+)"?/);
    a.download = match ? match[1] : "influencer_profile.pdf";
    a.click();
    URL.revokeObjectURL(url);
}

/** Compare two influencers */
export async function compareInfluencers(idA: string, idB: string) {
    return apiFetch<{
        influencer_a: InfluencerProfile;
        influencer_b: InfluencerProfile;
        metrics: { label: string; value_a: string; value_b: string; winner: string | null }[];
        recommendation: string;
    }>("/api/influencers/compare", {
        method: "POST",
        body: JSON.stringify({ influencer_a_id: idA, influencer_b_id: idB }),
    });
}

// ======== AI APIs ========

/** Generate AI marketing brief */
export async function generateBrief(params: {
    influencer_id: string;
    brand_name: string;
    campaign_objective: string;
    brand_niche?: string;
    budget?: number;
    location?: string;
    deliverables?: string[];
    target_audience?: string[];
}) {
    return apiFetch<{
        brief: string;
        influencer_name: string;
        match_score: number;
        match_recommendation: string;
        match_reasoning: string;
        generated_at: string;
        report_id?: string;
    }>("/api/ai/brief", {
        method: "POST",
        body: JSON.stringify(params),
    });
}

/** Predict ROI */
export async function predictROI(influencerId: string, budget = 0) {
    return apiFetch<{
        predicted_roi: number;
        estimated_reach: number;
        estimated_impressions: number;
        estimated_engagement: number;
        cost_per_engagement: number;
        single_post_value: number;
        campaign_value: number;
        confidence: number;
    }>(`/api/ai/roi/${influencerId}?budget=${budget}`, { method: "POST" });
}

/** Get live AI-predicted analytics */
export async function getLiveAnalytics(influencerId: string) {
    return apiFetch<{
        growth_forecast: { month: string; followers: number; engagement: number; reach: number }[];
        audience_demographics: { age: string; percent: number }[];
        campaign_prediction: {
            estimatedReach: number;
            estimatedImpressions: number;
            estimatedClicks: number;
            estimatedConversions: number;
            costPerPost: number;
            cpe: number;
            roi: number;
            engagementValue: number;
        };
        weekly_performance: { day: string; predictedLikes: number; predictedComments: number; predictedReach: number }[];
    }>(`/api/ai/predict-analytics/${influencerId}`, { method: "POST" });
}

/** Analyze comments sentiment */
export async function analyzeComments(influencerId: string) {
    return apiFetch<SentimentData>(`/api/ai/analyze-comments?influencer_id=${influencerId}`, {
        method: "POST",
    });
}

/** Get market rates */
export async function getMarketRates(influencerId: string) {
    return apiFetch<{
        suggested_price: number;
        range_low: number;
        range_high: number;
        cpm: number;
        platform_benchmark: string;
        confidence: string;
    }>(`/api/ai/market-rates/${influencerId}`);
}

/** Generate outreach hook */
export async function generateOutreachHook(influencerId: string, brandName = "Our Brand") {
    return apiFetch<{
        subject_lines: string[];
        message_hook: string;
        personalization_point: string;
    }>(`/api/ai/outreach-hook/${influencerId}?brand_name=${encodeURIComponent(brandName)}`, {
        method: "POST",
    });
}

/** Run deep content audit */
export async function runContentAudit(influencerId: string) {
    return apiFetch<{
        risk_score: number;
        risk_level: string;
        detected_flags: { category: string; details: string; severity: string }[];
        summary: string;
        safe_for_brands: boolean;
    }>(`/api/ai/content-audit/${influencerId}`, {
        method: "POST",
    });
}

// ======== Payment APIs ========

/** Create Stripe checkout session */
export async function createCheckout(priceId: string, userId: string, userEmail: string) {
    return apiFetch<{ checkout_url: string }>(
        `/api/payments/checkout?price_id=${priceId}&user_id=${userId}&user_email=${userEmail}`,
        { method: "POST" }
    );
}

/** Create Stripe customer portal */
export async function createPortal(customerId: string) {
    return apiFetch<{ portal_url: string }>(
        `/api/payments/portal?customer_id=${customerId}`,
        { method: "POST" }
    );
}

/** Get pricing plans */
export async function getPlans() {
    return apiFetch<{
        plans: {
            name: string;
            price: number;
            features: string[];
            limitations: string[];
            cta: string;
            popular: boolean;
        }[];
    }>("/api/payments/plans");
}

// ======== Helper ========

export function formatNumber(n: number): string {
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
    return new Intl.NumberFormat('en-IN').format(n);
}

// ======== Reports ========

export interface Report {
    id: string;
    user_id: string;
    influencer_id: string;
    name: string;
    report_data: any;
    created_at: string;
}

/** Get all reports */
export async function getReports() {
    return apiFetch<{ reports: Report[] }>("/api/ai/reports");
}

/** Get single report */
export async function getReport(id: string) {
    return apiFetch<Report>(`/api/ai/reports/${id}`);
}

/** Generate a new report */
export async function generateReport(influencerId: string, reportType: string = "full_analysis") {
    return apiFetch<any>(`/api/ai/generate-report?influencer_id=${influencerId}&report_type=${reportType}`, {
        method: "POST",
    });
}

/** Download a single report as PDF */
export async function downloadReportPdf(reportId: string): Promise<void> {
    const userId = await getEffectiveUserId();

    const res = await fetch(`${BACKEND_URL}/api/ai/reports/${reportId}/download`, {
        headers: { "X-User-Id": userId }
    });
    if (!res.ok) throw new Error("Failed to download report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^";\n]+)"?/);
    a.download = match ? match[1] : "report.pdf";
    a.click();
    URL.revokeObjectURL(url);
}

/** Download multiple reports as one PDF */
export async function downloadCombinedReportsPdf(reportIds: string[]): Promise<void> {
    const userId = await getEffectiveUserId();

    const res = await fetch(`${BACKEND_URL}/api/ai/reports/download-combined`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-User-Id": userId 
        },
        body: JSON.stringify({ report_ids: reportIds }),
    });
    if (!res.ok) throw new Error("Failed to download combined report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^";\n]+)"?/);
    a.download = match ? match[1] : "reports_combined.pdf";
    a.click();
    URL.revokeObjectURL(url);
}

/** Delete a report */
export async function deleteReport(reportId: string) {
    return apiFetch<{ deleted: boolean; id: string }>(`/api/ai/reports/${reportId}`, {
        method: "DELETE",
    });
}

// ======== Activity / Notifications ========

export interface Activity {
    id: string;
    action: string;
    details: string;
    icon: string;  // 'user-plus', 'alert', 'report', 'trash', 'refresh', 'shield', 'bell'
    created_at: string;
}

/** Get recent activity feed / notifications */
export async function getActivityFeed(limit = 20) {
    return apiFetch<{ activities: Activity[] }>(`/api/ai/activity?limit=${limit}`);
}

// ======== User Profile / Settings & Onboarding ========

export type AccountType = "brand" | "influencer" | "creator";

export interface BrandOnboardingData {
    account_type: "brand";
    business_name: string;
    category: string;
    location_area: string;
    city: string;
    target_age: string[];
    interests: string[];
    collaboration_type: "barter" | "paid" | "both";
    deliverables: string[];
    budget_range?: string;
}

export interface InfluencerOnboardingData {
    account_type: "influencer";
    social_handle: string;
    primary_platform: string;
    profile_url?: string;
    location_area: string;
    city: string;
    category: string; // core niche
    collaboration_type: "barter" | "paid" | "both";
    deliverables: string[];
    rates_range?: string;
    bio?: string;
    followers?: number;
    engagement_rate?: number;
    avatar_url?: string;
}

export interface UserProfile {
    id: string;
    email?: string;
    full_name?: string;
    company?: string;
    role?: string;
    account_type?: AccountType;
    onboarding_completed?: boolean;
    onboarding_data?: BrandOnboardingData | InfluencerOnboardingData | any;
    business_name?: string;
    category?: string;
    location_area?: string;
    city?: string;
    target_age?: string[];
    interests?: string[];
    collaboration_type?: string;
    deliverables?: string[];
    social_handle?: string;
    primary_platform?: string;
    budget_range?: string;
    notifications?: any;
    tier?: string;
    searches_used?: number;
    searches_limit?: number;
}

/** Get user profile from backend */
export async function getUserProfile(userId: string) {
    return apiFetch<UserProfile>(`/api/users/${userId}`);
}

/** Update user profile */
export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
    return apiFetch<UserProfile>(`/api/users/${userId}`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/** Submit completed onboarding questionnaire */
export async function submitOnboarding(userId: string, data: Partial<UserProfile>) {
    return apiFetch<UserProfile>(`/api/users/${userId}/onboarding`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ======== All Risk Flags ========

/** Get all risk flags across all influencers */
export async function getAllRiskFlags() {
    return apiFetch<RiskFlag[]>("/api/influencers/risks/all");
}

/** Delete a single risk flag */
export async function deleteRiskFlag(flagId: string) {
    return apiFetch<{ deleted: boolean; id: string }>(`/api/influencers/risks/${flagId}`, {
        method: "DELETE",
    });
}


// ======== Marketing Drives APIs ========

export interface MarketingDrive {
    id: string;
    user_id: string;
    brand_name: string;
    title: string;
    description: string;
    category: string;
    location_area: string;
    city: string;
    platform_preference: string;
    target_audience: string[];
    min_followers: number;
    min_engagement_rate: number;
    niche_required: string[];
    deliverables: string;
    compensation: string;
    budget: number;
    collab_type: string;
    status: string;
    deadline: string;
    max_applications: number;
    applications_count?: number;
    applications?: DriveApplication[];
    created_at: string;
    updated_at: string;
}

export interface DriveApplication {
    id: string;
    drive_id: string;
    user_id: string;
    creator_name: string;
    creator_handle: string;
    creator_platform: string;
    creator_followers: number;
    creator_engagement_rate: number;
    creator_location: string;
    pitch: string;
    status: string;
    created_at: string;
    marketing_drives?: MarketingDrive;
}

/** Create a new marketing drive (brand posts a campaign) */
export async function createDrive(data: {
    brand_name: string;
    title: string;
    description?: string;
    category?: string;
    location_area?: string;
    city?: string;
    platform_preference?: string;
    target_audience?: string[];
    min_followers?: number;
    min_engagement_rate?: number;
    niche_required?: string[];
    deliverables?: string;
    compensation?: string;
    budget?: number;
    collab_type?: string;
    deadline?: string;
    max_applications?: number;
}) {
    return apiFetch<{ drive: MarketingDrive; message: string }>("/api/drives", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/** Browse all active drives */
export async function getDrives(params?: {
    city?: string;
    category?: string;
    status?: string;
}) {
    const searchParams = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") searchParams.set(k, String(v));
        });
    }
    const qs = searchParams.toString();
    return apiFetch<{ drives: MarketingDrive[]; count: number }>(
        `/api/drives${qs ? `?${qs}` : ""}`
    );
}

/** Get drives posted by current user */
export async function getMyDrives() {
    return apiFetch<{ drives: MarketingDrive[]; count: number }>("/api/drives/my-drives");
}

/** Get applications by current user */
export async function getMyApplications() {
    return apiFetch<{ applications: DriveApplication[]; count: number }>("/api/drives/my-applications");
}

/** Get a single drive with applications */
export async function getDrive(driveId: string) {
    return apiFetch<MarketingDrive>(`/api/drives/${driveId}`);
}

/** Apply to a drive as a creator */
export async function applyToDrive(driveId: string, data: {
    creator_name?: string;
    creator_handle?: string;
    creator_platform?: string;
    creator_followers?: number;
    creator_engagement_rate?: number;
    creator_location?: string;
    pitch?: string;
}) {
    return apiFetch<{ application: DriveApplication; message: string }>(`/api/drives/${driveId}/apply`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/** Delete a drive */
export async function deleteDrive(driveId: string) {
    return apiFetch<{ deleted: boolean; message: string }>(`/api/drives/${driveId}`, {
        method: "DELETE",
    });
}

/** Update application status (brand accepts/rejects) */
export async function updateApplicationStatus(applicationId: string, status: string) {
    return apiFetch<{ application: DriveApplication; message: string }>(
        `/api/drives/applications/${applicationId}/status?status=${status}`,
        { method: "PATCH" }
    );
}
