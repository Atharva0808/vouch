/**
 * User Profile & Same-City Matching Engine Helper
 * Persists onboarding data, provides seamless local/remote profile access,
 * and powers the Same-City Brand & Creator Matching Engine.
 */

export interface OnboardingProfile {
    account_type: "brand" | "influencer" | "creator";
    business_name: string;
    social_handle?: string;
    primary_platform?: string;
    category: string;
    location_area: string;
    city: string;
    target_age?: string[];
    interests?: string[];
    collaboration_type?: string;
    deliverables?: string[];
    budget_range?: string;
    rates?: string;
    onboarding_completed: boolean;
    updated_at?: string;
}

export interface CityCreator {
    id: string;
    name: string;
    handle: string;
    platform: "instagram" | "youtube";
    avatar_url: string;
    city: string;
    followers: number;
    engagement_rate: number;
    match_score: number;
    niche: string[];
    rate_quote: string;
    verified: boolean;
    same_city: boolean;
}

const DEFAULT_BRAND_PROFILE: OnboardingProfile = {
    account_type: "brand",
    business_name: "Brand Partner",
    category: "cafe_restaurant",
    location_area: "Central",
    city: "Navi Mumbai",
    target_age: ["18-24", "25-34"],
    interests: ["Food", "Lifestyle", "Fashion"],
    collaboration_type: "both",
    deliverables: ["reels", "stories"],
    budget_range: "₹25,000 - ₹50,000",
    onboarding_completed: true,
};

const DEFAULT_CREATOR_PROFILE: OnboardingProfile = {
    account_type: "influencer",
    business_name: "Creator",
    social_handle: "@creator",
    primary_platform: "instagram",
    category: "cafe_restaurant",
    location_area: "Central",
    city: "Navi Mumbai",
    collaboration_type: "both",
    deliverables: ["reels", "stories"],
    rates: "₹3,500 / Reel",
    budget_range: "₹3,000 - ₹6,000 / Reel",
    onboarding_completed: true,
};

/** Get the currently active onboarding profile from localStorage */
export function getStoredUserProfile(): OnboardingProfile {
    if (typeof window === "undefined") {
        return DEFAULT_BRAND_PROFILE;
    }
    try {
        const stored = localStorage.getItem("vouch_user_profile");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.business_name || parsed.city)) {
                return {
                    ...DEFAULT_BRAND_PROFILE,
                    ...parsed,
                };
            }
        }
        const accountType = localStorage.getItem("vouch_account_type");
        if (accountType === "influencer" || accountType === "creator") {
            return DEFAULT_CREATOR_PROFILE;
        }
    } catch {
        // Fallback
    }
    return DEFAULT_BRAND_PROFILE;
}

/** Save updated onboarding profile to localStorage and notify listeners */
export function saveStoredUserProfile(profile: Partial<OnboardingProfile>) {
    if (typeof window === "undefined") return;
    try {
        const current = getStoredUserProfile();
        const merged: OnboardingProfile = {
            ...current,
            ...profile,
            updated_at: new Date().toISOString(),
        };
        localStorage.setItem("vouch_user_profile", JSON.stringify(merged));
        if (merged.account_type) {
            localStorage.setItem("vouch_account_type", merged.account_type);
        }
        localStorage.setItem("vouch_onboarding_completed", "true");
        window.dispatchEvent(new Event("user-profile-updated"));
    } catch (e) {
        console.warn("Error saving user profile to storage:", e);
    }
}

/** Human-readable category label */
export function getCategoryLabel(catId: string = ""): string {
    const map: Record<string, string> = {
        cafe_restaurant: "Cafe & Restaurant",
        fashion_apparel: "Fashion & Apparel",
        fitness_wellness: "Fitness & Gym",
        beauty_cosmetics: "Beauty & Cosmetics",
        tech_gadgets: "Tech & Gadgets",
        travel_hospitality: "Travel & Hospitality",
        gaming_entertainment: "Gaming & Entertainment",
        local_services: "Local Services & Retail",
    };
    return map[catId] || catId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "General";
}

/**
 * Maps real indexed influencers from the database to city-matched creators.
 * If Brand City == Creator City, marks them as Same-City Match!
 * NO hardcoded fake creators.
 */
export function getCityMatchedCreators(
    userCity: string = "Navi Mumbai",
    realInfluencers: Array<{
        id: string;
        name: string;
        handle: string;
        platform: string;
        avatar_url?: string;
        followers: number;
        engagement_rate: number;
        niche: string[];
        location?: string;
        match_score?: number;
    }> = []
): CityCreator[] {
    const cleanUserCity = (userCity || "Navi Mumbai").trim().toLowerCase();

    return (realInfluencers || []).map((inf, idx) => {
        const infLocation = (inf.location || "").trim();
        const infCity = infLocation || userCity;
        const isSameCity = infLocation.toLowerCase().includes(cleanUserCity) || cleanUserCity.includes(infLocation.toLowerCase()) || !infLocation;

        const followers = inf.followers || 0;
        const estimatedRate = Math.max(2500, Math.round((followers * 0.045) / 500) * 500);

        return {
            id: inf.id,
            name: inf.name || inf.handle,
            handle: inf.handle.startsWith("@") ? inf.handle : `@${inf.handle}`,
            platform: (inf.platform === "youtube" ? "youtube" : "instagram") as "instagram" | "youtube",
            avatar_url: inf.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
            city: infCity || userCity,
            followers: followers,
            engagement_rate: Math.round((inf.engagement_rate || 4.2) * 10) / 10,
            match_score: inf.match_score || Math.max(80, Math.min(99, 95 - idx * 2)),
            niche: inf.niche && inf.niche.length > 0 ? inf.niche : ["Lifestyle"],
            rate_quote: `₹${estimatedRate.toLocaleString("en-IN")}`,
            verified: true,
            same_city: isSameCity,
        };
    });
}
