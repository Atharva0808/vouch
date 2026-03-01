"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeftRight, Loader, Trophy } from "lucide-react";
import { getAllInfluencers, compareInfluencers, formatNumber, type InfluencerProfile } from "@/lib/api-client";
import AvatarImg from "@/components/avatar-img";

export default function ComparePage() {
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");
    const [comparison, setComparison] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadInfluencers();
    }, []);

    const loadInfluencers = async () => {
        try {
            const data = await getAllInfluencers(50);
            setInfluencers(data.results);
            if (data.results.length >= 2) {
                setIdA(data.results[0].id);
                setIdB(data.results[1].id);
            }
        } catch {
            // Backend not ready
        }
    };

    const handleCompare = async () => {
        if (!idA || !idB) return;
        setLoading(true);
        try {
            const result = await compareInfluencers(idA, idB);
            setComparison(result);
        } catch (err: any) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (idA && idB) handleCompare();
    }, [idA, idB]);

    return (
        <div className="space-y-6">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-2xl font-bold text-[var(--color-neo-black)]">Competitor Benchmarking</h1>
                <p className="text-sm text-[var(--color-neo-black)]/40 font-semibold">SIDE-BY-SIDE COMPARISON • REAL DATA</p>
            </motion.div>

            {/* Selector */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
            >
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">INFLUENCER A</label>
                        <select value={idA} onChange={(e) => setIdA(e.target.value)} className="neo-input w-full py-3 px-4 rounded-xl text-sm">
                            <option value="">Select influencer...</option>
                            {influencers.map((inf) => (
                                <option key={inf.id} value={inf.id}>{inf.name} ({inf.handle})</option>
                            ))}
                        </select>
                    </div>
                    <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="p-3 bg-[var(--color-neo-pink)] neo-border rounded-full mt-5"
                    >
                        <ArrowLeftRight size={18} className="text-white" />
                    </motion.div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">INFLUENCER B</label>
                        <select value={idB} onChange={(e) => setIdB(e.target.value)} className="neo-input w-full py-3 px-4 rounded-xl text-sm">
                            <option value="">Select influencer...</option>
                            {influencers.map((inf) => (
                                <option key={inf.id} value={inf.id}>{inf.name} ({inf.handle})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-8">
                    <Loader className="animate-spin text-[var(--color-neo-pink)]" size={32} />
                </div>
            )}

            {/* Comparison Results */}
            {comparison && !loading && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                    {/* Header Row */}
                    <div className="neo-card rounded-2xl bg-[var(--color-neo-white)] overflow-hidden">
                        <div className="grid grid-cols-3 border-b-3 border-[var(--color-neo-black)]">
                            <div className="p-4 bg-[var(--color-neo-pink)]/20 flex items-center gap-3">
                                <AvatarImg src={comparison.influencer_a.avatar_url} name={comparison.influencer_a.name} size={40} rounded="rounded-xl" />
                                <div>
                                    <p className="font-bold text-sm">{comparison.influencer_a.name}</p>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40">{comparison.influencer_a.handle}</p>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-[var(--color-neo-black)]/5">
                                <span className="text-xs font-bold uppercase text-[var(--color-neo-black)]/30">METRIC</span>
                            </div>
                            <div className="p-4 bg-[var(--color-neo-blue)]/20 flex items-center gap-3 justify-end">
                                <div className="text-right">
                                    <p className="font-bold text-sm">{comparison.influencer_b.name}</p>
                                    <p className="text-[10px] text-[var(--color-neo-black)]/40">{comparison.influencer_b.handle}</p>
                                </div>
                                <AvatarImg src={comparison.influencer_b.avatar_url} name={comparison.influencer_b.name} size={40} rounded="rounded-xl" />
                            </div>
                        </div>

                        {/* Metrics */}
                        {comparison.metrics.map((metric: any, i: number) => (
                            <div key={i} className="grid grid-cols-3 border-b border-[var(--color-neo-black)]/10">
                                <div className={`p-4 text-center ${metric.winner === "a" ? "bg-[var(--color-neo-green)]/10" : ""}`}>
                                    <span className="font-bold text-sm">
                                        {metric.winner === "a" && "✓ "}{metric.value_a}
                                    </span>
                                </div>
                                <div className="p-4 text-center bg-[var(--color-neo-black)]/3">
                                    <span className="text-xs font-bold text-[var(--color-neo-black)]/50">{metric.label}</span>
                                </div>
                                <div className={`p-4 text-center ${metric.winner === "b" ? "bg-[var(--color-neo-green)]/10" : ""}`}>
                                    <span className="font-bold text-sm">
                                        {metric.winner === "b" && "✓ "}{metric.value_b}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recommendation */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="neo-card rounded-2xl p-6 bg-[var(--color-neo-yellow)]"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy size={18} className="text-[var(--color-neo-black)]" />
                            <h3 className="font-bold text-[var(--color-neo-black)]">AI Recommendation</h3>
                        </div>
                        <p className="text-sm text-[var(--color-neo-black)]/80">{comparison.recommendation}</p>
                    </motion.div>
                </motion.div>
            )}

            {/* Empty State */}
            {influencers.length < 2 && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card rounded-2xl p-12 bg-[var(--color-neo-white)] text-center">
                    <ArrowLeftRight size={48} className="mx-auto mb-4 text-[var(--color-neo-black)]/10" />
                    <h3 className="text-lg font-bold text-[var(--color-neo-black)] mb-2">Need at least 2 influencers</h3>
                    <p className="text-sm text-[var(--color-neo-black)]/50">Fetch at least 2 influencers from the Search page to compare them.</p>
                </motion.div>
            )}
        </div>
    );
}
