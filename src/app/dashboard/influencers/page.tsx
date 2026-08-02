"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, Loader, RefreshCw, Trash2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import AvatarImg from "@/components/avatar-img";
import { getAllInfluencers, deleteInfluencer, clearAllInfluencers, formatNumber, type InfluencerProfile } from "@/lib/api-client";

export default function InfluencersPage() {
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        loadInfluencers();
    }, []);

    const loadInfluencers = async () => {
        setLoading(true);
        try {
            const data = await getAllInfluencers(50);
            setInfluencers(data.results);
        } catch {
            // Backend not running
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this influencer and all their data?")) return;
        setDeleting(id);
        try {
            await deleteInfluencer(id);
            setInfluencers((prev) => prev.filter((inf) => inf.id !== id));
        } catch (err: any) {
            alert(err.message || "Failed to delete");
        }
        setDeleting(null);
    };

    const handleClearAll = async () => {
        setClearing(true);
        try {
            await clearAllInfluencers();
            setInfluencers([]);
            setShowClearConfirm(false);
        } catch (err: any) {
            alert(err.message || "Failed to clear");
        }
        setClearing(false);
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
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-neo-black)] uppercase tracking-tight">Vouch Collection</h1>
                </div>
                <div className="flex gap-3">
                    {influencers.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowClearConfirm(true)}
                            className="neo-btn bg-[var(--color-neo-red)]/10 text-red-600 p-3 rounded-xl"
                            title="Clear All"
                        >
                            <Trash2 size={16} />
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={loadInfluencers}
                        className="neo-btn bg-[var(--color-neo-white)] p-3 rounded-xl"
                    >
                        <RefreshCw size={16} />
                    </motion.button>
                    <Link href="/dashboard/search">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="neo-btn bg-[var(--color-neo-pink)] text-[var(--color-neo-white)] px-4 py-2 rounded-xl text-sm font-semibold"
                        >
                            + Fetch New
                        </motion.button>
                    </Link>
                </div>
            </motion.div>

            {/* Clear All Confirmation */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="neo-card rounded-2xl p-5 bg-[var(--color-neo-red)]/5 border-l-4 border-[var(--color-neo-red)]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={24} className="text-red-600" />
                                <div>
                                    <p className="font-bold text-red-700">Delete ALL influencers?</p>
                                    <p className="text-xs text-red-600/70">This will permanently delete all {influencers.length} influencers and their analysis data.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowClearConfirm(false)}
                                    className="neo-btn bg-[var(--color-neo-white)] px-4 py-2 rounded-xl text-sm"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleClearAll}
                                    disabled={clearing}
                                    className="neo-btn bg-[var(--color-neo-red)] text-white px-4 py-2 rounded-xl text-sm font-bold"
                                >
                                    {clearing ? "Deleting..." : "Yes, Delete All"}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader className="animate-spin text-[var(--color-neo-pink)]" size={32} />
                </div>
            ) : influencers.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card rounded-2xl p-12 bg-[var(--color-neo-white)] text-center">
                    <Users size={48} className="mx-auto mb-4 text-[var(--color-neo-black)]/10" />
                    <h3 className="text-lg font-bold text-[var(--color-neo-black)] mb-2">No Influencers Yet</h3>
                    <p className="text-sm text-[var(--color-neo-black)]/50 max-w-md mx-auto mb-6">
                        Head to the Search page to fetch real influencer data from Instagram or YouTube.
                    </p>
                    <Link href="/dashboard/search">
                        <motion.button whileHover={{ scale: 1.03 }} className="neo-btn bg-[var(--color-neo-pink)] text-[var(--color-neo-white)] px-6 py-3 rounded-xl text-sm font-semibold">
                            Fetch Your First Influencer
                        </motion.button>
                    </Link>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {influencers.map((inf, i) => (
                        <motion.div
                            key={inf.id}
                            initial={{ y: 20, opacity: 0, rotate: -1 }}
                            animate={{ y: 0, opacity: 1, rotate: 0 }}
                            transition={{ delay: i * 0.03, type: "spring" }}
                            whileHover={{ y: -4, rotate: 0.5 }}
                        >
                            <Link href={`/dashboard/influencer/${inf.id}`}>
                                <div className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)] cursor-pointer h-full relative group">
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => handleDelete(inf.id, e)}
                                        className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded-lg z-10"
                                        title="Delete"
                                    >
                                        {deleting === inf.id ? <Loader size={12} className="animate-spin" /> : <X size={12} />}
                                    </button>

                                    <div className="flex items-center gap-3 mb-3">
                                        <AvatarImg src={inf.avatar_url} name={inf.name} handle={inf.handle} platform={inf.platform} size={48}  />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm text-[var(--color-neo-black)] truncate">{inf.name}</h3>
                                            <p className="text-xs text-[var(--color-neo-black)]/40">{inf.handle} • {inf.platform}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 mb-3">
                                        {inf.niche?.slice(0, 3).map((n) => (
                                            <span key={n} className="neo-badge bg-[var(--color-neo-yellow)]/30 px-2 py-0.5 rounded text-[10px]">{n}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="p-2 bg-[var(--color-neo-black)]/3 rounded-lg">
                                            <p className="text-[10px] text-[var(--color-neo-black)]/40 font-bold">FOLLOWERS</p>
                                            <p className="text-sm font-bold">{formatNumber(inf.followers)}</p>
                                        </div>
                                        <div className="bg-[var(--color-neo-white)]/60 p-2 rounded-xl text-center">
                                            <p className="text-[10px] font-bold text-[var(--color-neo-black)]/40 uppercase">Eng.</p>
                                            <p className="font-bold text-sm">
                                                {inf.engagement_rate > 0 ? `${inf.engagement_rate}%` : inf.posts > 0 ? "Calculating" : "New Profile"}
                                            </p>
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
                                        {inf.verified && <span className="text-[10px] text-blue-600 font-bold">✓ VERIFIED</span>}
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

