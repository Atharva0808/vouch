"use client";

import { motion } from "framer-motion";

interface RadialGaugeProps {
    score: number;
    label: string;
    size?: number;
    strokeWidth?: number;
}

export default function RadialGauge({
    score,
    label,
    size = 100,
    strokeWidth = 10,
}: RadialGaugeProps) {
    const clampedScore = Math.max(0, Math.min(100, score));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return "var(--color-neo-green)";
        if (s >= 50) return "var(--color-neo-yellow)";
        return "var(--color-neo-red)";
    };

    const strokeColor = getColor(clampedScore);

    return (
        <div className="flex flex-col items-center justify-center p-3 neo-card bg-[var(--color-neo-white)] rounded-2xl border-2 border-[var(--color-neo-black)] shadow-[3px_3px_0px_0px_var(--color-neo-black)]">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(0, 0, 0, 0.08)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-[var(--color-neo-black)] tracking-tighter">
                        {clampedScore}%
                    </span>
                </div>
            </div>
            <span className="text-[10px] font-black uppercase text-[var(--color-neo-black)]/60 mt-2 tracking-wider">
                {label}
            </span>
        </div>
    );
}
