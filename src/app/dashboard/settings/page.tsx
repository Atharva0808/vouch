"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { User, Mail, Building, Briefcase, Bell, Save, Loader, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { getUserProfile, updateUserProfile, type UserProfile } from "@/lib/api-client";
import { createClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get current authenticated user or fallback to system user
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/login");
                return;
            }

            const userId = user.id;
            const userEmail = user.email || "";

            // 2. Try to fetch profile from backend
            try {
                const data = await getUserProfile(userId);
                setProfile(data);
                setFormData({
                    full_name: data.full_name || "",
                    company: data.company || "",
                    role: data.role || "",
                    notifications: data.notifications || {}
                });
            } catch (err) {
                console.log("Profile not found in DB, creating default...");
                // 3. Auto-create if not found
                const newProfile = await updateUserProfile(userId, {
                    full_name: userEmail.split('@')[0] || "Admin User",
                    email: userEmail
                });
                setProfile(newProfile);
                setFormData({
                    full_name: newProfile.full_name || "",
                    company: newProfile.company || "",
                    role: newProfile.role || "",
                    notifications: newProfile.notifications || {}
                });
            }
        } catch (err: any) {
            setError("Connectivity error: Backend might be down.");
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        setSuccess(false);
        setError(null);

        try {
            const updated = await updateUserProfile(profile.id, formData);
            setProfile(updated);
            
            // Also update Supabase metadata if full_name changed
            if (formData.full_name) {
                const supabase = createClient();
                await supabase.auth.updateUser({ data: { full_name: formData.full_name } });
            }
            window.dispatchEvent(new Event("user-profile-updated"));
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError("Failed to save profile changes.");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader className="animate-spin text-neo-pink" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-2xl md:text-3xl font-bold text-neo-black">Settings</h1>
                <p className="text-xs md:text-sm text-neo-black/40 font-bold uppercase tracking-widest mt-1">
                    Manage your identity and preferences
                </p>
            </motion.div>

            {error && (
                <div className="neo-card bg-neo-red/10 border-neo-red p-4 rounded-2xl flex gap-3 text-neo-red">
                    <ShieldAlert />
                    <p className="font-bold">{error}</p>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Profile Section */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="neo-card bg-neo-white rounded-3xl p-8 space-y-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <User className="text-neo-pink" />
                        <h2 className="text-xl font-bold">Public Profile</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neo-black/40">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/20" size={18} />
                                <input
                                    type="text"
                                    value={formData.full_name || ""}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="neo-input w-full pl-12 py-3 rounded-xl font-medium"
                                    placeholder="Your Name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neo-black/40">Email Address (Read-only)</label>
                            <div className="relative opacity-50">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/20" size={18} />
                                <input
                                    type="email"
                                    value={profile?.email || ""}
                                    disabled
                                    className="neo-input w-full pl-12 py-3 rounded-xl bg-gray-50 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neo-black/40">Company / Brand</label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/20" size={18} />
                                <input
                                    type="text"
                                    value={formData.company || ""}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="neo-input w-full pl-12 py-3 rounded-xl font-medium"
                                    placeholder="Company Name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neo-black/40">Your Role</label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black/20" size={18} />
                                <input
                                    type="text"
                                    value={formData.role || ""}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="neo-input w-full pl-12 py-3 rounded-xl font-medium"
                                    placeholder="e.g. Marketing Director"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="neo-card bg-neo-white rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="text-neo-blue" />
                        <h2 className="text-xl font-bold">Notification Prefs</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            { key: "email_alerts", label: "Email Alerts on Brand Matches" },
                            { key: "report_ready", label: "Notify when AI Reports are generated" },
                            { key: "risk_flags", label: "Urgent Risk Notifications" },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between p-4 bg-neo-black/5 rounded-2xl cursor-pointer hover:bg-neo-black/10 transition-colors">
                                <span className="font-bold text-sm text-neo-black">{item.label}</span>
                                <input
                                    type="checkbox"
                                    checked={!!formData.notifications?.[item.key]}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        notifications: { ...formData.notifications, [item.key]: e.target.checked }
                                    })}
                                    className="w-5 h-5 accent-neo-pink"
                                />
                            </label>
                        ))}
                    </div>
                </motion.div>

                <div className="flex items-center justify-start gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={saving}
                        className="neo-btn bg-neo-black text-neo-white px-10 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-[8px_8px_0px_0px_rgba(255,107,157,0.3)] disabled:opacity-50"
                    >
                        {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? "SAVING..." : "SAVE CHANGES"}
                    </motion.button>

                    {success && (
                        <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-neo-green text-neo-black font-bold px-6 py-3 rounded-xl border-2 border-neo-black"
                        >
                            SETTINGS UPDATED SUCCESSFULLY! 🎉
                        </motion.span>
                    )}
                </div>
            </form>
        </div>
    );
}
