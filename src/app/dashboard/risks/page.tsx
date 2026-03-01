"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, AlertOctagon, CheckCircle2, Search, Loader, ExternalLink, BadgeCheck, Brain, Info, Trash2, Instagram, Youtube } from "lucide-react";
import { useState, useEffect } from "react";
import { getAllRiskFlags, deleteRiskFlag, type RiskFlag } from "@/lib/api-client";
import Link from "next/link";
import AvatarImg from "@/components/avatar-img";

interface RiskFlagWithInfluencer extends RiskFlag {
    id: string;
    influencer_id: string;
    source?: string;
    evidence?: string;
    influencers: {
        id: string;
        name: string;
        handle: string;
        platform: string;
        avatar_url: string;
    }
}

export default function RisksPage() {
    const [risks, setRisks] = useState<RiskFlagWithInfluencer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"all" | "verified_metric" | "ai_inference">("all");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [platformFilter, setPlatformFilter] = useState<"all" | "instagram" | "youtube">("all");

    useEffect(() => {
        loadRisks();
    }, []);

    const loadRisks = async () => {
        setLoading(true);
        try {
            const data = await getAllRiskFlags();
            setRisks(data as RiskFlagWithInfluencer[]);
        } catch (err) {
            console.error("Failed to load risk flags", err);
        }
        setLoading(false);
    };

    const handleDelete = async (flagId: string) => {
        if (!confirm("Dismiss this risk flag? This cannot be undone.")) return;
        setDeletingId(flagId);
        try {
            await deleteRiskFlag(flagId);
            setRisks(prev => prev.filter(r => r.id !== flagId));
        } catch (err) {
            console.error("Failed to delete risk flag", err);
        }
        setDeletingId(null);
    };

    // Platform counts
    const instagramCount = risks.filter(r => r.influencers?.platform?.toLowerCase() === "instagram").length;
    const youtubeCount = risks.filter(r => r.influencers?.platform?.toLowerCase() === "youtube").length;

    const filteredRisks = risks.filter(risk => {
        const matchesSearch =
            risk.influencers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            risk.influencers?.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            risk.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            risk.influencers?.platform?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSource =
            sourceFilter === "all" ||
            risk.source === sourceFilter ||
            // Legacy flags without source field — treat as ai_inference
            (!risk.source && sourceFilter === "ai_inference");

        const matchesPlatform =
            platformFilter === "all" ||
            risk.influencers?.platform?.toLowerCase() === platformFilter;

        return matchesSearch && matchesSource && matchesPlatform;
    }).sort((a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priority[a.severity as keyof typeof priority] || 0) - (priority[b.severity as keyof typeof priority] || 0);
    });

    const verifiedCount = risks.filter(r => r.source === "verified_metric").length;
    const inferenceCount = risks.filter(r => r.source === "ai_inference" || !r.source).length;

    const getSeverityStyles = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical": return "bg-neo-red/10 text-neo-red border-neo-red/20";
            case "high": return "bg-neo-orange/10 text-neo-orange border-neo-orange/20";
            case "medium": return "bg-neo-yellow/10 text-amber-600 border-neo-yellow/20";
            default: return "bg-neo-green/10 text-neo-green border-neo-green/20";
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical": return <AlertOctagon size={16} />;
            case "high": return <AlertTriangle size={16} />;
            case "medium": return <Shield size={16} />;
            default: return <CheckCircle2 size={16} />;
        }
    };

    const getSourceBadge = (source?: string) => {
        if (source === "verified_metric") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">
                    <BadgeCheck size={11} />
                    Verified Metric
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-bold uppercase border border-purple-200">
                <Brain size={11} />
                AI Estimated
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-2xl font-bold text-neo-black">Risk Monitor</h1>
                <p className="text-sm text-neo-black/40 font-semibold">REAL-TIME BRAND SAFETY ENGINE</p>
            </motion.div>

            {/* Info Banner */}
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="neo-card rounded-2xl p-4 bg-gradient-to-r from-emerald-50 to-purple-50"
            >
                <div className="flex items-start gap-3">
                    <Info size={18} className="text-neo-black/40 shrink-0 mt-0.5" />
                    <div className="text-xs text-neo-black/60 leading-relaxed">
                        <p className="font-bold text-neo-black/80 mb-1">How to read risk flags</p>
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                                    <BadgeCheck size={10} /> VERIFIED
                                </span>
                                — Based on real, measurable data (follower ratios, engagement rate, post count)
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">
                                    <Brain size={10} /> AI ESTIMATED
                                </span>
                                — AI inference from content analysis (bio, comments, patterns)
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/30" size={18} />
                    <input
                        type="text"
                        placeholder="Filter by influencer or risk type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="neo-input w-full pl-12 pr-4 py-3 rounded-xl text-sm"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Source filter buttons */}
                    <button
                        onClick={() => setSourceFilter("all")}
                        className={`neo-badge px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer ${sourceFilter === "all"
                            ? "bg-neo-black text-neo-white"
                            : "bg-neo-black/5 text-neo-black/50 hover:bg-neo-black/10"
                            }`}
                    >
                        All ({risks.length})
                    </button>
                    <button
                        onClick={() => setSourceFilter("verified_metric")}
                        className={`neo-badge px-3 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${sourceFilter === "verified_metric"
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                    >
                        <BadgeCheck size={12} /> Verified ({verifiedCount})
                    </button>
                    <button
                        onClick={() => setSourceFilter("ai_inference")}
                        className={`neo-badge px-3 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${sourceFilter === "ai_inference"
                            ? "bg-purple-600 text-white"
                            : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                            }`}
                    >
                        <Brain size={12} /> AI Estimated ({inferenceCount})
                    </button>
                    <div className="neo-badge bg-neo-red/10 text-neo-red px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2">
                        <AlertOctagon size={14} /> {risks.filter(r => r.severity === 'critical').length} Critical
                    </div>
                </div>
            </div>

            {/* Platform Filter */}
            <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-neo-black/40 uppercase self-center mr-1">Platform:</span>
                <button
                    onClick={() => setPlatformFilter("all")}
                    className={`neo-badge px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${platformFilter === "all"
                        ? "bg-neo-black text-neo-white"
                        : "bg-neo-black/5 text-neo-black/50 hover:bg-neo-black/10"
                        }`}
                >
                    All ({risks.length})
                </button>
                <button
                    onClick={() => setPlatformFilter("instagram")}
                    className={`neo-badge px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${platformFilter === "instagram"
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        : "bg-pink-50 text-pink-600 hover:bg-pink-100"
                        }`}
                >
                    <Instagram size={12} /> Instagram ({instagramCount})
                </button>
                <button
                    onClick={() => setPlatformFilter("youtube")}
                    className={`neo-badge px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${platformFilter === "youtube"
                        ? "bg-red-600 text-white"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                >
                    <Youtube size={12} /> YouTube ({youtubeCount})
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader className="animate-spin text-neo-red" size={32} />
                </div>
            ) : filteredRisks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRisks.map((risk, i) => (
                        <motion.div
                            key={risk.id || i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="neo-card rounded-2xl p-5 bg-neo-white hover:bg-neo-black/2 transition-colors border-l-8 border-l-transparent"
                            style={{ borderLeftColor: risk.severity === 'critical' ? '#FF4141' : (risk.severity === 'high' ? '#FFAC33' : risk.severity === 'medium' ? '#F4D03F' : '#8BDAA7') }}
                        >
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                {/* Influencer Info */}
                                <div className="flex items-center gap-3 w-full md:w-64 shrink-0">
                                    <AvatarImg src={risk.influencers?.avatar_url ?? ""} name={risk.influencers?.name ?? "Unknown"} size={40} rounded="rounded-xl" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{risk.influencers?.name || "Unknown"}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${risk.influencers?.platform?.toLowerCase() === "instagram"
                                                    ? "bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700"
                                                    : risk.influencers?.platform?.toLowerCase() === "youtube"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {risk.influencers?.platform?.toLowerCase() === "instagram" ? (
                                                    <><Instagram size={10} /> IG</>
                                                ) : risk.influencers?.platform?.toLowerCase() === "youtube" ? (
                                                    <><Youtube size={10} /> YT</>
                                                ) : (
                                                    risk.influencers?.platform || "?"
                                                )}
                                            </span>
                                            <span className="text-[10px] text-neo-black/40 font-mono truncate">@{risk.influencers?.handle || "system"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Details */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <div className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-1 ${getSeverityStyles(risk.severity)}`}>
                                            {getSeverityIcon(risk.severity)}
                                            {risk.severity}
                                        </div>
                                        <span className="text-[10px] font-bold text-neo-black uppercase tracking-wider">{risk.type}</span>
                                        {getSourceBadge(risk.source)}
                                    </div>
                                    <p className="text-xs text-neo-black/70 leading-relaxed font-medium">
                                        {risk.description}
                                    </p>
                                    {/* Evidence line — only show if source is verified and evidence exists */}
                                    {risk.evidence && (
                                        <p className="text-[10px] text-neo-black/40 mt-1.5 flex items-center gap-1">
                                            <span className="font-bold">Evidence:</span> {risk.evidence}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                                    <Link
                                        href={`/dashboard/influencer/${risk.influencer_id}`}
                                        className="neo-btn bg-neo-black text-neo-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1"
                                    >
                                        View Detail <ExternalLink size={12} />
                                    </Link>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDelete(risk.id)}
                                        disabled={deletingId === risk.id}
                                        className="neo-btn bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-xl transition-colors disabled:opacity-50"
                                        title="Dismiss this risk flag"
                                    >
                                        {deletingId === risk.id ? (
                                            <Loader size={14} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="neo-card rounded-2xl p-12 text-center bg-neo-white">
                    <Shield size={48} className="mx-auto mb-4 text-neo-green/20" />
                    <h3 className="text-lg font-bold text-neo-black">Safe Zone</h3>
                    <p className="text-sm text-neo-black/40">
                        {sourceFilter !== "all"
                            ? `No ${sourceFilter === "verified_metric" ? "verified" : "AI estimated"} risks found.`
                            : "No critical risks detected across your tracked influencers."}
                    </p>
                </div>
            )}
        </div>
    );
}
