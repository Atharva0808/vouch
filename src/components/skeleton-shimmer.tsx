"use client";

import { motion } from "framer-motion";

interface SkeletonShimmerProps {
    count?: number;
}

export default function SkeletonShimmer({ count = 3 }: SkeletonShimmerProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    className="neo-card rounded-2xl p-5 bg-[var(--color-neo-white)] border-3 border-[var(--color-neo-black)] space-y-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-neo-black)]/10 border-2 border-[var(--color-neo-black)] animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[var(--color-neo-black)]/20 rounded-md w-3/4 animate-pulse" />
                            <div className="h-3 bg-[var(--color-neo-black)]/10 rounded-md w-1/2 animate-pulse" />
                        </div>
                    </div>
                    <div className="h-10 bg-[var(--color-neo-black)]/5 rounded-xl border border-dashed border-[var(--color-neo-black)]/20 animate-pulse" />
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="h-12 bg-[var(--color-neo-black)]/10 rounded-xl border border-[var(--color-neo-black)]/10 animate-pulse" />
                        <div className="h-12 bg-[var(--color-neo-black)]/10 rounded-xl border border-[var(--color-neo-black)]/10 animate-pulse" />
                        <div className="h-12 bg-[var(--color-neo-black)]/10 rounded-xl border border-[var(--color-neo-black)]/10 animate-pulse" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
