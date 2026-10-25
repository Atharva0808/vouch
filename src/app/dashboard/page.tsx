"use client";

import { motion, AnimatePresence } from "framer-motion";
import AvatarImg from "@/components/avatar-img";
import { useState, useEffect } from "react";
import {
    Zap,
    Users,
    TrendingUp,
    Shield,
    Search,
    BarChart3,
    Loader,
    MapPin,
    Sparkles,
    CheckCircle,
    Store,
    Calendar,
    ArrowRight,
    Send,
    FileText,
    Compass,
    SlidersHorizontal,
    Star,
    X,
} from "lucide-react";
import Link from "next/link";
import { getAllInfluencers, formatNumber, type InfluencerProfile } from "@/lib/api-client";
import {
    getStoredUserProfile,
    getHyperLocalCreators,
    getLocalBrandOpportunities,
    getCategoryLabel,
    type OnboardingProfile,
    type HyperLocalCreator,
    type LocalBrandOpportunity,
} from "@/lib/user-profile";

export default function DashboardPage() {
    const [profile, setProfile] = useState<OnboardingProfile>(getStoredUserProfile());
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, avgEngagement: 0, lowRisk: 0, localMatches: 5 });

    // Hyper-local engine state
    const [hyperLocalCreators, setHyperLocalCreators] = useState<HyperLocalCreator[]>([]);
    const [brandOpportunities, setBrandOpportunities] = useState<LocalBrandOpportunity[]>([]);
    const [radiusKm, setRadiusKm] = useState(15);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

    // Invite Modal State
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [selectedCreatorForInvite, setSelectedCreatorForInvite] = useState<HyperLocalCreator | null>(null);
    const [inviteSent, setInviteSent] = useState(false);
    const [inviteDeliverable, setInviteDeliverable] = useState("Store Visit & Tasting Reel");

    // Accepted Opportunities state (for creators)
    const [acceptedOpportunities, setAcceptedOpportunities] = useState<string[]>([]);

    useEffect(() => {
        loadData();

        const handleProfileUpdate = () => {
            const updated = getStoredUserProfile();
            setProfile(updated);
            refreshHyperLocal(updated);
        };
        window.addEventListener("user-profile-updated", handleProfileUpdate);
        return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
    }, []);

    const refreshHyperLocal = (currentProfile: OnboardingProfile) => {
        const area = currentProfile.location_area || "Seawoods";
        const city = currentProfile.city || "Navi Mumbai";
        const cat = currentProfile.category || "cafe_restaurant";

        const creators = getHyperLocalCreators(area, city, cat);
        setHyperLocalCreators(creators);

        const opps = getLocalBrandOpportunities(area, city);
        setBrandOpportunities(opps);
    };

    const loadData = async () => {
        const currentProfile = getStoredUserProfile();
        setProfile(currentProfile);
        refreshHyperLocal(currentProfile);

        try {
            const data = await getAllInfluencers(10);
            setInfluencers(data.results || []);

            const total = data.count || 0;
            const avgEng =
                data.results.length > 0
                    ? data.results.reduce((a, b) => a + (b.engagement_rate || 0), 0) / data.results.length
                    : 4.8;
            const lowRiskCount = data.results.filter((i) => i.risk_level === "low").length;

            setStats({
                total,
                avgEngagement: Math.round(avgEng * 10) / 10,
                lowRisk: lowRiskCount || 4,
                localMatches: 5,
            });
        } catch {
            // Keep default state
        }
        setLoading(false);
    };

    const handleOpenInvite = (creator: HyperLocalCreator) => {
        setSelectedCreatorForInvite(creator);
        setInviteSent(false);
        setInviteModalOpen(true);
    };

    const handleSendInvite = () => {
        setInviteSent(true);
        setTimeout(() => {
            setInviteModalOpen(false);
            setInviteSent(false);
        }, 2200);
    };

    const handleAcceptOpportunity = (oppId: string) => {
        setAcceptedOpportunities((prev) => [...prev, oppId]);
    };

    const isBrand = profile.account_type === "brand" || !profile.account_type;
    const locationDisplay = profile.location_area
        ? `${profile.location_area}, ${profile.city || "Navi Mumbai"}`
        : profile.city || "Navi Mumbai";

    const statCards = [
        { label: "Audited Influencers", value: stats.total || "12+", icon: Users, color: "bg-[var(--color-neo-pink)]" },
        { label: "Avg Engagement", value: `${stats.avgEngagement}%`, icon: TrendingUp, color: "bg-[var(--color-neo-blue)]" },
        { label: "Nearby Creators (<15km)", value: `${hyperLocalCreators.length} Available`, icon: MapPin, color: "bg-[var(--color-neo-yellow)]" },
        { label: "Local Footfall Quality", value: "94% Authentic", icon: Shield, color: "bg-[var(--color-neo-green)]" },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Dynamic Personalized Onboarding Welcome Banner */}
            <motion.div
                initial={{ y: -30, opacity: 0, rotate: -0.5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="neo-card rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[var(--color-neo-pink)]/90 via-[var(--color-neo-purple)]/90 to-[var(--color-neo-yellow)]/90 text-neo-black relative overflow-hidden"
            >
                <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full neo-border bg-neo-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                <Zap size={14} className="text-[var(--color-neo-pink)]" />
                                {isBrand ? "🏢 Brand Campaign Engine" : "🌟 Creator Collab Hub"}
                            </span>
                            <span className="px-3 py-1 rounded-full neo-border bg-[var(--color-neo-yellow)] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <MapPin size={13} className="text-neo-black" />
                                {locationDisplay}
                            </span>
                        </div>

                        <Link href="/onboarding">
                            <span className="text-[11px] font-bold text-neo-black/70 hover:text-neo-black underline cursor-pointer">
                                Retake Questionnaire
                            </span>
                        </Link>
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">
                            {isBrand
                                ? `Welcome, ${profile.business_name || "Partner"}`
                                : `Welcome, ${profile.social_handle || profile.business_name || "Creator"}`}
                        </h1>
                        <p className="text-neo-black/85 text-xs sm:text-sm font-semibold max-w-2xl mt-1 leading-relaxed">
                            {isBrand
                                ? `Hyper-Local Match Engine active: prioritizing creators with high audience density within ${radiusKm} km of ${profile.location_area || profile.city} for store visits & local footfall.`
                                : `Local Store Invites active: matched with cafes, fashion boutiques, gyms and local brands near ${profile.location_area || profile.city} looking for creators.`}
                        </p>
                    </div>

                    {/* Active Onboarding Strategy Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="px-3 py-1 rounded-xl bg-neo-white/90 neo-border font-bold">
                            Category: <span className="text-neo-black font-black">{getCategoryLabel(profile.category)}</span>
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-neo-white/90 neo-border font-bold">
                            {isBrand ? "Budget" : "Rate Card"}:{" "}
                            <span className="text-neo-black font-black">{profile.budget_range || profile.rates || "Flexible"}</span>
                        </span>
                        {profile.deliverables && profile.deliverables.length > 0 && (
                            <span className="px-3 py-1 rounded-xl bg-neo-white/90 neo-border font-bold hidden sm:inline-block">
                                Deliverables:{" "}
                                <span className="text-neo-black font-black uppercase text-[10px]">
                                    {profile.deliverables.join(", ")}
                                </span>
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        {isBrand ? (
                            <>
                                <a href="#hyper-local-section">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                                    >
                                        <Sparkles size={16} /> View Local Matches ({hyperLocalCreators.length})
                                    </motion.button>
                                </a>
                                <Link href="/dashboard/brief">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-[var(--color-neo-white)] text-neo-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                                    >
                                        <FileText size={16} /> Auto-Generate Campaign Brief
                                    </motion.button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <a href="#creator-invites-section">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                                    >
                                        <Store size={16} /> View Brand Invites ({brandOpportunities.length})
                                    </motion.button>
                                </a>
                                <Link href="/dashboard/settings">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-[var(--color-neo-white)] text-neo-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                                    >
                                        <SlidersHorizontal size={16} /> Edit Rate Card & Niche
                                    </motion.button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ y: 20, opacity: 0, rotate: i % 2 === 0 ? -0.5 : 0.5 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, type: "spring" }}
                        className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 ${stat.color} rounded-xl neo-border shadow-sm`}>
                                <stat.icon size={20} className="text-[var(--color-neo-black)]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-[var(--color-neo-black)]/50 tracking-wider">
                                    {stat.label}
                                </p>
                                <p className="text-xl sm:text-2xl font-black text-[var(--color-neo-black)] truncate">
                                    {loading ? "—" : stat.value}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* =========================================================================
                BRAND VIEW: ⚡ Hyper-Local Match Engine (Within 15km of Onboarding Area)
               ========================================================================= */}
            {isBrand && (
                <section id="hyper-local-section" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--color-neo-green)] animate-ping" />
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-black flex items-center gap-2">
                                    <Sparkles className="text-[var(--color-neo-yellow)] fill-[var(--color-neo-yellow)]" size={24} />
                                    Hyper-Local Match Engine
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-neo-black/60 font-semibold mt-0.5">
                                Prioritizing creators within <span className="text-neo-black font-black">{radiusKm} km of {locationDisplay}</span> with proven in-person store footfall.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs font-bold text-neo-black/60">Radius:</span>
                            {[10, 15, 25].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRadiusKm(r)}
                                    className={`px-3 py-1 rounded-xl text-xs font-black neo-border transition-all ${
                                        radiusKm === r ? "bg-[var(--color-neo-yellow)] text-neo-black" : "bg-neo-white text-neo-black/70 hover:bg-neo-black/5"
                                    }`}
                                >
                                    {r} km
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {hyperLocalCreators.map((creator) => (
                            <motion.div
                                key={creator.id}
                                whileHover={{ y: -4, scale: 1.01 }}
                                className="neo-card bg-[var(--color-neo-white)] rounded-2xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden"
                            >
                                {/* Top Proximity & Match Badge */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg neo-border bg-[var(--color-neo-yellow)] text-[11px] font-black text-neo-black">
                                        <MapPin size={13} className="text-neo-black" />
                                        <span>{creator.location_area}</span>
                                        <span className="opacity-60">• {creator.distance_km} km</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg neo-border bg-[var(--color-neo-green)] text-[11px] font-black text-neo-black">
                                        {creator.match_score}% Match
                                    </span>
                                </div>

                                {/* Creator Profile Info */}
                                <div className="flex items-center gap-3">
                                    <img
                                        src={creator.avatar_url}
                                        alt={creator.name}
                                        className="w-14 h-14 rounded-2xl neo-border object-cover shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <h3 className="font-black text-base truncate text-neo-black">{creator.name}</h3>
                                        <p className="text-xs font-bold text-neo-black/50">{creator.handle}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-neo-black/70">
                                            <span>{formatNumber(creator.followers)} followers</span>
                                            <span>•</span>
                                            <span className="text-[var(--color-neo-pink)] font-black">{creator.engagement_rate}% ER</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footfall & Deliverable Tags */}
                                <div className="space-y-2 pt-1 border-t-2 border-neo-black/5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neo-black/60 font-bold flex items-center gap-1">
                                            <Store size={13} className="text-neo-black" /> Store Footfall Rating:
                                        </span>
                                        <span className="font-black text-neo-black flex items-center gap-1">
                                            <Star size={12} className="fill-[var(--color-neo-yellow)] text-[var(--color-neo-yellow)]" />
                                            {creator.footfall_rating} / 5.0
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neo-black/60 font-bold">Local City Reach:</span>
                                        <span className="font-black text-emerald-600">{creator.local_reach_pct}% Concentration</span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neo-black/60 font-bold">Rate Quote:</span>
                                        <span className="font-black text-neo-black">{creator.rate_quote}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {creator.collab_types.map((t) => (
                                            <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neo-black/5 text-neo-black/80">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => handleOpenInvite(creator)}
                                        className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                                    >
                                        <Store size={14} /> Invite to Store
                                    </button>

                                    <Link href={`/dashboard/brief?creator=${encodeURIComponent(creator.handle)}&name=${encodeURIComponent(creator.name)}`}>
                                        <button className="neo-btn bg-neo-white text-neo-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 w-full">
                                            <FileText size={14} /> Brief
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* =========================================================================
                CREATOR VIEW: 🏪 Local Store Invites & Brand Opportunities
               ========================================================================= */}
            {!isBrand && (
                <section id="creator-invites-section" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--color-neo-green)] animate-ping" />
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-black flex items-center gap-2">
                                    <Store className="text-[var(--color-neo-pink)]" size={24} />
                                    Nearby Local Store Invites
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-neo-black/60 font-semibold mt-0.5">
                                Cafes, fashion boutiques, gyms & brands near <span className="text-neo-black font-black">{locationDisplay}</span> actively inviting creators for tastings & store visits.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brandOpportunities.map((opp) => {
                            const isAccepted = acceptedOpportunities.includes(opp.id);
                            return (
                                <motion.div
                                    key={opp.id}
                                    whileHover={{ y: -3 }}
                                    className="neo-card bg-[var(--color-neo-white)] rounded-2xl p-5 space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-lg text-neo-black">{opp.brand_name}</h3>
                                                <span className="px-2 py-0.5 rounded-md neo-border bg-[var(--color-neo-yellow)] text-[10px] font-black">
                                                    {opp.category}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-neo-black/60 flex items-center gap-1 mt-0.5">
                                                <MapPin size={12} className="text-neo-pink" />
                                                {opp.location_area}, {opp.city} ({opp.distance_km} km away)
                                            </p>
                                        </div>

                                        <span className="px-2.5 py-1 rounded-lg neo-border bg-[var(--color-neo-green)] text-[10px] font-black uppercase tracking-wider">
                                            {opp.urgency}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-neo-black/5 space-y-1.5 text-xs">
                                        <p className="font-bold text-neo-black">
                                            <span className="text-neo-black/50 uppercase text-[10px] tracking-wider block">Campaign Goal:</span>
                                            {opp.campaign_title}
                                        </p>
                                        <p className="font-medium text-neo-black/80">
                                            <span className="font-bold text-neo-black">Deliverables:</span> {opp.deliverable}
                                        </p>
                                        <p className="font-black text-[var(--color-neo-pink)] text-sm pt-1">
                                            Offer: {opp.compensation}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <span className="text-[11px] font-bold text-neo-black/50">
                                            Store Visit & Food/Product Included
                                        </span>

                                        <button
                                            onClick={() => handleAcceptOpportunity(opp.id)}
                                            disabled={isAccepted}
                                            className={`neo-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                                                isAccepted
                                                    ? "bg-emerald-500 text-white cursor-default"
                                                    : "bg-[var(--color-neo-yellow)] text-neo-black hover:scale-105"
                                            }`}
                                        >
                                            {isAccepted ? (
                                                <>
                                                    <CheckCircle size={14} /> Invite Accepted!
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={14} /> Accept & Connect
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* =========================================================================
                SAVED ONBOARDING STRATEGY PROFILE CARD
               ========================================================================= */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="neo-card bg-[var(--color-neo-white)] rounded-3xl p-6 sm:p-8 space-y-6"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-neo-yellow)] neo-border flex items-center justify-center font-black text-xl shadow-sm">
                            🎯
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neo-black">
                                Your Configured Onboarding Profile
                            </h2>
                            <p className="text-xs text-neo-black/60 font-semibold">
                                Stored parameters used across Vouch AI, campaign generation, and hyper-local matching.
                            </p>
                        </div>
                    </div>

                    <Link href="/onboarding">
                        <button className="neo-btn px-4 py-2 rounded-xl text-xs bg-[var(--color-neo-yellow)] text-neo-black font-black flex items-center gap-1.5">
                            <SlidersHorizontal size={14} /> Update Preferences
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Role</div>
                        <div className="text-xs sm:text-sm font-black text-neo-black mt-1 capitalize">
                            {profile.account_type || "Brand"}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Category</div>
                        <div className="text-xs sm:text-sm font-black text-neo-black mt-1 truncate">
                            {getCategoryLabel(profile.category)}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Area & City</div>
                        <div className="text-xs sm:text-sm font-black text-neo-black mt-1 truncate">
                            {locationDisplay}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Collab Mode</div>
                        <div className="text-xs sm:text-sm font-black text-neo-black mt-1 capitalize truncate">
                            {profile.collaboration_type || "Barter & Paid"}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Budget / Rates</div>
                        <div className="text-xs sm:text-sm font-black text-neo-black mt-1 truncate">
                            {profile.budget_range || profile.rates || "Flexible"}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neo-black/5 neo-border">
                        <div className="text-[10px] font-black uppercase text-neo-black/40">Footfall Engine</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            Active (15km)
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions + Recent Audits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                >
                    <h3 className="text-lg font-black text-neo-black mb-4 uppercase tracking-tight">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Fetch Influencer", href: "/dashboard/search", color: "bg-[var(--color-neo-pink)]" },
                            { label: "Compare Matrix", href: "/dashboard/compare", color: "bg-[var(--color-neo-blue)]" },
                            { label: "Campaign Brief", href: "/dashboard/brief", color: "bg-[var(--color-neo-lavender)]" },
                            { label: "Risk Monitor", href: "/dashboard/risks", color: "bg-[var(--color-neo-yellow)]" },
                            { label: "Audit Reports", href: "/dashboard/reports", color: "bg-[var(--color-neo-green)]" },
                            { label: "Settings & Profile", href: "/dashboard/settings", color: "bg-amber-200" },
                        ].map((action) => (
                            <Link key={action.label} href={action.href}>
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`${action.color} p-4 rounded-xl neo-border text-center cursor-pointer`}
                                >
                                    <p className="text-xs sm:text-sm font-black text-neo-black">{action.label}</p>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Recent Indexed Influencers */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-neo-black uppercase tracking-tight">Recent Audits</h3>
                        <Link href="/dashboard/influencers" className="text-xs font-bold text-neo-black/60 hover:text-neo-black flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader className="animate-spin text-[var(--color-neo-pink)]" />
                        </div>
                    ) : influencers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users size={32} className="mx-auto mb-3 text-neo-black/20" />
                            <p className="text-sm font-bold text-neo-black/50">No verified influencers indexed yet</p>
                            <Link href="/dashboard/search">
                                <button className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black px-4 py-2 rounded-xl text-xs font-bold mt-3">
                                    Fetch First Influencer
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {influencers.slice(0, 5).map((inf) => (
                                <Link key={inf.id} href={`/dashboard/influencer/${inf.id}`}>
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neo-black/5 cursor-pointer transition-colors"
                                    >
                                        <AvatarImg
                                            src={inf.avatar_url}
                                            name={inf.name}
                                            handle={inf.handle}
                                            platform={inf.platform}
                                            size={34}
                                            rounded="rounded-xl"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black truncate text-neo-black">{inf.name}</p>
                                            <p className="text-[11px] font-semibold text-neo-black/50 truncate">
                                                {inf.handle} • {inf.platform}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-black text-neo-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--color-neo-green)] neo-border">
                                            Audit Done
                                        </span>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* =========================================================================
                INVITE TO STORE MODAL
               ========================================================================= */}
            <AnimatePresence>
                {inviteModalOpen && selectedCreatorForInvite && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="neo-card bg-[var(--color-neo-white)] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-[var(--color-neo-yellow)] neo-border">
                                        <Store size={20} className="text-neo-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-neo-black">Direct Store / Experience Invite</h3>
                                        <p className="text-xs text-neo-black/50 font-bold">
                                            Invite {selectedCreatorForInvite.name} ({selectedCreatorForInvite.handle})
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setInviteModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neo-black/10">
                                    <X size={18} />
                                </button>
                            </div>

                            {inviteSent ? (
                                <div className="text-center py-6 space-y-3">
                                    <CheckCircle size={48} className="mx-auto text-emerald-500 animate-bounce" />
                                    <h4 className="font-black text-lg text-neo-black">Invitation Dispatched!</h4>
                                    <p className="text-xs text-neo-black/60 max-w-xs mx-auto">
                                        Your store tasting & footfall campaign invite has been sent to {selectedCreatorForInvite.handle}. You will receive confirmation via notifications.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 rounded-2xl bg-neo-black/5 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Store / Business:</span>
                                            <span className="font-black text-neo-black">{profile.business_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Location:</span>
                                            <span className="font-black text-neo-black">{locationDisplay}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Creator Distance:</span>
                                            <span className="font-black text-emerald-600">{selectedCreatorForInvite.distance_km} km away</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Standard Rate:</span>
                                            <span className="font-black text-neo-black">{selectedCreatorForInvite.rate_quote}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-neo-black/70">Select Campaign Format</label>
                                        <select
                                            value={inviteDeliverable}
                                            onChange={(e) => setInviteDeliverable(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-xs font-bold bg-neo-white"
                                        >
                                            <option value="Store Visit & Tasting Reel">Store Visit & Tasting Reel + 2 Stories</option>
                                            <option value="In-Store Product Try-On Haul">In-Store Product Try-On Haul (Fashion / Retail)</option>
                                            <option value="Grand Opening Event Coverage">Grand Opening Event Coverage</option>
                                            <option value="Dedicated Experience Review">Dedicated Experience Review (YouTube / Reel)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-neo-black/70">Custom Note / Perk</label>
                                        <textarea
                                            rows={3}
                                            defaultValue={`Hey ${selectedCreatorForInvite.name}, we love your local content in ${locationDisplay}! We'd love to invite you to our venue for an exclusive in-person experience.`}
                                            className="neo-input w-full p-3 rounded-xl text-xs font-medium bg-neo-white"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setInviteModalOpen(false)}
                                            className="neo-btn bg-neo-white text-neo-black flex-1 py-2.5 rounded-xl text-xs font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSendInvite}
                                            className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                                        >
                                            <Send size={14} /> Send Official Invite
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
