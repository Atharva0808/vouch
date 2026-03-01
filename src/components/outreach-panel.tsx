"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { IndianRupee, Send, Copy, Check, Loader, Sparkles, TrendingUp } from "lucide-react";
import { getMarketRates, generateOutreachHook } from "@/lib/api-client";

interface MarketRates {
    suggested_price: number;
    range_low: number;
    range_high: number;
    cpm: number;
    platform_benchmark: string;
    confidence: string;
}

interface OutreachHook {
    subject_lines: string[];
    message_hook: string;
    personalization_point: string;
}

export default function OutreachPanel({ influencerId }: { influencerId: string }) {
    const [rates, setRates] = useState<MarketRates | null>(null);
    const [hook, setHook] = useState<OutreachHook | null>(null);
    const [loadingRates, setLoadingRates] = useState(true);
    const [generatingHook, setGeneratingHook] = useState(false);
    const [brandName, setBrandName] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        loadRates();
    }, [influencerId]);

    const loadRates = async () => {
        try {
            const data = await getMarketRates(influencerId);
            setRates(data);
        } catch (err) {
            console.error("Failed to load market rates", err);
        }
        setLoadingRates(false);
    };

    const handleGenerateHook = async () => {
        setGeneratingHook(true);
        try {
            const data = await generateOutreachHook(influencerId, brandName || "Our Brand");
            setHook(data);
        } catch (err) {
            console.error("Failed to generate hook", err);
        }
        setGeneratingHook(false);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-[var(--color-neo-cyan)] neo-border rounded-xl">
                    <IndianRupee size={20} className="text-[var(--color-neo-black)]" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[var(--color-neo-black)] leading-none">PRICING & OUTREACH</h3>
                    <p className="text-[10px] font-bold text-[var(--color-neo-black)]/40 uppercase mt-1">MARKET ESTIMATES • AI HOOKS</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pricing Estimator */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 flex items-center gap-1">
                        <TrendingUp size={12} /> EST. FAIR MARKET RATE
                    </h4>

                    {loadingRates ? (
                        <div className="h-24 flex items-center justify-center bg-[var(--color-neo-black)]/5 rounded-xl animate-pulse">
                            <Loader size={20} className="animate-spin text-[var(--color-neo-black)]/20" />
                        </div>
                    ) : rates ? (
                        <div className="bg-gradient-to-br from-[var(--color-neo-white)] to-[var(--color-neo-cream)] neo-border rounded-2xl p-4 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-3xl font-bold text-[var(--color-neo-black)]">
                                    ₹{rates.suggested_price.toLocaleString('en-IN')}
                                    <span className="text-sm font-normal text-[var(--color-neo-black)]/40 ml-2">/ post</span>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-2 flex-1 bg-[var(--color-neo-black)]/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--color-neo-cyan)] w-[70%]" />
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--color-neo-black)]/60">
                                        RANGE: ₹{rates.range_low.toLocaleString('en-IN')} - ₹{rates.range_high.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40">
                                    <span>CPM: ₹{rates.cpm}</span>
                                    <span>Benchmark: {rates.platform_benchmark}</span>
                                    <span className={`px-2 py-0.5 rounded ${rates.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        Conf: {rates.confidence}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-neo-black)]/40">Pricing data unavailable</p>
                    )}
                </div>

                {/* AI Outreach Hook */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 flex items-center gap-1">
                        <Sparkles size={12} /> AI OUTREACH HOOK
                    </h4>

                    {!hook && !generatingHook ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Your brand name (e.g. Nike)"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                className="neo-input w-full py-2 px-3 text-sm rounded-xl"
                            />
                            <button
                                onClick={handleGenerateHook}
                                className="neo-btn w-full bg-[var(--color-neo-purple)] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} /> GENERATE PERSONALIZED HOOK
                            </button>
                        </div>
                    ) : generatingHook ? (
                        <div className="h-32 flex flex-col items-center justify-center bg-[var(--color-neo-black)]/5 rounded-xl border-2 border-dashed border-[var(--color-neo-black)]/10 text-center p-4">
                            <Loader size={20} className="animate-spin text-[var(--color-neo-purple)] mb-2" />
                            <p className="text-xs font-bold text-[var(--color-neo-black)]/40 animate-pulse">Personalizing outreach based on their style...</p>
                        </div>
                    ) : hook ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-[var(--color-neo-lavender)]/20 neo-border rounded-xl">
                                <p className="text-xs font-bold text-[var(--color-neo-black)]/40 mb-1 flex items-center justify-between">
                                    SUBJECT LINES:
                                    <button onClick={() => setHook(null)} className="text-[var(--color-neo-pink)] hover:underline">RESET</button>
                                </p>
                                <div className="space-y-1">
                                    {hook.subject_lines.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/50 p-2 rounded-lg group">
                                            <span className="text-xs italic truncate mr-2">"{s}"</span>
                                            <button onClick={() => copyToClipboard(s, `s-${i}`)} className="text-[var(--color-neo-black)]/40 hover:text-[var(--color-neo-black)]">
                                                {copied === `s-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold text-[var(--color-neo-black)]/60 mt-2 uppercase">🎯 Hook:</p>
                                <div className="relative group">
                                    <p className="text-xs text-[var(--color-neo-black)] leading-relaxed bg-white/80 p-3 rounded-xl mt-1 border border-dashed border-[var(--color-neo-purple)]/30 italic">
                                        "{hook.message_hook}"
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(hook.message_hook, 'hook')}
                                        className="absolute right-2 top-2 p-1.5 bg-white neo-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {copied === 'hook' ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-[var(--color-neo-purple)] font-bold uppercase mt-2">
                                    AI-PERSONALIZED VIA: {hook.personalization_point}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
