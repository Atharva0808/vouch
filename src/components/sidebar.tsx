"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Search,
    Users,
    BarChart3,
    FileText,
    Settings,
    Zap,
    TrendingUp,
    Shield,
    CreditCard,
    Menu,
    X,
} from "lucide-react";
import VouchLogo from "./vouch-logo";
import { useState } from "react";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "bg-neo-yellow" },
    { label: "Search", href: "/dashboard/search", icon: Search, color: "bg-neo-pink" },
    { label: "Influencers", href: "/dashboard/influencers", icon: Users, color: "bg-neo-blue" },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, color: "bg-neo-purple" },
    { label: "Compare", href: "/dashboard/compare", icon: TrendingUp, color: "bg-neo-orange" },
    { label: "Reports", href: "/dashboard/reports", icon: FileText, color: "bg-neo-green" },
    { label: "Risk Monitor", href: "/dashboard/risks", icon: Shield, color: "bg-neo-red" },
    { label: "Campaign Brief", href: "/dashboard/brief", icon: FileText, color: "bg-neo-lavender" },
    { label: "Settings", href: "/dashboard/settings", icon: Settings, color: "bg-neo-lime" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 neo-btn bg-neo-yellow p-2 rounded-xl lg:hidden"
            >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-screen w-72 bg-neo-white neo-border border-l-0 border-t-0 border-b-0 z-40 flex flex-col overflow-hidden transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo */}
                <Link href="/dashboard" className="block p-6 border-b-3 border-neo-black">
                    <motion.div
                        initial={{ scale: 0.8, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <VouchLogo size={48} className="neo-shadow-sm" />
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter text-neo-black uppercase">Vouch</h1>
                            <p className="text-[10px] font-mono text-neo-black/50 tracking-[0.2em] font-black uppercase">Validated</p>
                        </div>
                    </motion.div>
                </Link>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item, i) => {
                        const isActive = pathname === item.href;
                        return (
                            <motion.div
                                key={item.href}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.05, type: "spring", bounce: 0.3 }}
                            >
                                <Link
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group ${isActive
                                        ? `${item.color} neo-border neo-shadow-sm text-neo-black`
                                        : "text-neo-black/60 hover:text-neo-black hover:bg-neo-black/5"
                                        }`}
                                >
                                    <div
                                        className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-neo-black/10" : `group-hover:${item.color}`
                                            }`}
                                    >
                                        <item.icon size={18} />
                                    </div>
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="ml-auto w-2 h-2 bg-neo-black rounded-full"
                                        />
                                    )}
                                </Link>
                            </motion.div>
                        );
                    })}
                </nav>

                {/* Billing CTA */}
                <div className="p-4 border-t-3 border-neo-black">
                    <Link href="/dashboard/billing" onClick={() => setMobileOpen(false)}>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="neo-btn w-full bg-[var(--color-neo-black)] text-[var(--color-neo-white)] py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                        >
                            <CreditCard size={16} />
                            Upgrade Plan
                        </motion.div>
                    </Link>
                </div>
            </aside>
        </>
    );
}
