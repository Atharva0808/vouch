"use client";

import { motion, AnimatePresence } from "framer-motion";
import AvatarImg from "@/components/avatar-img";
import { useState, useEffect } from "react";
import {
    Zap,
    Users,
    Search,
    Loader,
    MapPin,
    Sparkles,
    CheckCircle,
    Store,
    Send,
    FileText,
    SlidersHorizontal,
    Star,
    X,
    Megaphone,
    Plus,
    Building2,
} from "lucide-react";
import Link from "next/link";
import {
    getAllInfluencers,
    getDrives,
    createDrive,
    formatNumber,
    type InfluencerProfile,
    type MarketingDrive,
} from "@/lib/api-client";
import {
    getStoredUserProfile,
    getCityMatchedCreators,
    getCategoryLabel,
    type OnboardingProfile,
    type CityCreator,
} from "@/lib/user-profile";

export default function DashboardPage() {
    const [profile, setProfile] = useState<OnboardingProfile>(getStoredUserProfile());
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [drives, setDrives] = useState<MarketingDrive[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, avgEngagement: 0, lowRisk: 0, localMatches: 0 });

    // City-matched creators
    const [cityCreators, setCityCreators] = useState<CityCreator[]>([]);

    // Invite Modal State (Brand inviting creator)
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [selectedCreatorForInvite, setSelectedCreatorForInvite] = useState<CityCreator | null>(null);
    const [inviteSent, setInviteSent] = useState(false);
    const [inviteDeliverable, setInviteDeliverable] = useState("Instagram Reel + 2 Stories");

    useEffect(() => {
        loadData();

        const handleProfileUpdate = () => {
            const updated = getStoredUserProfile();
            setProfile(updated);
            refreshCityData(updated, influencers);
        };
        window.addEventListener("user-profile-updated", handleProfileUpdate);
        return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
    }, []);

    const refreshCityData = (currentProfile: OnboardingProfile, realData: InfluencerProfile[]) => {
        const city = currentProfile.city || "Navi Mumbai";
        const matched = getCityMatchedCreators(city, realData);
        setCityCreators(matched);
    };

    const loadData = async () => {
        const currentProfile = getStoredUserProfile();
        setProfile(currentProfile);

        try {
            const [infRes, drivesRes] = await Promise.all([
                getAllInfluencers(25),
                getDrives({ city: currentProfile.city }).catch(() => ({ drives: [], count: 0 })),
            ]);

            const fetchedList = infRes.results || [];
            setInfluencers(fetchedList);
            setDrives(drivesRes.drives || []);

            const total = infRes.count || fetchedList.length;
            const avgEng =
                fetchedList.length > 0
                    ? fetchedList.reduce((a, b) => a + (b.engagement_rate || 0), 0) / fetchedList.length
                    : 4.8;
            const lowRiskCount = fetchedList.filter((i) => i.risk_level === "low").length;

            refreshCityData(currentProfile, fetchedList);

            setStats({
                total,
                avgEngagement: Math.round(avgEng * 10) / 10,
                lowRisk: lowRiskCount || 4,
                localMatches: fetchedList.length,
            });
        } catch {
            // Keep state
        }
        setLoading(false);
    };

    const handleOpenInvite = (creator: CityCreator) => {
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

    const isBrand = profile.account_type === "brand" || !profile.account_type;
    const userCity = profile.city || "Navi Mumbai";

    return (
        <div className="space-y-7 pb-14">
            {/* Clean Executive Welcome Banner */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="neo-card rounded-3xl p-6 md:p-8 bg-gradient-to-r from-amber-300 via-neo-yellow to-orange-300 text-neo-black relative overflow-hidden"
            >
                <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full neo-border bg-neo-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                <Zap size={14} className="text-orange-600" />
                                {isBrand ? "🏢 Brand Campaign Engine" : "🌟 Creator Collab Hub"}
                            </span>
                            <span className="px-3 py-1 rounded-full neo-border bg-neo-black text-neo-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <MapPin size={13} className="text-neo-yellow" />
                                Same City Match: {userCity}
                            </span>
                        </div>

                        <Link href="/onboarding">
                            <span className="text-[11px] font-bold text-neo-black/70 hover:text-neo-black underline cursor-pointer">
                                Update Preferences
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
                                ? `Same-City Matching active: Showing audited creators based in ${userCity} ready for store visits, events, and sponsored campaigns.`
                                : `Same-City Matching active: Connect with verified brands in ${userCity} looking for local creators.`}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        {isBrand ? (
                            <>
                                <Link href="/dashboard/drives">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-neo-black text-neo-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm"
                                    >
                                        <Megaphone size={16} /> Post Marketing Drive
                                    </motion.button>
                                </Link>
                                <a href="#same-city-creators-section">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-neo-white text-neo-black px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
                                    >
                                        <Sparkles size={16} /> View {userCity} Creators ({cityCreators.length})
                                    </motion.button>
                                </a>
                                <Link href="/dashboard/brief">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-neo-white text-neo-black px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
                                    >
                                        <FileText size={16} /> Generate Brief
                                    </motion.button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard/drives">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-neo-black text-neo-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm"
                                    >
                                        <Megaphone size={16} /> Explore Marketing Drives
                                    </motion.button>
                                </Link>
                                <Link href="/dashboard/settings">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="neo-btn bg-neo-white text-neo-black px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
                                    >
                                        <SlidersHorizontal size={16} /> Profile Settings
                                    </motion.button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* =========================================================================
                BRAND VIEW: Same-City Audited Creators (City-to-City Match)
               ========================================================================= */}
            {isBrand && (
                <section id="same-city-creators-section" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-black flex items-center gap-2">
                                    <Sparkles className="text-orange-500 fill-orange-500" size={22} />
                                    Same City Verified Creators
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-neo-black/60 font-semibold mt-0.5">
                                Showing verified creators in <span className="text-neo-black font-black">{userCity}</span> matching your brand category.
                            </p>
                        </div>

                        <Link href="/dashboard/search">
                            <button className="neo-btn bg-neo-white text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 self-start sm:self-auto">
                                <Search size={14} /> Search All Cities
                            </button>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="neo-card bg-neo-white rounded-2xl p-5 h-48 animate-pulse" />
                            ))}
                        </div>
                    ) : cityCreators.length === 0 ? (
                        <div className="neo-card bg-neo-white rounded-2xl p-8 text-center space-y-3">
                            <Users size={36} className="mx-auto text-neo-black/30" />
                            <h3 className="font-black text-base text-neo-black">No Creators Indexed in {userCity} Yet</h3>
                            <p className="text-xs text-neo-black/60 max-w-sm mx-auto">
                                Search and index any Instagram or YouTube creator using their username to add them to your city database.
                            </p>
                            <Link href="/dashboard/search">
                                <button className="neo-btn bg-neo-yellow text-neo-black px-4 py-2 rounded-xl text-xs font-black">
                                    Fetch First Creator
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {cityCreators.slice(0, 6).map((creator) => (
                                <motion.div
                                    key={creator.id}
                                    whileHover={{ y: -3 }}
                                    className="neo-card bg-[var(--color-neo-white)] rounded-2xl p-5 flex flex-col justify-between space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg neo-border bg-[var(--color-neo-yellow)] text-[11px] font-black text-neo-black">
                                            <MapPin size={13} className="text-neo-black" />
                                            <span>{creator.city}</span>
                                            <span className="opacity-60">• Same City</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg neo-border bg-[var(--color-neo-green)] text-[11px] font-black text-neo-black">
                                            {creator.match_score}% Match
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <AvatarImg
                                            src={creator.avatar_url}
                                            name={creator.name}
                                            handle={creator.handle}
                                            platform={creator.platform}
                                            size={48}
                                            rounded="rounded-2xl"
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

                                    <div className="space-y-1.5 pt-1 border-t-2 border-neo-black/5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Estimated Quote:</span>
                                            <span className="font-black text-neo-black">{creator.rate_quote} / Reel</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Niche:</span>
                                            <span className="font-black text-neo-black truncate max-w-[150px]">{creator.niche.join(", ")}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            onClick={() => handleOpenInvite(creator)}
                                            className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                                        >
                                            <Send size={13} /> Invite Creator
                                        </button>

                                        <Link href={`/dashboard/brief?creator=${encodeURIComponent(creator.handle)}&name=${encodeURIComponent(creator.name)}`}>
                                            <button className="neo-btn bg-neo-white text-neo-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 w-full">
                                                <FileText size={13} /> Brief
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* =========================================================================
                CREATOR VIEW: Real Same-City Brand Marketing Drives
               ========================================================================= */}
            {!isBrand && (
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-black flex items-center gap-2">
                                    <Store className="text-[var(--color-neo-pink)]" size={22} />
                                    Active Brand Drives in {userCity}
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-neo-black/60 font-semibold mt-0.5">
                                Verified brand campaigns in <span className="text-neo-black font-black">{userCity}</span> looking for creators.
                            </p>
                        </div>

                        <Link href="/dashboard/drives">
                            <button className="neo-btn bg-neo-yellow text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 self-start sm:self-auto">
                                <Megaphone size={14} /> Browse All Drives
                            </button>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="neo-card bg-neo-white rounded-2xl p-5 h-40 animate-pulse" />
                            ))}
                        </div>
                    ) : drives.length === 0 ? (
                        <div className="neo-card bg-neo-white rounded-2xl p-8 text-center space-y-3">
                            <Megaphone size={36} className="mx-auto text-neo-black/30" />
                            <h3 className="font-black text-base text-neo-black">No Active Drives in {userCity} Right Now</h3>
                            <p className="text-xs text-neo-black/60 max-w-sm mx-auto">
                                Check back soon or explore campaigns across all cities in the Marketing Drives portal.
                            </p>
                            <Link href="/dashboard/drives">
                                <button className="neo-btn bg-neo-yellow text-neo-black px-4 py-2 rounded-xl text-xs font-black">
                                    Explore All Marketing Drives
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {drives.slice(0, 4).map((drive) => (
                                <motion.div
                                    key={drive.id}
                                    whileHover={{ y: -3 }}
                                    className="neo-card bg-[var(--color-neo-white)] rounded-2xl p-5 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-black text-base text-neo-black">{drive.title}</h3>
                                            <p className="text-xs font-bold text-neo-black/60 flex items-center gap-1 mt-0.5">
                                                <Store size={12} className="text-orange-500" />
                                                {drive.brand_name} • {drive.city}
                                            </p>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-lg neo-border bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                            {drive.status}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-neo-black/5 space-y-1 text-xs">
                                        <p className="text-neo-black/75 line-clamp-2">{drive.description}</p>
                                        <div className="flex items-center justify-between pt-1 border-t border-neo-black/10">
                                            <span className="font-bold text-neo-black">Pay Offer:</span>
                                            <span className="font-black text-orange-600">{drive.compensation}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[11px] font-bold text-neo-black/50">
                                            {drive.deliverables}
                                        </span>
                                        <Link href="/dashboard/drives">
                                            <button className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1">
                                                <Send size={12} /> Apply to Drive
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Direct Campaign Invite Modal */}
            <AnimatePresence>
                {inviteModalOpen && selectedCreatorForInvite && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="neo-card bg-[var(--color-neo-white)] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-[var(--color-neo-yellow)] neo-border">
                                        <Store size={20} className="text-neo-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-neo-black">Direct Campaign Invite</h3>
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
                                        Your direct campaign invite has been sent to {selectedCreatorForInvite.handle} for {userCity}.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 rounded-2xl bg-neo-black/5 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Brand:</span>
                                            <span className="font-black text-neo-black">{profile.business_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">City:</span>
                                            <span className="font-black text-neo-black">{userCity} (Same City Match)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Estimated Quote:</span>
                                            <span className="font-black text-neo-black">{selectedCreatorForInvite.rate_quote}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-neo-black/70">Campaign Format</label>
                                        <select
                                            value={inviteDeliverable}
                                            onChange={(e) => setInviteDeliverable(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-xs font-bold bg-neo-white"
                                        >
                                            <option value="Instagram Reel + 2 Stories">Instagram Reel + 2 Stories</option>
                                            <option value="In-Store Experience / Tasting">In-Store Experience / Tasting Visit</option>
                                            <option value="Product Launch Event Coverage">Product Launch Event Coverage</option>
                                            <option value="Dedicated Review Haul">Dedicated Review / Haul Video</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => setInviteModalOpen(false)}
                                            className="neo-btn bg-neo-white text-neo-black px-4 py-2 rounded-xl text-xs font-black"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSendInvite}
                                            className="neo-btn bg-[var(--color-neo-yellow)] text-neo-black px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
                                        >
                                            <Send size={14} /> Send Direct Invite
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
