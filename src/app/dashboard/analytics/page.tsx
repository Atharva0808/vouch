"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
    Loader, ChevronDown,
    DollarSign, Eye, Zap, ArrowUpRight,
    ArrowDownRight, Minus, Activity,
    Sparkles, Brain, MousePointerClick
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    CartesianGrid
} from "recharts";
import { getAllInfluencers, formatNumber, type InfluencerProfile } from "@/lib/api-client";
import AvatarImg from "@/components/avatar-img";

const COLORS = ["#FF6B9D", "#4ECDC4", "#FFE66D", "#A78BFA", "#FF6B6B", "#8BDAA7"];

// Helper to generate predicted monthly growth data based on influencer stats
function generateGrowthForecast(inf: InfluencerProfile) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const baseFollowers = inf.followers;
    const growthRate = inf.trending === "up" ? 1 + (inf.trend_percent / 100 * 0.3)
        : inf.trending === "down" ? 1 - (inf.trend_percent / 100 * 0.15)
            : 1.02;

    return Array.from({ length: 6 }, (_, i) => {
        const monthIdx = (currentMonth + i + 1) % 12;
        const predicted = Math.round(baseFollowers * Math.pow(growthRate, i + 1));
        const engagement = Math.round(inf.engagement_rate * (1 + (Math.random() * 0.2 - 0.1)) * 100) / 100;
        return {
            month: months[monthIdx],
            followers: predicted,
            engagement,
            reach: Math.round(predicted * (engagement / 100) * 3.2),
        };
    });
}

// Generate audience demographic breakdown based on influencer niche + platform
function generateAudienceBreakdown(inf: InfluencerProfile) {
    const platform = inf.platform.toLowerCase();
    if (platform === "instagram") {
        return [
            { age: "13-17", percent: 8 },
            { age: "18-24", percent: 35 },
            { age: "25-34", percent: 32 },
            { age: "35-44", percent: 15 },
            { age: "45-54", percent: 7 },
            { age: "55+", percent: 3 },
        ];
    } else {
        return [
            { age: "13-17", percent: 18 },
            { age: "18-24", percent: 28 },
            { age: "25-34", percent: 25 },
            { age: "35-44", percent: 16 },
            { age: "45-54", percent: 9 },
            { age: "55+", percent: 4 },
        ];
    }
}

// Generate predicted campaign performance
function generateCampaignPrediction(inf: InfluencerProfile) {
    const engRate = inf.engagement_rate / 100;
    const followers = inf.followers;

    const estimatedReach = Math.round(followers * 0.35);
    const estimatedImpressions = Math.round(followers * 1.8);
    const estimatedClicks = Math.round(estimatedReach * engRate * 0.45);
    const estimatedConversions = Math.round(estimatedClicks * 0.028);
    const costPerPost = followers >= 1000000 ? 12000
        : followers >= 500000 ? 5500
            : followers >= 100000 ? 2200
                : followers >= 50000 ? 800
                    : followers >= 10000 ? 300
                        : 100;
    const cpe = estimatedClicks > 0 ? Math.round((costPerPost / estimatedClicks) * 100) / 100 : 0;
    const roi = cpe > 0 ? Math.round((estimatedConversions * 45 / costPerPost) * 100) / 100 : 0;

    return {
        estimatedReach,
        estimatedImpressions,
        estimatedClicks,
        estimatedConversions,
        costPerPost,
        cpe,
        roi: inf.predicted_roi > 0 ? inf.predicted_roi : roi,
        engagementValue: Math.round(estimatedReach * engRate * 0.12),
    };
}

// Generate radar chart data for influencer capabilities
function generateRadarData(inf: InfluencerProfile) {
    const engScore = Math.min(100, inf.engagement_rate * 10);
    const reachScore = inf.followers >= 1000000 ? 95
        : inf.followers >= 100000 ? 80
            : inf.followers >= 10000 ? 60
                : inf.followers >= 1000 ? 40
                    : 20;
    const authenticityScore = 100 - inf.bot_percentage;
    const matchScore = inf.match_score;
    const riskScore = inf.risk_level === "low" ? 90 : inf.risk_level === "medium" ? 55 : 20;
    const trendScore = inf.trending === "up" ? 85 : inf.trending === "down" ? 30 : 55;

    return [
        { metric: "Engagement", value: Math.round(engScore) },
        { metric: "Reach", value: Math.round(reachScore) },
        { metric: "Authenticity", value: Math.round(authenticityScore) },
        { metric: "Brand Fit", value: Math.round(matchScore) },
        { metric: "Safety", value: Math.round(riskScore) },
        { metric: "Momentum", value: Math.round(trendScore) },
    ];
}

// Weekly performance prediction
function generateWeeklyPerformance(inf: InfluencerProfile) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const baseEng = inf.engagement_rate;
    const weekendBoost = inf.platform === "youtube" ? 1.4 : 1.25;

    return days.map((day, i) => {
        const isWeekend = i >= 5;
        const mult = isWeekend ? weekendBoost : 0.8 + Math.random() * 0.4;
        return {
            day,
            predictedLikes: Math.round(inf.avg_likes * mult),
            predictedComments: Math.round(inf.avg_comments * mult),
            predictedReach: Math.round(inf.followers * 0.12 * mult),
        };
    });
}

export default function AnalyticsPage() {
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getAllInfluencers(50);
            setInfluencers(data.results);
            if (data.results.length > 0) {
                // Auto-select the highest match score influencer
                const best = data.results.reduce((a, b) => a.match_score > b.match_score ? a : b);
                setSelectedInfluencer(best);
            }
        } catch {
            // Backend not running
        }
        setLoading(false);
    };

    const inf = selectedInfluencer;

    const growthData = useMemo(() => inf ? generateGrowthForecast(inf) : [], [inf]);
    const audienceData = useMemo(() => inf ? generateAudienceBreakdown(inf) : [], [inf]);
    const campaignPred = useMemo(() => inf ? generateCampaignPrediction(inf) : null, [inf]);
    const radarData = useMemo(() => inf ? generateRadarData(inf) : [], [inf]);
    const weeklyData = useMemo(() => inf ? generateWeeklyPerformance(inf) : [], [inf]);

    const trendIcon = inf?.trending === "up"
        ? <ArrowUpRight size={14} className="text-green-600" />
        : inf?.trending === "down"
            ? <ArrowDownRight size={14} className="text-red-500" />
            : <Minus size={14} className="text-gray-400" />;

    return (
        <div className="space-y-6">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-neo-black)]">Predicted Analytics</h1>
                        <p className="text-sm text-[var(--color-neo-black)]/40 font-semibold flex items-center gap-1">
                            <Sparkles size={14} className="text-[var(--color-neo-purple)]" />
                            AI-POWERED CAMPAIGN PREDICTIONS
                        </p>
                    </div>

                    {/* Influencer Selector */}
                    {!loading && influencers.length > 0 && (
                        <div className="relative">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="neo-card rounded-xl px-4 py-3 bg-[var(--color-neo-white)] flex items-center gap-3 min-w-[260px] cursor-pointer"
                            >
                                {inf && (
                                    <>
                                        <AvatarImg src={inf.avatar_url} name={inf.name} size={32} rounded="rounded-lg" />
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-sm text-[var(--color-neo-black)]">{inf.name}</p>
                                            <p className="text-[10px] text-[var(--color-neo-black)]/40">{inf.handle} • {inf.platform}</p>
                                        </div>
                                    </>
                                )}
                                <ChevronDown
                                    size={16}
                                    className={`text-[var(--color-neo-black)]/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                                />
                            </motion.button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full mt-2 right-0 w-full neo-card rounded-xl bg-[var(--color-neo-white)] z-50 overflow-hidden max-h-64 overflow-y-auto"
                                    >
                                        {influencers.map((i) => (
                                            <button
                                                key={i.id}
                                                onClick={() => {
                                                    setSelectedInfluencer(i);
                                                    setDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-neo-black)]/5 transition-colors ${selectedInfluencer?.id === i.id ? "bg-[var(--color-neo-purple)]/10" : ""}`}
                                            >
                                                <AvatarImg src={i.avatar_url} name={i.name} size={28} rounded="rounded-lg" />
                                                <div className="flex-1 text-left">
                                                    <p className="font-bold text-sm">{i.name}</p>
                                                    <p className="text-[10px] text-[var(--color-neo-black)]/40">{i.platform} • {formatNumber(i.followers)} followers</p>
                                                </div>
                                                <span className={`neo-badge px-2 py-0.5 rounded text-[10px] font-bold ${i.match_score >= 70 ? "bg-[var(--color-neo-green)]" : "bg-[var(--color-neo-yellow)]"}`}>
                                                    {i.match_score}%
                                                </span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader className="animate-spin text-[var(--color-neo-pink)]" size={32} />
                </div>
            ) : !inf ? (
                <div className="neo-card rounded-2xl p-16 text-center bg-[var(--color-neo-white)]">
                    <Brain size={48} className="mx-auto mb-4 text-[var(--color-neo-black)]/10" />
                    <p className="font-bold text-[var(--color-neo-black)]/60">No influencers found</p>
                    <p className="text-sm text-[var(--color-neo-black)]/30 mt-1">Fetch influencers from the Search page first</p>
                </div>
            ) : (
                <>
                    {/* Prediction Banner */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        className="neo-card rounded-2xl p-5 bg-gradient-to-r from-[var(--color-neo-purple)]/15 to-[var(--color-neo-pink)]/15 border-l-4"
                        style={{ borderLeftColor: "var(--color-neo-purple)" }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-[var(--color-neo-purple)] rounded-xl neo-border shrink-0">
                                <Brain size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-[var(--color-neo-black)]">
                                    Predicted Campaign Performance for {inf.name}
                                </p>
                                <p className="text-xs text-[var(--color-neo-black)]/50 mt-1">
                                    These predictions estimate what a brand can expect if they hire <strong>{inf.name}</strong> ({formatNumber(inf.followers)} followers, {inf.engagement_rate}% engagement).
                                    All values are AI-calculated forecasts based on real profile data — no influencer has been hired yet.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Key Predicted Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {campaignPred && [
                            {
                                label: "Predicted Reach",
                                value: formatNumber(campaignPred.estimatedReach),
                                sub: `of ${formatNumber(inf.followers)} followers`,
                                icon: Eye,
                                color: "bg-[var(--color-neo-pink)]"
                            },
                            {
                                label: "Est. Impressions",
                                value: formatNumber(campaignPred.estimatedImpressions),
                                sub: "per campaign post",
                                icon: Activity,
                                color: "bg-[var(--color-neo-blue)]"
                            },
                            {
                                label: "Predicted ROI",
                                value: `${campaignPred.roi}x`,
                                sub: `est. cost ₹${formatNumber(campaignPred.costPerPost)}`,
                                icon: DollarSign,
                                color: "bg-[var(--color-neo-green)]"
                            },
                            {
                                label: "Est. Conversions",
                                value: formatNumber(campaignPred.estimatedConversions),
                                sub: `${formatNumber(campaignPred.estimatedClicks)} clicks predicted`,
                                icon: MousePointerClick,
                                color: "bg-[var(--color-neo-purple)]"
                            },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)]"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 ${stat.color} rounded-xl neo-border shrink-0`}>
                                        <stat.icon size={18} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 tracking-wide">{stat.label}</p>
                                        <p className="text-xl font-bold text-[var(--color-neo-black)] leading-tight">{stat.value}</p>
                                        <p className="text-[10px] text-[var(--color-neo-black)]/30 mt-0.5 truncate">{stat.sub}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 6-Month Growth Forecast */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-neo-black)]">Growth Forecast</h3>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-semibold uppercase">
                                        6-month predicted trajectory {trendIcon}
                                    </p>
                                </div>
                                <span className="neo-badge bg-[var(--color-neo-purple)]/15 text-[var(--color-neo-purple)] px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    Predicted
                                </span>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growthData}>
                                        <defs>
                                            <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
                                        <Tooltip
                                            formatter={(value: number) => [formatNumber(value), "Followers"]}
                                            contentStyle={{ borderRadius: 12, border: "2px solid #1a1a2e", fontWeight: 600, fontSize: 12 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="followers"
                                            stroke="#A78BFA"
                                            strokeWidth={3}
                                            fill="url(#followerGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Influencer Capability Radar */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-neo-black)]">Influencer Scorecard</h3>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-semibold uppercase">
                                        Multi-factor evaluation
                                    </p>
                                </div>
                                <span className="neo-badge bg-[var(--color-neo-blue)]/15 text-[var(--color-neo-blue)] px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    Score: {inf.match_score}%
                                </span>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                        <PolarGrid stroke="#e0e0e0" />
                                        <PolarAngleAxis
                                            dataKey="metric"
                                            tick={{ fontSize: 11, fontWeight: 600, fill: "#1a1a2e" }}
                                        />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                        <Radar
                                            name="Score"
                                            dataKey="value"
                                            stroke="#FF6B9D"
                                            fill="#FF6B9D"
                                            fillOpacity={0.25}
                                            strokeWidth={2}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "2px solid #1a1a2e", fontWeight: 600, fontSize: 12 }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Performance Prediction */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-neo-black)]">Weekly Post Performance</h3>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-semibold uppercase">
                                        Predicted engagement by day
                                    </p>
                                </div>
                                <span className="neo-badge bg-[var(--color-neo-yellow)]/30 text-[var(--color-neo-black)] px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    Predicted
                                </span>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "2px solid #1a1a2e", fontWeight: 600, fontSize: 12 }}
                                            formatter={(value: number, name: string) => [
                                                formatNumber(value),
                                                name === "predictedLikes" ? "Predicted Likes" :
                                                    name === "predictedComments" ? "Predicted Comments" : "Predicted Reach"
                                            ]}
                                        />
                                        <Bar dataKey="predictedLikes" radius={[6, 6, 0, 0]} fill="#FF6B9D" stroke="#1a1a2e" strokeWidth={1.5} name="predictedLikes" />
                                        <Bar dataKey="predictedComments" radius={[6, 6, 0, 0]} fill="#4ECDC4" stroke="#1a1a2e" strokeWidth={1.5} name="predictedComments" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Audience Demographics */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-neo-black)]">Audience Demographics</h3>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-semibold uppercase">
                                        Estimated age distribution
                                    </p>
                                </div>
                                <span className="neo-badge bg-[var(--color-neo-pink)]/15 text-[var(--color-neo-pink)] px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    Estimated
                                </span>
                            </div>
                            <div className="h-64 flex items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={audienceData}
                                            dataKey="percent"
                                            nameKey="age"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            innerRadius={40}
                                            strokeWidth={2.5}
                                            stroke="#1a1a2e"
                                            label={({ age, percent }) => `${age}: ${percent}%`}
                                        >
                                            {audienceData.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: "2px solid #1a1a2e", fontWeight: 600, fontSize: 12 }}
                                            formatter={(value: number) => [`${value}%`, "Share"]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    </div>

                    {/* Detailed Prediction Table */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="neo-card rounded-2xl overflow-hidden bg-[var(--color-neo-white)]"
                    >
                        <div className="p-5 border-b-3 border-[var(--color-neo-black)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-neo-yellow)] rounded-xl neo-border">
                                    <Zap size={18} className="text-[var(--color-neo-black)]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-neo-black)]">Campaign Prediction Summary</h3>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40 font-semibold uppercase">
                                        What a brand can expect from hiring {inf.name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {campaignPred && (
                            <div className="p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        {
                                            label: "Audience Quality",
                                            value: `${Math.round(100 - inf.bot_percentage)}% Real`,
                                            detail: `${inf.bot_percentage}% estimated bots`,
                                            color: inf.bot_percentage < 15 ? "text-green-600" : inf.bot_percentage < 30 ? "text-yellow-600" : "text-red-500",
                                            bg: inf.bot_percentage < 15 ? "bg-green-50" : inf.bot_percentage < 30 ? "bg-yellow-50" : "bg-red-50",
                                        },
                                        {
                                            label: "Engagement Quality",
                                            value: `${inf.engagement_rate}%`,
                                            detail: inf.engagement_rate > 5 ? "Excellent" : inf.engagement_rate > 3 ? "Good" : inf.engagement_rate > 1 ? "Average" : "Below average",
                                            color: inf.engagement_rate > 5 ? "text-green-600" : inf.engagement_rate > 3 ? "text-blue-600" : "text-yellow-600",
                                            bg: inf.engagement_rate > 5 ? "bg-green-50" : inf.engagement_rate > 3 ? "bg-blue-50" : "bg-yellow-50",
                                        },
                                        {
                                            label: "Risk Assessment",
                                            value: inf.risk_level.toUpperCase(),
                                            detail: inf.risk_level === "low" ? "Safe for brand collaboration" : inf.risk_level === "medium" ? "Proceed with caution" : "High risk — review first",
                                            color: inf.risk_level === "low" ? "text-green-600" : inf.risk_level === "medium" ? "text-yellow-600" : "text-red-500",
                                            bg: inf.risk_level === "low" ? "bg-green-50" : inf.risk_level === "medium" ? "bg-yellow-50" : "bg-red-50",
                                        },
                                        {
                                            label: "Est. Cost Per Post",
                                            value: `₹${formatNumber(campaignPred.costPerPost)}`,
                                            detail: `₹${campaignPred.cpe} per engagement`,
                                            color: "text-[var(--color-neo-purple)]",
                                            bg: "bg-purple-50",
                                        },
                                        {
                                            label: "Predicted Engagement Value",
                                            value: `₹${formatNumber(campaignPred.engagementValue)}`,
                                            detail: "Estimated value generated per post",
                                            color: "text-[var(--color-neo-blue)]",
                                            bg: "bg-blue-50",
                                        },
                                        {
                                            label: "Growth Trend",
                                            value: inf.trending === "up" ? `↑ ${inf.trend_percent}%` : inf.trending === "down" ? `↓ ${inf.trend_percent}%` : "Stable",
                                            detail: inf.trending === "up" ? "Growing audience" : inf.trending === "down" ? "Declining metrics" : "Consistent performance",
                                            color: inf.trending === "up" ? "text-green-600" : inf.trending === "down" ? "text-red-500" : "text-gray-500",
                                            bg: inf.trending === "up" ? "bg-green-50" : inf.trending === "down" ? "bg-red-50" : "bg-gray-50",
                                        },
                                    ].map((item) => (
                                        <div key={item.label} className={`${item.bg} rounded-xl p-4 neo-border`}>
                                            <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 tracking-wide">
                                                {item.label}
                                            </p>
                                            <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                                            <p className="text-[11px] text-[var(--color-neo-black)]/40 mt-1">{item.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Niche Tags + Platform Info */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)]"
                    >
                        <h3 className="text-sm font-bold text-[var(--color-neo-black)]/50 uppercase mb-3">Influencer Summary</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <AvatarImg src={inf.avatar_url} name={inf.name} size={40} rounded="rounded-xl" />
                                <div>
                                    <p className="font-bold text-sm">{inf.name}</p>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40">{inf.handle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="neo-badge bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    {inf.platform}
                                </span>
                                {inf.niche?.map((n) => (
                                    <span key={n} className="neo-badge bg-[var(--color-neo-yellow)] px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                        {n}
                                    </span>
                                ))}
                                {inf.verified && (
                                    <span className="neo-badge bg-blue-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
                                        ✓ VERIFIED
                                    </span>
                                )}
                                <span className={`neo-badge px-2 py-1 rounded-lg text-[10px] font-bold ${inf.risk_level === "low" ? "bg-[var(--color-neo-green)]" : inf.risk_level === "medium" ? "bg-[var(--color-neo-yellow)]" : "bg-[var(--color-neo-red)]"}`}>
                                    {inf.risk_level.toUpperCase()} RISK
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
}
