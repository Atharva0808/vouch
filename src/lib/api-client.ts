/**
 * API Client — connects Next.js frontend to FastAPI backend
 * All real data flows through these functions
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
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
}) {
    return apiFetch<{
        brief: string;
        influencer_name: string;
        match_score: number;
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
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
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
    const res = await fetch(`${BACKEND_URL}/api/ai/reports/${reportId}/download`);
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
    const res = await fetch(`${BACKEND_URL}/api/ai/reports/download-combined`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

// ======== User Profile / Settings ========

export interface UserProfile {
    id: string;
    email?: string;
    full_name?: string;
    company?: string;
    role?: string;
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
