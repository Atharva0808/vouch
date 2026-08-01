"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Sparkles, Filter, ChevronDown, Loader, Plus, Instagram, Youtube } from "lucide-react";
import { fetchInfluencer, searchInfluencers, deleteInfluencer, formatNumber, type InfluencerProfile } from "@/lib/api-client";
import Link from "next/link";
import AvatarImg from "@/components/avatar-img";

const platformOptions = ["all", "instagram", "youtube", "tiktok", "facebook"];
const nicheOptions = ["all", "Fitness", "Fashion", "Beauty", "Food", "Travel", "Tech", "Gaming", "Lifestyle", "Education"];
const riskOptions = ["all", "low", "medium", "high"];

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader className="animate-spin text-[var(--color-neo-pink)]" size={32} /></div>}>
            <SearchContent />
        </Suspense>
    );
}

function SearchContent() {
    const searchParams = useSearchParams();
    const initialQ = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQ);
    const [platform, setPlatform] = useState("all");
    const [niche, setNiche] = useState("all");
    const [riskFilter, setRiskFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [results, setResults] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingNew, setFetchingNew] = useState(false);
    const [error, setError] = useState("");
    const [fetchHandle, setFetchHandle] = useState("");
    const [fetchPlatform, setFetchPlatform] = useState("instagram");
    const [fetchStatus, setFetchStatus] = useState("Analyzing...");

    useEffect(() => {
        if (initialQ) {
            setQuery(initialQ);
            setLoading(true);
            searchInfluencers({ query: initialQ })
                .then((data) => setResults(data.results))
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [initialQ]);

    // Search existing database
    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError("");
        try {
            const data = await searchInfluencers({
                query,
                platform: platform !== "all" ? platform : undefined,
                niche: niche !== "all" ? niche : undefined,
                risk_level: riskFilter !== "all" ? riskFilter : undefined,
            });
            setResults(data.results);
        } catch (err: any) {
            setError(err.message || "Search failed");
        }
        setLoading(false);
    };

    // Fetch NEW influencer from social media (real data)
    const handleFetchNew = async () => {
        if (!fetchHandle.trim()) return;
        setFetchingNew(true);
        setFetchStatus("Pulling profile...");
        setError("");

        const timer1 = setTimeout(() => setFetchStatus("AI analysis..."), 2500);
        const timer2 = setTimeout(() => setFetchStatus("Indexing..."), 5000);

        try {
            const data = await fetchInfluencer(fetchHandle, fetchPlatform);
            // Add the new profile to results
            setResults((prev) => [data.profile, ...prev.filter(inf => inf.id !== data.profile.id)]);
        } catch (err: any) {
            setError(err.message || "Failed to fetch influencer data");
        } finally {
            clearTimeout(timer1);
            clearTimeout(timer2);
            setFetchingNew(false);
            setFetchStatus("Analyzing...");
        }
    };

    const getRiskColor = (risk: string) => {
        if (risk === "low") return "bg-[var(--color-neo-green)]";
        if (risk === "medium") return "bg-[var(--color-neo-yellow)]";
        return "bg-[var(--color-neo-red)]";
    };

    const getMatchColor = (score: number) => {
        if (score >= 85) return "bg-[var(--color-neo-green)]";
        if (score >= 70) return "bg-[var(--color-neo-yellow)]";
        return "bg-[var(--color-neo-red)]";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-xl md:text-2xl font-bold text-[var(--color-neo-black)]">Search Influencers</h1>
                <p className="text-xs md:text-sm text-[var(--color-neo-black)]/40 font-semibold">REAL DATA FROM SOCIAL MEDIA</p>
            </motion.div>

            {/* Fetch New Influencer from Social Media */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Plus size={20} className="text-neo-black" />
                    <h3 className="text-lg font-bold text-neo-black uppercase tracking-tight">Audit New Influencer</h3>
                </div>
                <p className="text-sm text-neo-black/70 mb-4 font-medium">
                    Enter a social media handle to pull real profile data, run AI analysis, and save to your database.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={fetchPlatform}
                        onChange={(e) => setFetchPlatform(e.target.value)}
                        className="neo-input py-3 px-4 rounded-xl text-sm w-full sm:w-40 capitalize"
                    >
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                    </select>
                    <input
                        type="text"
                        value={fetchHandle}
                        onChange={(e) => setFetchHandle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFetchNew()}
                        className="neo-input flex-1 py-3 px-4 rounded-xl text-sm"
                        placeholder="Enter handle (e.g. therock, davidbeckham)"
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleFetchNew}
                        disabled={fetchingNew || !fetchHandle.trim()}
                        className="neo-btn bg-[var(--color-neo-yellow)] text-[var(--color-neo-black)] px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                        {fetchingNew ? (
                            <>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    <Loader size={16} />
                                </motion.div>
                                {fetchStatus}
                            </>
                        ) : (
                            <>
                                Fetch
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Search Database */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="neo-card rounded-2xl p-4 bg-[var(--color-neo-white)]"
            >
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neo-black)]/30" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="neo-input w-full py-3 pl-12 pr-4 rounded-xl text-sm"
                            placeholder="Search saved influencers..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowFilters(!showFilters)}
                            className="neo-btn flex-1 sm:flex-none justify-center bg-[var(--color-neo-white)] p-3 rounded-xl"
                        >
                            <Filter size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSearch}
                            disabled={loading}
                            className="neo-btn flex-1 sm:flex-none justify-center bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-8 py-3 rounded-xl text-sm font-bold"
                        >
                            {loading ? "..." : "Search"}
                        </motion.button>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t-2 border-[var(--color-neo-black)]/10">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-1 block">Platform</label>
                                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="neo-input w-full py-2 px-3 rounded-lg text-sm capitalize">
                                        {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-1 block">Niche</label>
                                    <select value={niche} onChange={(e) => setNiche(e.target.value)} className="neo-input w-full py-2 px-3 rounded-lg text-sm">
                                        {nicheOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-1 block">Risk Level</label>
                                    <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="neo-input w-full py-2 px-3 rounded-lg text-sm capitalize">
                                        {riskOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Error */}
            {
                error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="neo-card rounded-2xl p-4 bg-[var(--color-neo-red)]/10 border-l-4 border-[var(--color-neo-red)] text-sm text-red-700"
                    >
                        {error}
                    </motion.div>
                )
            }

            {/* Results */}
            {
                results.length > 0 && (
                    <div>
                        <p className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 mb-4">
                            {results.length} RESULT{results.length !== 1 ? "S" : ""}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.map((inf, i) => (
                                <motion.div
                                    key={inf.id}
                                    initial={{ y: 20, opacity: 0, rotate: -1 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    transition={{ delay: i * 0.05, type: "spring" }}
                                    whileHover={{ y: -4, rotate: 0.5 }}
                                >
                                    <Link href={`/dashboard/influencer/${inf.id}`}>
                                        <div className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)] cursor-pointer h-full">
                                            <div className="flex items-center gap-3 mb-3">
                                                <AvatarImg src={inf.avatar_url} name={inf.name} handle={inf.handle} platform={inf.platform} size={48} />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-[var(--color-neo-black)] truncate">{inf.name}</h3>
                                                    <p className="text-xs text-[var(--color-neo-black)]/40">{inf.handle}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="neo-badge bg-[var(--color-neo-black)]/5 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                    {inf.platform}
                                                </span>
                                                {inf.posts === 0 && inf.followers < 10000 && inf.platform !== "youtube" && (
                                                    <span className="neo-badge bg-[var(--color-neo-red)]/10 text-[var(--color-neo-red)] px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                        No Activity
                                                    </span>
                                                )}
                                                {inf.posts > 0 && inf.engagement_rate === 0 && inf.platform === "instagram" && (
                                                    <span className="neo-badge bg-[var(--color-neo-black)]/10 text-[var(--color-neo-black)]/60 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                        Private
                                                    </span>
                                                )}
                                                {inf.niche?.slice(0, 2).map((n) => (
                                                    <span key={n} className="neo-badge bg-[var(--color-neo-yellow)]/30 px-2 py-0.5 rounded text-[10px]">
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="p-2 bg-[var(--color-neo-black)]/3 rounded-lg">
                                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-bold">FOLLOWERS</p>
                                                    <p className="text-sm font-bold">{formatNumber(inf.followers)}</p>
                                                </div>
                                                <div className="p-2 bg-[var(--color-neo-black)]/3 rounded-lg">
                                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-bold">ENG.</p>
                                                    <p className="text-sm font-bold">{inf.engagement_rate === 0 ? "N/A" : inf.engagement_rate + "%"}</p>
                                                </div>
                                                <div className="p-2 bg-[var(--color-neo-black)]/3 rounded-lg">
                                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-bold">ROI</p>
                                                    <p className="text-sm font-bold">{inf.engagement_rate === 0 ? "N/A" : inf.predicted_roi + "x"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[var(--color-neo-black)]/5">
                                                <span className={`neo-badge ${getRiskColor(inf.risk_level)} px-2 py-0.5 rounded text-[10px] uppercase font-bold`}>
                                                    {inf.risk_level} risk
                                                </span>
                                                {inf.verified && (
                                                    <span className="text-[10px] text-blue-600 font-bold">✓ VERIFIED</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Empty State */}
            {
                !loading && results.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="neo-card rounded-2xl p-12 bg-[var(--color-neo-white)] text-center"
                    >
                        <Search size={48} className="mx-auto mb-4 text-[var(--color-neo-black)]/10" />
                        <h3 className="text-lg font-bold text-[var(--color-neo-black)] mb-2">Find Real Influencers</h3>
                        <p className="text-sm text-[var(--color-neo-black)]/50 max-w-md mx-auto">
                            Use &quot;Fetch New Influencer&quot; above to pull real data from Instagram or YouTube.
                            Or search your saved database below.
                        </p>
                    </motion.div>
                )
            }
        </div >
    );
}

