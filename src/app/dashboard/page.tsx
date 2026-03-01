"use client";

import { motion } from "framer-motion";
import AvatarImg from "@/components/avatar-img";
import { useState, useEffect } from "react";
import { Zap, Users, TrendingUp, Shield, Search, BarChart3, Loader } from "lucide-react";
import Link from "next/link";
import { getAllInfluencers, formatNumber, type InfluencerProfile } from "@/lib/api-client";

export default function DashboardPage() {
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, avgEngagement: 0, lowRisk: 0, avgMatch: 0 });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const data = await getAllInfluencers(10);
            setInfluencers(data.results);

            // Calculate stats from real data
            const total = data.count;
            const avgEng = data.results.length > 0
                ? data.results.reduce((a, b) => a + b.engagement_rate, 0) / data.results.length
                : 0;
            const lowRiskCount = data.results.filter((i) => i.risk_level === "low").length;
            const avgMatch = data.results.length > 0
                ? data.results.reduce((a, b) => a + b.match_score, 0) / data.results.length
                : 0;

            setStats({ total, avgEngagement: Math.round(avgEng * 10) / 10, lowRisk: lowRiskCount, avgMatch: Math.round(avgMatch) });
        } catch {
            // If backend is not running, show empty state
        }
        setLoading(false);
    };

    const statCards = [
        { label: "Audited Influencers", value: stats.total, icon: Users, color: "bg-[var(--color-neo-pink)]" },
        { label: "Avg Engagement", value: `${stats.avgEngagement}%`, icon: TrendingUp, color: "bg-[var(--color-neo-blue)]" },
        { label: "Low Risk", value: stats.lowRisk, icon: Shield, color: "bg-[var(--color-neo-green)]" },
        { label: "Avg Match Score", value: `${stats.avgMatch}%`, icon: BarChart3, color: "bg-[var(--color-neo-purple)]" },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <motion.div
                initial={{ y: -30, opacity: 0, rotate: -1 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="neo-card rounded-2xl p-8 bg-gradient-to-r from-[var(--color-neo-pink)] to-[var(--color-neo-purple)] text-neo-black relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={24} className="text-[var(--color-neo-yellow)]" />
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Welcome to Vouch</h1>
                    </div>
                    <p className="text-neo-black/70 text-sm max-w-lg font-bold uppercase tracking-tight">
                        Validate raw data from Instagram and YouTube — giving you the unfiltered truth on engagement and risk.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Link href="/dashboard/search">
                            <motion.button
                                whileHover={{ scale: 1.03, rotate: 0.5 }}
                                whileTap={{ scale: 0.97 }}
                                className="neo-btn bg-[var(--color-neo-yellow)] text-[var(--color-neo-black)] px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                            >
                                <Search size={16} /> Fetch Influencer
                            </motion.button>
                        </Link>
                        <Link href="/dashboard/analytics">
                            <motion.button
                                whileHover={{ scale: 1.03, rotate: -0.5 }}
                                whileTap={{ scale: 0.97 }}
                                className="neo-btn bg-[var(--color-neo-white)] text-[var(--color-neo-black)] px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                            >
                                <BarChart3 size={16} /> View Analytics
                            </motion.button>
                        </Link>
                    </div>
                </div>

                {/* Floating shapes */}
                <motion.div
                    animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute right-10 top-4 w-20 h-20 rounded-xl neo-border bg-[var(--color-neo-yellow)]/30 -rotate-12"
                />
                <motion.div
                    animate={{ y: [5, -5, 5], rotate: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute right-36 bottom-4 w-14 h-14 rounded-full neo-border bg-[var(--color-neo-blue)]/20"
                />
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ y: 30, opacity: 0, rotate: (i % 2 === 0 ? -1 : 1) }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, type: "spring" }}
                        whileHover={{ y: -4, rotate: (i % 2 === 0 ? 0.5 : -0.5), scale: 1.02 }}
                        className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)] cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${stat.color} rounded-xl neo-border`}>
                                <stat.icon size={20} className="text-[var(--color-neo-white)]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-bold text-[var(--color-neo-black)]">
                                    {loading ? "—" : stat.value}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions + Top Influencers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                >
                    <h3 className="text-lg font-bold text-[var(--color-neo-black)] mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Fetch Influencer", href: "/dashboard/search", color: "bg-[var(--color-neo-pink)]" },
                            { label: "Compare", href: "/dashboard/compare", color: "bg-[var(--color-neo-blue)]" },
                            { label: "Campaign Brief", href: "/dashboard/brief", color: "bg-[var(--color-neo-lavender)]" },
                            { label: "Risk Monitor", href: "/dashboard/risks", color: "bg-[var(--color-neo-yellow)]" },
                            { label: "Reports", href: "/dashboard/reports", color: "bg-[var(--color-neo-green)]" },
                        ].map((action) => (
                            <Link key={action.label} href={action.href}>
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`${action.color} p-4 rounded-xl neo-border text-center cursor-pointer`}
                                >
                                    <p className="text-sm font-bold text-[var(--color-neo-black)]">{action.label}</p>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Top Influencers from DB */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                >
                    <h3 className="text-lg font-bold text-[var(--color-neo-black)] mb-4">
                        Recent Audits
                    </h3>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader className="animate-spin text-[var(--color-neo-pink)]" />
                        </div>
                    ) : influencers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users size={32} className="mx-auto mb-3 text-[var(--color-neo-black)]/10" />
                            <p className="text-sm font-bold text-[var(--color-neo-black)]/50">No influencers yet</p>
                            <p className="text-xs text-[var(--color-neo-black)]/30 mt-1">
                                Go to Search to fetch your first influencer
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {influencers.slice(0, 5).map((inf, i) => (
                                <Link key={inf.id} href={`/dashboard/influencer/${inf.id}`}>
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-neo-black)]/3 cursor-pointer"
                                    >
                                        <AvatarImg src={inf.avatar_url} name={inf.name} size={32} rounded="rounded-lg" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{inf.name}</p>
                                            <p className="text-[10px] text-[var(--color-neo-black)]/40">{inf.handle} • {inf.platform}</p>
                                        </div>
                                        <span className="text-sm font-bold text-[var(--color-neo-pink)]">{inf.match_score}%</span>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
