"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Sparkles,
    TrendingUp,
    Shield,
    DollarSign,
    Users,
    ArrowUpRight,
    CheckCircle2,
    Sliders,
    Zap,
    Award,
    Layers,
    FileText,
    Megaphone,
    AlertCircle,
    Info,
} from "lucide-react";
import Link from "next/link";
import AvatarImg from "@/components/avatar-img";
import SkeletonShimmer from "@/components/skeleton-shimmer";
import { discoverRecommendations, type ScoredCreator, type RecommendationResponse } from "@/lib/api-client";

const CATEGORIES = [
    "Tech",
    "Fitness",
    "Beauty",
    "Fashion",
    "Gaming",
    "Food",
    "Travel",
    "Finance",
    "Lifestyle",
    "Education",
];

const AGE_GROUPS = [
    { value: "18-24", label: "18–24 (Gen Z)", desc: "Shorts, Reels, high viral trend affinity" },
    { value: "25-34", label: "25–34 (Millennials)", desc: "In-depth reviews, high purchasing power" },
    { value: "13-17", label: "13–17 (Gen Alpha/Teens)", desc: "Gaming, entertainment, fast consumption" },
    { value: "35-50", label: "35–50 (Gen X)", desc: "Finance, health, long-form content" },
];

const GOALS = [
    { value: "maximize_roi", label: "Maximize ROI Multiplier", icon: TrendingUp, desc: "Weights return on ad spend highest (35% ROI weight)" },
    { value: "high_engagement", label: "High Audience Engagement", icon: Zap, desc: "Prioritizes viral reach & active community interaction" },
    { value: "brand_safety", label: "Ultra Brand Safety", icon: Shield, desc: "Strict bot-free verification & lowest controversy risk" },
    { value: "maximum_reach", label: "Maximum Mass Reach", icon: Users, desc: "Maximizes gross impressions and tier-1 audience size" },
];

const BUDGET_PRESETS = [50000, 100000, 250000, 500000, 1000000];

export default function RecommendationsPage() {
    const [category, setCategory] = useState("Tech");
    const [audienceAge, setAudienceAge] = useState("18-24");
    const [budget, setBudget] = useState(100000);
    const [campaignGoal, setCampaignGoal] = useState("maximize_roi");
    const [platform, setPlatform] = useState("all");

    const [loading, setLoading] = useState(false);
    const [scanStage, setScanStage] = useState("");
    const [recommendationResult, setRecommendationResult] = useState<RecommendationResponse | null>(null);
    const [error, setError] = useState("");

    const handleRunEngine = async () => {
        setLoading(true);
        setError("");
        setRecommendationResult(null);

        // Animated progression stages for high user feedback
        setScanStage("Autonomous Social Sourcing & Scanning...");
        const t1 = setTimeout(() => setScanStage("Evaluating Demographic & Age Fit..."), 1200);
        const t2 = setTimeout(() => setScanStage("Executing Multi-Criteria MCDM Ranking Algorithm..."), 2400);

        try {
            const data = await discoverRecommendations({
                category,
                audience_age: audienceAge,
                budget,
                campaign_goal: campaignGoal,
                platform: platform !== "all" ? platform : undefined,
            });
            setRecommendationResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate creator recommendations");
        } finally {
            clearTimeout(t1);
            clearTimeout(t2);
            setLoading(false);
            setScanStage("");
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-black pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-neo-cyan neo-border neo-shadow-sm rounded-xl text-neo-black">
                            <Target size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neo-black uppercase">
                                AI Creator Recommendation Engine
                            </h1>
                            <p className="text-xs font-mono text-neo-black/60 tracking-wider font-bold">
                                MULTI-CRITERIA DECISION MAKING (MCDM) RANKING & AUTONOMOUS SOCIAL DISCOVERY
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="neo-badge bg-neo-yellow text-neo-black px-3 py-1.5 rounded-xl font-mono text-xs font-black neo-border">
                        Algorithm: Weighted MCDM v2.4
                    </span>
                </div>
            </div>

            {/* Campaign Requirements Input Card */}
            <div className="neo-card bg-neo-white p-6 md:p-8 rounded-3xl neo-border neo-shadow-md space-y-6">
                <div className="flex items-center gap-2 border-b-2 border-neo-black/10 pb-4">
                    <Sliders size={20} className="text-neo-black" />
                    <h2 className="text-lg font-black text-neo-black uppercase">
                        1. Define Campaign Parameters
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="block text-xs font-mono font-black uppercase text-neo-black">
                            Target Category / Niche *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="neo-input w-full p-3.5 rounded-xl text-sm font-bold bg-neo-white"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Target Age */}
                    <div className="space-y-2">
                        <label className="block text-xs font-mono font-black uppercase text-neo-black">
                            Target Audience Age Demographics *
                        </label>
                        <select
                            value={audienceAge}
                            onChange={(e) => setAudienceAge(e.target.value)}
                            className="neo-input w-full p-3.5 rounded-xl text-sm font-bold bg-neo-white"
                        >
                            {AGE_GROUPS.map((ag) => (
                                <option key={ag.value} value={ag.value}>
                                    {ag.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Platform Preference */}
                    <div className="space-y-2">
                        <label className="block text-xs font-mono font-black uppercase text-neo-black">
                            Platform Preference
                        </label>
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            className="neo-input w-full p-3.5 rounded-xl text-sm font-bold bg-neo-white"
                        >
                            <option value="all">All Platforms (Instagram & YouTube)</option>
                            <option value="instagram">Instagram Only</option>
                            <option value="youtube">YouTube Only</option>
                        </select>
                    </div>
                </div>

                {/* Budget Selection */}
                <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-mono font-black uppercase text-neo-black">
                            Campaign Budget (₹) *
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {BUDGET_PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setBudget(preset)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold neo-border transition-all ${budget === preset
                                        ? "bg-neo-yellow text-neo-black font-black neo-shadow-sm"
                                        : "bg-neo-white text-neo-black/70 hover:bg-neo-black/5"
                                        }`}
                                >
                                    ₹{(preset / 1000).toFixed(0)}K
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neo-black/60 font-black">
                            ₹
                        </div>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(Number(e.target.value))}
                            className="neo-input w-full pl-8 pr-4 py-3.5 rounded-xl text-sm font-bold bg-neo-white"
                            placeholder="e.g. 100000"
                        />
                    </div>
                </div>

                {/* Campaign Goal Selection */}
                <div className="space-y-3 pt-2">
                    <label className="block text-xs font-mono font-black uppercase text-neo-black">
                        Optimization Priority & Ranking Weights *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {GOALS.map((g) => {
                            const isSelected = campaignGoal === g.value;
                            const Icon = g.icon;
                            return (
                                <div
                                    key={g.value}
                                    onClick={() => setCampaignGoal(g.value)}
                                    className={`p-4 rounded-2xl neo-border cursor-pointer transition-all ${isSelected
                                        ? "bg-neo-black text-white neo-shadow-sm"
                                        : "bg-neo-white text-neo-black hover:bg-neo-yellow/20"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className={`p-1.5 rounded-lg neo-border ${isSelected ? "bg-neo-yellow text-neo-black" : "bg-neo-black/5 text-neo-black"
                                                }`}
                                        >
                                            <Icon size={16} />
                                        </div>
                                        <span className="text-xs font-black uppercase">{g.label}</span>
                                    </div>
                                    <p
                                        className={`text-[11px] leading-tight ${isSelected ? "text-white/80" : "text-neo-black/60"
                                            }`}
                                    >
                                        {g.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Submit / Run Engine CTA */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-neo-black/10">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-neo-black/60">
                        <Sparkles size={14} className="text-neo-pink" />
                        <span>Analyzes authentic creators across social media in real-time</span>
                    </div>

                    <button
                        onClick={handleRunEngine}
                        disabled={loading}
                        className="neo-btn w-full sm:w-auto bg-neo-yellow text-neo-black px-8 py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2.5 neo-shadow-sm disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles size={18} />
                                </motion.div>
                                <span>{scanStage || "ANALYZING SOCIAL DATA..."}</span>
                            </>
                        ) : (
                            <>
                                <Target size={18} />
                                <span>FIND & RANK TOP 5 CREATORS</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-neo-red/20 text-neo-red neo-border rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="space-y-6">
                    <div className="p-4 bg-neo-cyan/20 neo-border rounded-2xl flex items-center gap-3 animate-pulse">
                        <Sparkles className="text-neo-black animate-spin" size={20} />
                        <span className="text-xs font-mono font-black text-neo-black uppercase tracking-wider">
                            {scanStage}
                        </span>
                    </div>
                    <SkeletonShimmer count={3} />
                </div>
            )}

            {/* Recommendation Results Display */}
            <AnimatePresence>
                {!loading && recommendationResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Algorithm Transparency Card for Viva / Academic Presentation */}
                        <div className="neo-card bg-neo-lavender/30 p-6 rounded-3xl neo-border space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-neo-black/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Layers size={18} className="text-neo-black" />
                                    <h3 className="text-sm font-black text-neo-black uppercase">
                                        MCDM Algorithm Weights & Formula Breakdown
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-neo-black/60">
                                    Category: {recommendationResult.category} • Age: {recommendationResult.audience_age}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="p-3 bg-neo-white rounded-xl neo-border text-center">
                                    <p className="text-[10px] font-mono uppercase font-bold text-neo-black/60">Niche Fit</p>
                                    <p className="text-lg font-black text-neo-black">
                                        {(recommendationResult.weights_used.niche * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-neo-white rounded-xl neo-border text-center">
                                    <p className="text-[10px] font-mono uppercase font-bold text-neo-black/60">Audience Age</p>
                                    <p className="text-lg font-black text-neo-black">
                                        {(recommendationResult.weights_used.age * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-neo-white rounded-xl neo-border text-center">
                                    <p className="text-[10px] font-mono uppercase font-bold text-neo-black/60">Predicted ROI</p>
                                    <p className="text-lg font-black text-neo-purple">
                                        {(recommendationResult.weights_used.roi * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-neo-white rounded-xl neo-border text-center">
                                    <p className="text-[10px] font-mono uppercase font-bold text-neo-black/60">Brand Safety</p>
                                    <p className="text-lg font-black text-emerald-700">
                                        {(recommendationResult.weights_used.safety * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-neo-white rounded-xl neo-border text-center col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-mono uppercase font-bold text-neo-black/60">Budget Fit</p>
                                    <p className="text-lg font-black text-neo-black">
                                        {(recommendationResult.weights_used.budget * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Top 5 Leaderboard Heading */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Award size={24} className="text-neo-black" />
                                <h2 className="text-2xl font-black text-neo-black uppercase tracking-tight">
                                    Top 5 Recommended Influencers
                                </h2>
                            </div>
                            <span className="text-xs font-mono font-bold text-neo-black/60">
                                5 of 5 Pareto-Ranked
                            </span>
                        </div>

                        {/* Top 5 Creator Cards List */}
                        <div className="space-y-6">
                            {recommendationResult.top_creators.map((creator, idx) => (
                                <motion.div
                                    key={creator.handle + idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="neo-card bg-neo-white p-6 rounded-3xl neo-border neo-shadow-md space-y-5"
                                >
                                    {/* Creator Header Row */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-neo-black/10 pb-4">
                                        <div className="flex items-center gap-4">
                                            {/* Rank Badge */}
                                            <div
                                                className={`w-12 h-12 rounded-2xl neo-border flex items-center justify-center font-black text-lg ${idx === 0
                                                    ? "bg-neo-yellow text-neo-black neo-shadow-sm"
                                                    : idx === 1
                                                        ? "bg-neo-cyan text-neo-black"
                                                        : "bg-neo-black/5 text-neo-black"
                                                    }`}
                                            >
                                                #{creator.rank}
                                            </div>

                                            <AvatarImg
                                                src={creator.avatar_url || ""}
                                                name={creator.name}
                                                handle={creator.handle}
                                                platform={creator.platform}
                                                size={56}
                                            />

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-black text-neo-black">
                                                        {creator.name}
                                                    </h3>
                                                    <span className="neo-badge bg-neo-pink text-neo-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full neo-border">
                                                        {creator.platform}
                                                    </span>
                                                    <span className="neo-badge bg-neo-yellow text-neo-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full neo-border">
                                                        {creator.badge}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-mono text-neo-black/60 font-bold mt-0.5">
                                                    @{creator.handle} • {creator.followers.toLocaleString("en-IN")} followers • {creator.engagement_rate}% ER
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score Badges */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-[10px] font-mono uppercase font-bold text-neo-black/60 block">
                                                    Estimated Fee
                                                </span>
                                                <span className="text-lg font-black text-neo-black">
                                                    ₹{creator.estimated_fee.toLocaleString("en-IN")}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-neo-black text-white rounded-2xl neo-border neo-shadow-sm text-center min-w-[90px]">
                                                <span className="text-[9px] font-mono uppercase font-bold text-white/70 block">
                                                    Composite Fit
                                                </span>
                                                <span className="text-2xl font-black text-neo-yellow">
                                                    {creator.composite_score}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Multi-Variable Score Breakdown Bar */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-neo-black/5 p-3.5 rounded-2xl neo-border">
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                <span>Category Fit</span>
                                                <span>{creator.score_breakdown.niche_fit}%</span>
                                            </div>
                                            <div className="w-full bg-neo-black/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-neo-pink h-full rounded-full"
                                                    style={{ width: `${creator.score_breakdown.niche_fit}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                <span>Age Suitability</span>
                                                <span>{creator.score_breakdown.age_fit}%</span>
                                            </div>
                                            <div className="w-full bg-neo-black/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-neo-blue h-full rounded-full"
                                                    style={{ width: `${creator.score_breakdown.age_fit}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                <span>ROI Multiplier</span>
                                                <span className="text-neo-purple font-black">{creator.predicted_roi}x</span>
                                            </div>
                                            <div className="w-full bg-neo-black/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-neo-purple h-full rounded-full"
                                                    style={{ width: `${creator.score_breakdown.roi_score}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                <span>Brand Safety</span>
                                                <span className="text-emerald-700 font-black">{creator.score_breakdown.safety_score}%</span>
                                            </div>
                                            <div className="w-full bg-neo-black/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full"
                                                    style={{ width: `${creator.score_breakdown.safety_score}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                <span>Budget Fit</span>
                                                <span>{creator.score_breakdown.budget_fit}%</span>
                                            </div>
                                            <div className="w-full bg-neo-black/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-neo-yellow h-full rounded-full"
                                                    style={{ width: `${creator.score_breakdown.budget_fit}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Strategy Reasoning */}
                                    <div className="p-4 bg-neo-yellow/15 rounded-2xl neo-border flex items-start gap-3">
                                        <Sparkles size={18} className="text-neo-pink shrink-0 mt-0.5" />
                                        <div className="text-xs font-bold text-neo-black/90 leading-relaxed">
                                            <span className="font-black text-neo-black uppercase mr-1">
                                                AI Strategy Fit:
                                            </span>
                                            {creator.recommendation_reasoning}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                                        <Link
                                            href={`/dashboard/influencer/${creator.id}`}
                                            className="neo-btn bg-neo-white text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
                                        >
                                            <Info size={14} /> Full Audit
                                        </Link>

                                        <Link
                                            href={`/dashboard/brief`}
                                            className="neo-btn bg-neo-lavender text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
                                        >
                                            <FileText size={14} /> Generate Brief
                                        </Link>

                                        <Link
                                            href={`/dashboard/campaigns`}
                                            className="neo-btn bg-neo-yellow text-neo-black px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
                                        >
                                            <Megaphone size={14} /> Add to Campaign <ArrowUpRight size={14} />
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
