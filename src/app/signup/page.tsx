"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Zap, Mail, Lock, User, ArrowRight } from "lucide-react";
import GoogleLogo from "@/components/google-logo";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import VouchLogo from "@/components/vouch-logo";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else if (data?.session) {
            // Logged in immediately without email confirmation
            router.push("/onboarding");
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--color-neo-cream)] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="neo-card rounded-2xl p-8 bg-[var(--color-neo-green)] text-center max-w-md"
                >
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-xl font-bold text-[var(--color-neo-black)] mb-2">Account Created!</h2>
                    <p className="text-sm text-[var(--color-neo-black)]/70 mb-6">
                        Check your email to verify your account, then sign in.
                    </p>
                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="neo-btn bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-6 py-3 rounded-xl text-sm font-semibold"
                        >
                            Go to Login
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-neo-cream)] flex items-center justify-center p-4">
            <motion.div
                initial={{ y: 30, opacity: 0, rotate: 1 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <VouchLogo size={52} className="neo-shadow-sm" />
                        <span className="text-3xl font-black tracking-tighter text-[var(--color-neo-black)] uppercase">
                            Vouch
                        </span>
                    </Link>
                    <p className="mt-3 text-sm text-[var(--color-neo-black)]/40 font-semibold uppercase">
                        Create your account
                    </p>
                </div>

                {/* Card */}
                <div className="neo-card rounded-2xl p-8 bg-[var(--color-neo-white)]">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-[var(--color-neo-red)]/10 border-2 border-[var(--color-neo-red)] rounded-xl text-sm text-red-700"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Google */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoogleSignup}
                        disabled={loading}
                        className="neo-btn w-full bg-[var(--color-neo-white)] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 mb-6"
                    >
                        <GoogleLogo />
                        Sign up with Google
                    </motion.button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-[2px] bg-[var(--color-neo-black)]/10" />
                        <span className="text-xs font-bold text-[var(--color-neo-black)]/30 uppercase">or</span>
                        <div className="flex-1 h-[2px] bg-[var(--color-neo-black)]/10" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">
                                Full Name
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neo-black)]/30" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="neo-input w-full py-3 pl-11 pr-4 rounded-xl text-sm"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neo-black)]/30" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="neo-input w-full py-3 pl-11 pr-4 rounded-xl text-sm"
                                    placeholder="you@company.com"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-[var(--color-neo-black)]/40 mb-2 block">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neo-black)]/30" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="neo-input w-full py-3 pl-11 pr-4 rounded-xl text-sm"
                                    placeholder="Min 6 characters"
                                    minLength={6}
                                    required
                                />
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="neo-btn bg-[var(--color-neo-pink)] text-[var(--color-neo-white)] w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                            <ArrowRight size={16} />
                        </motion.button>
                    </form>
                </div>

                <p className="text-center mt-6 text-sm text-[var(--color-neo-black)]/50">
                    Already have an account?{" "}
                    <Link href="/login" className="font-bold text-[var(--color-neo-pink)] hover:underline">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
