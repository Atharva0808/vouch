"use client";

import { motion } from "framer-motion";
import { Download, Sparkles, GitCompare } from "lucide-react";
import { useRouter } from "next/navigation";

interface FloatingActionBarProps {
    influencerId: string;
    handle: string;
    onDownloadPdf?: () => void;
}

export default function FloatingActionBar({
    influencerId,
    handle,
    onDownloadPdf,
}: FloatingActionBarProps) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--color-neo-white)] border-3 border-[var(--color-neo-black)] p-2 rounded-2xl shadow-[5px_5px_0px_0px_var(--color-neo-black)]"
        >
            {onDownloadPdf && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onDownloadPdf}
                    className="neo-btn bg-[var(--color-neo-green)] text-[var(--color-neo-black)] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    title="Download Summary PDF"
                >
                    <Download size={14} />
                    <span className="hidden sm:inline">PDF Report</span>
                </motion.button>
            )}

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/dashboard/compare?influencer_a=${influencerId}`)}
                className="neo-btn bg-[var(--color-neo-yellow)] text-[var(--color-neo-black)] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Compare Creator"
            >
                <GitCompare size={14} />
                <span className="hidden sm:inline">Compare</span>
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/dashboard/brief?influencer_id=${influencerId}`)}
                className="neo-btn bg-[var(--color-neo-pink)] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Generate Campaign Brief"
            >
                <Sparkles size={14} />
                <span className="hidden sm:inline">AI Brief</span>
            </motion.button>
        </motion.div>
    );
}
