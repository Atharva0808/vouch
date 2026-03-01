"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Bell,
    User,
    ChevronDown,
    Sparkles,
    LogOut,
    Settings,
    X,
    UserPlus,
    AlertTriangle,
    FileText,
    Trash2,
    RefreshCw,
    Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { getActivityFeed, type Activity } from "@/lib/api-client";

export default function TopBar() {
    const router = useRouter();
    const [searchValue, setSearchValue] = useState("");
    const [userName, setUserName] = useState("User");
    const [showNotifs, setShowNotifs] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState<Activity[]>([]);
    const [seen, setSeen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadUser();
        loadNotifications();
        // Poll for new notifications every 30s
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
            if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const loadUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await getActivityFeed(15);
            setNotifications(data.activities || []);
        } catch {
            // Backend not running - show empty
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && searchValue.trim()) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchValue)}`);
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const getNotifIcon = (icon: string) => {
        switch (icon) {
            case "user-plus": return <UserPlus size={14} className="text-emerald-600" />;
            case "alert": return <AlertTriangle size={14} className="text-red-500" />;
            case "report": return <FileText size={14} className="text-blue-600" />;
            case "trash": return <Trash2 size={14} className="text-red-400" />;
            case "refresh": return <RefreshCw size={14} className="text-purple-600" />;
            case "shield": return <Shield size={14} className="text-amber-600" />;
            default: return <Bell size={14} className="text-neo-black/40" />;
        }
    };

    const getNotifBg = (icon: string) => {
        switch (icon) {
            case "user-plus": return "bg-emerald-50";
            case "alert": return "bg-red-50";
            case "report": return "bg-blue-50";
            case "trash": return "bg-red-50";
            case "refresh": return "bg-purple-50";
            case "shield": return "bg-amber-50";
            default: return "bg-neo-black/5";
        }
    };

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-20 bg-neo-white/80 backdrop-blur-md border-b-3 border-neo-black px-4 sm:px-6 py-4"
        >
            <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Search Bar */}
                <div className="flex-1 max-w-xl hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search influencers by name, handle, or niche..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={handleSearch}
                            className="neo-input w-full pl-12 pr-4 py-3 rounded-xl text-sm"
                        />
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                    {/* Notifications */}
                    <div ref={notifRef} className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); setSeen(true); }}
                            className="neo-btn bg-neo-white p-2.5 sm:p-3 rounded-xl relative"
                        >
                            <Bell size={18} />
                            {notifications.length > 0 && !seen && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-neo-red neo-border rounded-full text-[10px] font-bold flex items-center justify-center text-neo-white">
                                    {Math.min(notifications.length, 9)}
                                </span>
                            )}
                        </motion.button>

                        <AnimatePresence>
                            {showNotifs && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 top-14 w-80 sm:w-96 neo-card rounded-2xl bg-neo-white overflow-hidden z-50"
                                >
                                    <div className="p-4 border-b-2 border-neo-black/10 flex items-center justify-between">
                                        <h3 className="font-bold text-sm">Notifications</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => loadNotifications()}
                                                className="text-[10px] font-bold text-neo-black/30 hover:text-neo-black/60 transition-colors"
                                            >
                                                Refresh
                                            </button>
                                            <button onClick={() => setShowNotifs(false)}>
                                                <X size={14} className="text-neo-black/30" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div key={n.id} className="p-3 border-b border-neo-black/5 hover:bg-neo-black/3 transition-colors flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${getNotifBg(n.icon)}`}>
                                                        {getNotifIcon(n.icon)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-neo-black">{n.action}</p>
                                                        <p className="text-[11px] text-neo-black/50 mt-0.5 leading-relaxed">{n.details}</p>
                                                        <p className="text-[10px] text-neo-black/25 mt-1">{timeAgo(n.created_at)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <Bell size={24} className="mx-auto mb-2 text-neo-black/15" />
                                                <p className="text-xs text-neo-black/40">No notifications yet</p>
                                                <p className="text-[10px] text-neo-black/25 mt-1">Fetch an influencer to get started!</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Menu */}
                    <div ref={userRef} className="relative">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
                            className="neo-btn bg-neo-yellow px-3 sm:px-4 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <div className="w-8 h-8 bg-neo-pink neo-border rounded-lg flex items-center justify-center">
                                <User size={16} />
                            </div>
                            <span className="font-semibold text-sm hidden sm:inline">{userName}</span>
                            <ChevronDown size={14} className="hidden sm:block" />
                        </motion.button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 top-14 w-48 neo-card rounded-2xl bg-neo-white overflow-hidden z-50"
                                >
                                    <Link
                                        href="/dashboard/settings"
                                        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-neo-black hover:bg-neo-black/5 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <Settings size={14} />
                                        Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-neo-red hover:bg-neo-red/5 transition-colors w-full"
                                    >
                                        <LogOut size={14} />
                                        Log Out
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
