"use client";

import { motion } from "framer-motion";
import { type SentimentData } from "@/lib/api-client";
import { MessageCircle, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

interface SentimentPanelProps {
    data: SentimentData;
}

export default function SentimentPanel({ data }: SentimentPanelProps) {
    const sentimentConfig = {
        positive: { icon: ThumbsUp, color: "bg-neo-green", textColor: "text-green-700" },
        negative: { icon: ThumbsDown, color: "bg-neo-red", textColor: "text-red-700" },
        neutral: { icon: Minus, color: "bg-neo-yellow", textColor: "text-yellow-700" },
    };

    const positive = data?.positive ?? 0;
    const neutral = data?.neutral ?? 0;
    const negative = data?.negative ?? 0;
    const themes = data?.themes ?? [];

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="neo-card rounded-2xl p-6 bg-neo-white"
        >
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-neo-purple neo-border rounded-lg">
                    <MessageCircle size={18} className="text-neo-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-neo-black">Comment Sentiment</h3>
                    <p className="text-xs text-neo-black/40 font-semibold">DEEP-DIVE ANALYSIS</p>
                </div>
            </div>

            {/* Sentiment Bar */}
            <div className="mb-6">
                {positive === 0 && neutral === 0 && negative === 0 ? (
                    <div className="flex items-center justify-center h-10 rounded-xl neo-border bg-gray-100 text-xs font-bold text-gray-500 uppercase">
                        No Comment Sentiment Data Available
                    </div>
                ) : (
                    <div className="flex rounded-xl neo-border overflow-hidden h-10 bg-gray-100">
                        {positive > 0 && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${positive}%` }}
                                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                className="bg-neo-green flex items-center justify-center overflow-hidden"
                            >
                                {positive >= 10 && <span className="text-xs font-bold text-neo-black">{positive}%</span>}
                            </motion.div>
                        )}
                        {neutral > 0 && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${neutral}%` }}
                                transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                                className="bg-neo-yellow flex items-center justify-center border-x-2 border-neo-black overflow-hidden"
                            >
                                {neutral >= 10 && <span className="text-xs font-bold text-neo-black">{neutral}%</span>}
                            </motion.div>
                        )}
                        {negative > 0 && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${negative}%` }}
                                transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
                                className="bg-neo-red flex items-center justify-center overflow-hidden"
                            >
                                {negative >= 10 && <span className="text-xs font-bold text-neo-white">{negative}%</span>}
                            </motion.div>
                        )}
                    </div>
                )}
                <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-bold text-green-600 uppercase">Positive ({positive}%)</span>
                    <span className="text-[10px] font-bold text-yellow-600 uppercase">Neutral ({neutral}%)</span>
                    <span className="text-[10px] font-bold text-red-600 uppercase">Negative ({negative}%)</span>
                </div>
            </div>

            {/* Common Themes */}
            <div>
                <h4 className="text-sm font-bold text-neo-black mb-3 uppercase tracking-wider">
                    Common Themes
                </h4>
                <div className="space-y-2">
                    {themes.map((theme, i) => {
                        const key = (theme.sentiment || "neutral").toLowerCase() as keyof typeof sentimentConfig;
                        const config = sentimentConfig[key] || sentimentConfig.neutral;
                        const Icon = config.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className={`flex items-center gap-3 p-3 rounded-xl ${config.color}/20 border-2 border-neo-black/10`}
                            >
                                <Icon size={14} className={config.textColor} />
                                <span className="text-sm font-medium text-neo-black flex-1 truncate">
                                    &ldquo;{theme.label}&rdquo;
                                </span>
                                <span className="neo-badge bg-neo-white px-2 py-0.5 rounded-md text-[10px]">
                                    {theme.count} mentions
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
