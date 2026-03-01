"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, CheckCircle, XCircle, Heart, MessageCircle, Users,
    TrendingUp, DollarSign, MapPin, Shield, RefreshCw, FileText,
    Download, Loader, Trash2
} from "lucide-react";
import {
    getInfluencer, reanalyzeInfluencer, deleteInfluencer, formatNumber,
    type InfluencerProfile, type EngagementData, type SentimentData, type RiskFlag
} from "@/lib/api-client";
import EngagementHeatmap from "@/components/engagement-heatmap";
import SentimentPanel from "@/components/sentiment-panel";
import RiskPanel from "@/components/risk-panel";
import AvatarImg from "@/components/avatar-img";
import OutreachPanel from "@/components/outreach-panel";
import ContentSafetyAudit from "@/components/content-safety-audit";

export default function InfluencerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [profile, setProfile] = useState<InfluencerProfile | null>(null);
    const [engagement, setEngagement] = useState<EngagementData[]>([]);
    const [sentiment, setSentiment] = useState<SentimentData | null>(null);
    const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [reanalyzing, setReanalyzing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getInfluencer(id);
            setProfile(data.profile);
            setEngagement(data.engagement);
            setSentiment(data.sentiment);
            setRiskFlags(data.risk_flags);
        } catch (err: any) {
            setError(err.message || "Failed to load influencer");
        }
        setLoading(false);
    };

    const handleReanalyze = async () => {
        setReanalyzing(true);
        try {
            await reanalyzeInfluencer(id);
            await loadData();
        } catch (err: any) {
            setError(err.message);
        }
        setReanalyzing(false);
    };

    const handleDelete = async () => {
        if (!confirm("Delete this influencer and all their data? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await deleteInfluencer(id);
            router.push("/dashboard/influencers");
        } catch (err: any) {
            setError(err.message);
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Loader size={32} className="text-[var(--color-neo-pink)]" />
                </motion.div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="neo-card rounded-2xl p-12 text-center bg-[var(--color-neo-white)]">
                <XCircle size={48} className="mx-auto mb-4 text-[var(--color-neo-red)]" />
                <p className="font-bold text-[var(--color-neo-black)]">{error || "Influencer not found"}</p>
                <Link href="/dashboard/search">
                    <button className="neo-btn bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-6 py-3 rounded-xl text-sm mt-4">
                        ← Back to Search
                    </button>
                </Link>
            </div>
        );
    }

    const isHire = profile.match_score >= 70 && profile.risk_level !== "high";

    return (
        <div className="space-y-6">
            {/* Back */}
            <div className="flex items-center justify-between">
                <Link href="/dashboard/influencers">
                    <motion.button whileHover={{ x: -4 }} className="neo-btn bg-[var(--color-neo-white)] px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                        <ArrowLeft size={16} /> BACK TO INFLUENCERS
                    </motion.button>
                </Link>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={deleting}
                    className="neo-btn bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                >
                    {deleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? "Deleting..." : "Delete"}
                </motion.button>
            </div>

            {/* Profile Header */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="neo-card rounded-2xl p-6 bg-gradient-to-r from-[var(--color-neo-lavender)] to-[var(--color-neo-cream)] relative overflow-hidden"
            >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 flex-1">
                        <AvatarImg src={profile.avatar_url} name={profile.name} size={96} rounded="rounded-2xl" />
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-[var(--color-neo-black)] flex flex-wrap justify-center sm:justify-start items-center gap-2">
                                {profile.name}
                                {profile.verified && (
                                    <span className="neo-badge bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[10px]">✓ VERIFIED</span>
                                )}
                            </h1>
                            <p className="neo-badge bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-3 py-1 rounded-lg text-xs inline-block mt-1">
                                {profile.platform === "instagram" ? "📷" : "📺"}{" "}
                                {profile.handle}
                            </p>
                            <p className="text-sm text-[var(--color-neo-black)]/60 mt-3">{profile.bio}</p>
                            {profile.location && (
                                <p className="text-xs text-[var(--color-neo-black)]/40 flex items-center justify-center sm:justify-start gap-1 mt-1">
                                    <MapPin size={12} /> {profile.location}
                                </p>
                            )}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1 mt-3">
                                {profile.niche?.map((n) => (
                                    <span key={n} className="neo-badge bg-[var(--color-neo-yellow)] px-2 py-0.5 rounded text-[10px] uppercase font-bold">{n}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Decision */}
                    <div className="flex flex-row md:flex-col items-center justify-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t-2 md:border-t-0 border-[var(--color-neo-black)]/5">
                        <div className={`neo-card rounded-xl p-4 text-center min-w-[120px] ${isHire ? "bg-[var(--color-neo-green)]" : "bg-[var(--color-neo-red)]"}`}>
                            <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/50 tracking-widest">VERDICT</p>
                            <p className="text-3xl font-bold text-[var(--color-neo-black)]">{isHire ? "VOUCH" : "AVOID"}</p>
                        </div>
                        <div className={`neo-card rounded-xl px-4 py-3 text-center min-w-[120px] flex md:block flex-col justify-center ${profile.match_score >= 85 ? "bg-[var(--color-neo-green)]" : profile.match_score >= 70 ? "bg-[var(--color-neo-yellow)]" : "bg-[var(--color-neo-red)]"}`}>
                            <p className="text-xl font-bold leading-none">{profile.match_score}%</p>
                            <p className="text-[10px] font-bold uppercase mt-1">MATCH</p>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8">
                    {[
                        { label: "Followers", value: formatNumber(profile.followers), icon: Users },
                        { label: "Avg Likes", value: profile.avg_likes > 0 ? formatNumber(profile.avg_likes) : "N/A", icon: Heart },
                        { label: "Avg Comments", value: profile.avg_comments > 0 ? formatNumber(profile.avg_comments) : "N/A", icon: MessageCircle },
                        { label: "Eng. Rate", value: profile.engagement_rate > 0 ? `${profile.engagement_rate}%` : "N/A", icon: TrendingUp },
                        { label: "Predicted ROI", value: profile.predicted_roi > 0 ? `${profile.predicted_roi}x` : "N/A", icon: DollarSign },
                    ].map((stat) => (
                        <div key={stat.label} className="neo-card rounded-xl p-3 text-center bg-[var(--color-neo-white)]/80">
                            <stat.icon size={16} className="mx-auto mb-1 text-[var(--color-neo-black)]/40" />
                            <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 leading-tight">{stat.label}</p>
                            <p className="text-lg font-bold mt-1">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-6 pt-6 border-t-2 border-[var(--color-neo-black)]/5">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReanalyze}
                        disabled={reanalyzing}
                        className="neo-btn bg-[var(--color-neo-cyan)] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        {reanalyzing ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {reanalyzing ? "Analyzing..." : "Re-Analyze Profile"}
                    </motion.button>
                    <Link href="/dashboard/brief" className="w-full sm:w-auto">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="neo-btn bg-[var(--color-neo-purple)] text-[var(--color-neo-white)] w-full px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                            <FileText size={14} /> Campaign Brief
                        </motion.button>
                    </Link>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="neo-btn bg-[var(--color-neo-yellow)] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                        <Download size={14} /> Download PDF
                    </motion.button>
                </div>
            </motion.div>

            {/* Analysis Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <EngagementHeatmap data={engagement} />
                </motion.div>

                {/* Sentiment */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                    {sentiment ? (
                        <SentimentPanel data={sentiment} />
                    ) : (
                        <div className="neo-card rounded-2xl p-8 bg-[var(--color-neo-white)] text-center">
                            <p className="font-bold text-[var(--color-neo-black)]">No sentiment data yet</p>
                            <p className="text-sm text-[var(--color-neo-black)]/50 mt-1">Re-analyze to generate sentiment insights</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Risk Assessment */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <RiskPanel
                    data={{
                        overall_risk: profile.risk_level,
                        bot_percentage: profile.bot_percentage,
                        flags: riskFlags,
                    }}
                />
            </motion.div>

            {/* Deep Audit & Outreach */}
            <div className="grid grid-cols-1 gap-6">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                    <ContentSafetyAudit influencerId={id} />
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                    <OutreachPanel influencerId={id} />
                </motion.div>
            </div>
        </div>
    );
}

