"use client";

import { motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
} from "recharts";
import { type EngagementData } from "@/lib/api-client";
import { AlertTriangle } from "lucide-react";

interface EngagementHeatmapProps {
    data: EngagementData[];
    title?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: EngagementData }>; label?: string }) {
    if (!active || !payload || !payload.length) return null;

    const isSpike = payload[0]?.payload && !payload[0].payload.organic;

    return (
        <div className="neo-card rounded-xl p-4 bg-neo-white text-sm">
            <p className="font-bold text-neo-black mb-2">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="flex items-center gap-2">
                    <span
                        className="w-3 h-3 rounded-sm neo-border"
                        style={{ background: entry.name === "followers" ? "#FF6B9D" : entry.name === "likes" ? "#4ECDC4" : "#FFE66D" }}
                    />
                    <span className="capitalize text-neo-black/60">{entry.name}:</span>
                    <span className="font-bold">{entry.value?.toLocaleString()}</span>
                </p>
            ))}
            {isSpike && (
                <div className="mt-2 flex items-center gap-1 text-red-600 font-bold">
                    <AlertTriangle size={12} />
                    <span>Suspected fake engagement!</span>
                </div>
            )}
        </div>
    );
}

export default function EngagementHeatmap({ data, title = "Engagement Timeline" }: EngagementHeatmapProps) {
    const spikePoints = data.filter((d) => !d.organic);

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="neo-card rounded-2xl p-6 bg-neo-white"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-neo-black">{title}</h3>
                    <p className="text-xs text-neo-black/40 font-semibold mt-1">
                        FAKE ENGAGEMENT DETECTION • RECENT POSTS
                    </p>
                </div>
                {spikePoints.length > 0 && (
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="neo-badge bg-neo-red text-neo-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                        <AlertTriangle size={12} />
                        {spikePoints.length} Spike{spikePoints.length > 1 ? "s" : ""} Detected
                    </motion.div>
                )}
            </div>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillFollowers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF6B9D" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#FF6B9D" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fillLikes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#1a1a2e", fontWeight: 600, opacity: 0.4 }}
                            tickLine={false}
                            axisLine={{ stroke: "#1a1a2e", strokeWidth: 2 }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            tick={{ fontSize: 11, fill: "#4ECDC4", fontWeight: 600 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) =>
                                val >= 1000000
                                    ? `${(val / 1000000).toFixed(1)}M`
                                    : val >= 1000
                                        ? `${(val / 1000).toFixed(0)}K`
                                        : val
                            }
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 11, fill: "#FF6B9D", fontWeight: 600, opacity: 0.5 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) =>
                                val >= 1000000
                                    ? `${(val / 1000000).toFixed(1)}M`
                                    : val >= 1000
                                        ? `${(val / 1000).toFixed(0)}K`
                                        : val
                            }
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="followers"
                            stroke="#FF6B9D"
                            strokeWidth={3}
                            fill="url(#fillFollowers)"
                        />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="likes"
                            stroke="#4ECDC4"
                            strokeWidth={3}
                            fill="url(#fillLikes)"
                        />
                        {spikePoints.map((spike, i) => (
                            <ReferenceDot
                                key={i}
                                yAxisId="left"
                                x={spike.date}
                                y={spike.likes}
                                r={8}
                                fill="#FF6B6B"
                                stroke="#1a1a2e"
                                strokeWidth={2}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t-2 border-neo-black/10">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rounded-sm bg-neo-pink neo-border" />
                    <span className="text-xs font-semibold text-neo-black/50">Followers</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rounded-sm bg-neo-blue neo-border" />
                    <span className="text-xs font-semibold text-neo-black/50">Likes</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-neo-red neo-border" />
                    <span className="text-xs font-semibold text-neo-black/50">Suspected Spike</span>
                </div>
            </div>
        </motion.div>
    );
}
