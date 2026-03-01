"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Copy, Check, FileText, User, Briefcase, Target, Loader } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateBrief, getAllInfluencers, type InfluencerProfile } from "@/lib/api-client";

export default function BriefPage() {
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [brandName, setBrandName] = useState("");
    const [brandNiche, setBrandNiche] = useState("");
    const [objective, setObjective] = useState("");
    const [budget, setBudget] = useState("");
    const [brief, setBrief] = useState("");
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadInfluencers();
    }, []);

    const loadInfluencers = async () => {
        try {
            const data = await getAllInfluencers(50);
            setInfluencers(data.results);
        } catch {
            // Backend not running
        }
    };

    const handleGenerate = async () => {
        if (!selectedId || !brandName || !objective) return;
        setGenerating(true);
        setError("");
        setBrief("");

        try {
            const result = await generateBrief({
                influencer_id: selectedId,
                brand_name: brandName,
                campaign_objective: objective,
                brand_niche: brandNiche,
                budget: budget ? parseFloat(budget) : undefined,
            });
            setBrief(result.brief);
        } catch (err: any) {
            setError(err.message || "Failed to generate brief");
        }
        setGenerating(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(brief);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-2xl font-bold text-[var(--color-neo-black)] uppercase tracking-tight">Campaign Brief Generator</h1>
                <p className="text-sm text-[var(--color-neo-black)]/40 font-semibold uppercase">
                    Validation Driven Strategy
                </p>
            </motion.div>

            {/* Input Form */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Influencer Select */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 flex items-center gap-1 block">
                            <User size={12} /> SELECT INFLUENCER
                        </label>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="neo-input w-full py-3 px-4 rounded-xl text-sm"
                        >
                            <option value="">Choose an influencer...</option>
                            {influencers.map((inf) => (
                                <option key={inf.id} value={inf.id}>
                                    {inf.name} ({inf.handle}) — {inf.platform}
                                </option>
                            ))}
                        </select>
                        {influencers.length === 0 && (
                            <p className="text-[10px] text-[var(--color-neo-black)]/30 mt-1">
                                No influencers in DB yet. Fetch one from the Search page first.
                            </p>
                        )}
                    </div>

                    {/* Brand Name */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 flex items-center gap-1 block">
                            <Briefcase size={12} /> BRAND NAME
                        </label>
                        <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g. Nike, Sephora, Samsung..."
                            className="neo-input w-full py-3 px-4 rounded-xl text-sm"
                        />
                    </div>

                    {/* Brand Niche */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">
                            BRAND NICHE (optional)
                        </label>
                        <input
                            type="text"
                            value={brandNiche}
                            onChange={(e) => setBrandNiche(e.target.value)}
                            placeholder="e.g. Sportswear, Beauty, Technology..."
                            className="neo-input w-full py-3 px-4 rounded-xl text-sm"
                        />
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">
                            CAMPAIGN BUDGET IN ₹ (optional)
                        </label>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="e.g. 50000"
                            className="neo-input w-full py-3 px-4 rounded-xl text-sm"
                        />
                    </div>
                </div>

                {/* Objective */}
                <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 flex items-center gap-1 block">
                        <Target size={12} /> CAMPAIGN OBJECTIVE
                    </label>
                    <textarea
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Describe the campaign goal, target audience, key messages, and any specific requirements..."
                        rows={3}
                        className="neo-input w-full py-3 px-4 rounded-xl text-sm resize-none"
                    />
                </div>

                <div className="flex justify-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerate}
                        disabled={generating || !selectedId || !brandName || !objective}
                        className="neo-btn bg-[var(--color-neo-lavender)] text-[var(--color-neo-black)] px-12 py-4 rounded-xl text-sm font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    <Loader size={16} />
                                </motion.div>
                                PREPARING BRIEF...
                            </>
                        ) : (
                            <>
                                <FileText size={16} />
                                Generate Campaign Brief
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="neo-card rounded-2xl p-4 bg-[var(--color-neo-red)]/10 border-l-4 border-[var(--color-neo-red)] text-sm text-red-700"
                >
                    {error}
                </motion.div>
            )}

            {/* Generated Brief */}
            <AnimatePresence>
                {brief && (
                    <motion.div
                        initial={{ y: 30, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="neo-card rounded-2xl p-6 bg-[var(--color-neo-white)]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-[var(--color-neo-lavender)]" />
                                <h3 className="text-lg font-bold text-[var(--color-neo-black)] uppercase tracking-tight">Generated Brief</h3>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCopy}
                                className={`neo-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${copied ? "bg-[var(--color-neo-green)]" : "bg-[var(--color-neo-black)] text-[var(--color-neo-white)]"
                                    }`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied!" : "Copy"}
                            </motion.button>
                        </div>
                        <div className="prose prose-sm max-w-none text-[var(--color-neo-black)]/90 bg-[var(--color-neo-black)]/3 p-4 rounded-xl leading-relaxed">
                            <ReactMarkdown
                                components={{
                                    h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-2 first:mt-0">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>,
                                    p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc list-inside text-sm mb-2 space-y-1">{children}</ul>,
                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                }}
                            >
                                {brief}
                            </ReactMarkdown>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
