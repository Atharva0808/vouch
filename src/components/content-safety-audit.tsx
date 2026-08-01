"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Shield, Search, AlertTriangle, CheckCircle, Loader, ChevronDown, ChevronUp } from "lucide-react";
import { runContentAudit } from "@/lib/api-client";

interface AuditResult {
    risk_score: number;
    risk_level: string;
    detected_flags: { category: string; details: string; severity: string }[];
    summary: string;
    safe_for_brands: boolean;
}

export default function ContentSafetyAudit({ influencerId }: { influencerId: string }) {
    const [audit, setAudit] = useState<AuditResult | null>(null);
    const [running, setRunning] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleAudit = async () => {
        setRunning(true);
        try {
            const data = await runContentAudit(influencerId);
            setAudit(data);
            setExpanded(true);
        } catch (err) {
            console.error("Audit failed", err);
        }
        setRunning(false);
    };

    return (
        <div className="neo-card rounded-2xl bg-[var(--color-neo-white)] overflow-hidden">
            <div className="p-6 border-b-2 border-[var(--color-neo-black)]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-[var(--color-neo-red)]/10 neo-border rounded-xl">
                        <Shield size={20} className="text-[var(--color-neo-red)]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--color-neo-black)] leading-none">DEEP CONTENT SAFETY AUDIT</h3>
                        <p className="text-[10px] font-bold text-[var(--color-neo-black)]/40 uppercase mt-1">AI CAPTION SCAN • RED FLAG AUDIT</p>
                    </div>
                </div>

                {!audit && (
                    <button
                        onClick={handleAudit}
                        disabled={running}
                        className="neo-btn bg-[var(--color-neo-black)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                        {running ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                        {running ? "SCANNING CONTENT..." : "RUN FULL AUDIT"}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {audit && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="p-6"
                    >
                        {(() => {
                            const isFailed = audit.risk_level === "unknown" || audit.summary?.toLowerCase().includes("failed");
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    {/* Score Card */}
                                    <div className={`p-4 rounded-2xl neo-border text-center ${isFailed ? "bg-gray-100" : audit.safe_for_brands ? "bg-green-50" : "bg-red-50"}`}>
                                        <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40">SAFETY SCORE</p>
                                        <p className={`text-4xl font-black mt-1 ${isFailed ? "text-gray-500" : audit.safe_for_brands ? "text-green-600" : "text-red-600"}`}>
                                            {isFailed ? "N/A" : `${100 - audit.risk_score}/100`}
                                        </p>
                                        <div className="flex items-center justify-center gap-1 mt-2">
                                            {isFailed ? (
                                                <AlertTriangle size={14} className="text-gray-500" />
                                            ) : audit.safe_for_brands ? (
                                                <CheckCircle size={14} className="text-green-600" />
                                            ) : (
                                                <AlertTriangle size={14} className="text-red-600" />
                                            )}
                                            <span className="text-[10px] font-bold uppercase">
                                                {isFailed ? "AUDIT FAILED" : audit.safe_for_brands ? "SAFE FOR COLLABS" : "HIGH RISK DETECTED"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Risk Level */}
                                    <div className="p-4 rounded-2xl neo-border text-center bg-[var(--color-neo-cream)]">
                                        <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40">RISK LEVEL</p>
                                        <p className="text-2xl font-black mt-1 uppercase text-[var(--color-neo-black)]">
                                            {audit.risk_level}
                                        </p>
                                        <div className="flex items-center justify-center gap-1 mt-3">
                                            <div className="h-2 w-full max-w-[100px] bg-black/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${audit.risk_level === 'high' ? 'bg-red-500 w-full' : audit.risk_level === 'medium' ? 'bg-yellow-500 w-1/2' : 'bg-green-500 w-1/4'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="p-4 rounded-2xl neo-border bg-[var(--color-neo-black)]/5 flex flex-col justify-center">
                                        <p className="text-[10px] font-bold uppercase text-[var(--color-neo-black)]/40 mb-1">AUDIT SUMMARY</p>
                                        <p className="text-xs italic text-[var(--color-neo-black)]/70">
                                            "{audit.summary}"
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Flags Toggle */}
                        <div className="neo-border rounded-xl">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-neo-black)]/5 transition-colors"
                            >
                                <p className="text-xs font-bold uppercase">Detected Flags ({(audit.detected_flags || []).length})</p>
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {expanded && (
                                <div className="p-4 pt-0 space-y-3">
                                    {(audit.detected_flags || []).length > 0 ? (
                                        (audit.detected_flags || []).map((flag, i) => (
                                            <div key={i} className="flex gap-4 p-3 bg-[var(--color-neo-white)] neo-border rounded-xl">
                                                <div className={`mt-1 p-1 rounded-lg flex-shrink-0 ${flag.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    <AlertTriangle size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase flex items-center gap-2">
                                                        {flag.category}
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${flag.severity === 'high' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-black'}`}>
                                                            {flag.severity}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-[var(--color-neo-black)]/60 mt-0.5">{flag.details}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
                                            <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
                                            <p className="text-xs font-bold text-green-700">No red flags detected in recent posts.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleAudit}
                                disabled={running}
                                className="text-[10px] font-bold text-[var(--color-neo-black)]/40 hover:text-[var(--color-neo-black)] flex items-center gap-1"
                            >
                                <RefreshCw size={10} className={running ? 'animate-spin' : ''} /> RE-SCAN CONTENT
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!audit && (
                <div className="p-8 text-center bg-[var(--color-neo-black)]/[0.02]">
                    <Search size={32} className="mx-auto text-[var(--color-neo-black)]/10 mb-2" />
                    <p className="text-xs font-bold text-[var(--color-neo-black)]/40 uppercase">Ready for deep safety audit</p>
                    <p className="text-[10px] text-[var(--color-neo-black)]/30 mt-1 max-w-xs mx-auto">This will scan the last 30 captions for scandals, profanity, and competitor mentions.</p>
                </div>
            )}
        </div>
    );
}

function RefreshCw(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    )
}
