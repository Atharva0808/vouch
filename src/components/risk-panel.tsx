"use client";

import { motion } from "framer-motion";
import { type RiskFlag } from "@/lib/api-client";
import { Shield, AlertTriangle, AlertOctagon, Info, CheckCircle } from "lucide-react";

interface RiskPanelProps {
    data: {
        overall_risk: string;
        bot_percentage: number;
        flags: RiskFlag[];
    };
}

export default function RiskPanel({ data }: RiskPanelProps) {
    const { flags, bot_percentage: botPercentage } = data;
    const severityConfig = {
        low: { icon: Info, bg: "bg-neo-blue/20", border: "border-neo-blue", text: "text-blue-700", label: "LOW" },
        medium: { icon: AlertTriangle, bg: "bg-neo-yellow/20", border: "border-neo-yellow", text: "text-yellow-700", label: "MEDIUM" },
        high: { icon: AlertOctagon, bg: "bg-neo-orange/20", border: "border-neo-orange", text: "text-orange-700", label: "HIGH" },
        critical: { icon: Shield, bg: "bg-neo-red/20", border: "border-neo-red", text: "text-red-700", label: "CRITICAL" },
    };

    const overallRisk = flags.length === 0 ? "low" :
        flags.some(f => f.severity === "critical") ? "critical" :
            flags.some(f => f.severity === "high") ? "high" :
                flags.some(f => f.severity === "medium") ? "medium" : "low";

    const riskColors = {
        low: "bg-neo-green",
        medium: "bg-neo-yellow",
        high: "bg-neo-orange",
        critical: "bg-neo-red",
    };

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="neo-card rounded-2xl p-6 bg-neo-white"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-neo-red neo-border rounded-lg">
                        <Shield size={18} className="text-neo-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-neo-black">Risk Assessment</h3>
                        <p className="text-xs text-neo-black/40 font-semibold">GUARDRAILS & FLAGS</p>
                    </div>
                </div>
                <div className={`neo-badge ${riskColors[overallRisk]} px-3 py-1.5 rounded-lg uppercase`}>
                    {overallRisk} Risk
                </div>
            </div>

            {/* Bot Percentage Meter */}
            <div className="mb-6 p-4 bg-neo-black/5 rounded-xl neo-border">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-neo-black/50">Bot / Fake Followers</span>
                    <span className={`text-lg font-bold ${botPercentage > 20 ? "text-red-600" : botPercentage > 10 ? "text-yellow-600" : "text-green-600"}`}>
                        {botPercentage}%
                    </span>
                </div>
                <div className="w-full h-4 bg-neo-white rounded-full neo-border overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(botPercentage, 100)}%` }}
                        transition={{ delay: 0.6, duration: 1 }}
                        className={`h-full rounded-full ${botPercentage > 20 ? "bg-neo-red" : botPercentage > 10 ? "bg-neo-yellow" : "bg-neo-green"}`}
                    />
                </div>
                <p className="text-[10px] font-semibold text-neo-black/40 mt-1">
                    Industry average: 5-8% • &gt;15% is concerning • &gt;25% is suspicious
                </p>
            </div>

            {/* Risk Flags */}
            {flags.length > 0 ? (
                <div className="space-y-3">
                    {flags.map((flag, i) => {
                        const config = severityConfig[flag.severity?.toLowerCase() as keyof typeof severityConfig] || severityConfig.low;
                        const Icon = config.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className={`p-4 rounded-xl ${config.bg} border-2 ${config.border}`}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon size={18} className={config.text} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-neo-black">{flag.type}</span>
                                            <span className={`text-[10px] font-bold uppercase ${config.text} bg-neo-white px-2 py-0.5 rounded neo-border`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neo-black/70">{flag.description}</p>
                                        <p className="text-[10px] text-neo-black/40 mt-1 font-semibold">
                                            Detected: {flag.detected_at}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                    </motion.div>
                    <p className="font-bold text-neo-black">All Clear!</p>
                    <p className="text-sm text-neo-black/50">No significant risks detected</p>
                </div>
            )}
        </motion.div>
    );
}
