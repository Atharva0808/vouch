"use client";

import { motion } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { Check, Zap, Star, Building2, Loader, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const pricingPlans = [
    {
        name: "Free",
        monthlyPrice: 0,
        annualPrice: 0,
        icon: Zap,
        features: [
            "Influencer profile lookups",
            "Engagement metrics & analytics",
            "AI-powered niche detection",
            "Basic risk assessment",
        ],
        color: "bg-[var(--color-neo-white)]",
        cta: "Current Plan",
        priceId: null,
    },
    {
        name: "Pro",
        monthlyPrice: 999,
        annualPrice: 9990,
        icon: Star,
        features: [
            "Everything in Free",
            "Engagement heatmap analysis",
            "Fake engagement detection",
            "Sentiment analysis",
            "AI campaign briefs",
            "PDF report exports",
            "Content safety audit",
        ],
        color: "bg-[var(--color-neo-pink)]",
        cta: "Upgrade to Pro",
        popular: true,
        priceId: "pro",
    },
    {
        name: "Agency",
        monthlyPrice: 3999,
        annualPrice: 39990,
        icon: Building2,
        features: [
            "Everything in Pro",
            "Risk monitoring dashboard",
            "Influencer comparison tool",
            "AI outreach hooks",
            "Market rate estimation",
            "Bulk report downloads",
            "ROI prediction engine",
        ],
        color: "bg-[var(--color-neo-yellow)]",
        cta: "Upgrade to Agency",
        priceId: "agency",
    },
];

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader className="animate-spin text-[var(--color-neo-pink)]" size={32} /></div>}>
            <BillingContent />
        </Suspense>
    );
}

function BillingContent() {
    const [annual, setAnnual] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showCanceled, setShowCanceled] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const success = searchParams.get("success");
        const canceled = searchParams.get("canceled");
        if (success) {
            setShowSuccess(true);
            import("@/lib/supabase-browser").then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.getUser().then((res: any) => {
                    const user = res.data?.user;
                    if (user) {
                        import("@/lib/api-client").then(({ getUserProfile }) => {
                            getUserProfile(user.id).catch(() => {});
                        });
                    }
                });
            });
        }
        if (canceled) setShowCanceled(true);
        // Clear URL params so alerts don't persist on refresh
        if (success || canceled) {
            router.replace("/dashboard/billing", { scroll: false });
        }
    }, [searchParams, router]);

    const handleCheckout = async (plan: typeof pricingPlans[0]) => {
        if (!plan.priceId) return;
        setLoadingPlan(plan.name);

        try {
            // 1. Get real user session
            const { createClient } = await import("@/lib/supabase-browser");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push("/auth/login");
                return;
            }

            // 2. Determine correct Price ID from env vars with fallbacks
            let finalPriceId = "";
            if (plan.priceId === "pro") {
                finalPriceId = annual
                    ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || "price_1T4GJB2L3SLiBT7oRd52HbpZ")
                    : (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_1T4G5W2L3SLiBT7oMG77YjKS");
            } else if (plan.priceId === "agency") {
                finalPriceId = annual
                    ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_YEARLY || "price_1T4GJc2L3SLiBT7o4BDtMDoe")
                    : (process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY || "price_1T4G6e2L3SLiBT7oNPuAOshf");
            }

            // 3. Call the official createCheckout API
            const { createCheckout } = await import("@/lib/api-client");
            const data = await createCheckout(finalPriceId, user.id, user.email || "");
            
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            }
        } catch (err) {
            console.error("Checkout failed", err);
            alert("Payment failed to initialize. Please try again.");
        }
        setLoadingPlan(null);
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <h1 className="text-2xl font-bold text-[var(--color-neo-black)]">Billing & Subscription</h1>
                <p className="text-sm text-[var(--color-neo-black)]/40 font-semibold">
                    POWERED BY STRIPE • SECURE PAYMENTS
                </p>
            </motion.div>

            {/* Success / Cancel Alerts */}
            {showSuccess && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card rounded-2xl p-4 bg-[var(--color-neo-green)] flex items-center justify-between">
                    <p className="font-bold text-[var(--color-neo-black)]">🎉 Payment successful! Your plan has been upgraded.</p>
                    <button onClick={() => setShowSuccess(false)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </motion.div>
            )}
            {showCanceled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card rounded-2xl p-4 bg-[var(--color-neo-yellow)] flex items-center justify-between">
                    <p className="font-bold text-[var(--color-neo-black)]">Payment was canceled. You can try again anytime.</p>
                    <button onClick={() => setShowCanceled(false)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </motion.div>
            )}

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-3">
                <span className={`text-sm font-bold ${!annual ? "text-[var(--color-neo-black)]" : "text-[var(--color-neo-black)]/30"}`}>
                    Monthly
                </span>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAnnual(!annual)}
                    className="w-14 h-8 neo-border rounded-full p-1 flex items-center bg-[var(--color-neo-white)]"
                >
                    <motion.div
                        animate={{ x: annual ? 24 : 0 }}
                        className="w-6 h-6 rounded-full bg-[var(--color-neo-pink)] neo-border"
                    />
                </motion.button>
                <span className={`text-sm font-bold ${annual ? "text-[var(--color-neo-black)]" : "text-[var(--color-neo-black)]/30"}`}>
                    Annual
                </span>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingPlans.map((plan, i) => (
                    <motion.div
                        key={plan.name}
                        initial={{ y: 30, opacity: 0, rotate: (i - 1) * 2 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                        whileHover={{ y: -8, rotate: (i - 1) * 0.5 }}
                        className={`neo-card rounded-2xl p-6 ${plan.color} relative ${plan.popular ? "ring-4 ring-[var(--color-neo-black)]" : ""}`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 neo-badge bg-[var(--color-neo-black)] text-[var(--color-neo-white)] px-4 py-1 rounded-lg text-[10px] font-bold uppercase">
                                Most Popular
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-[var(--color-neo-black)] rounded-xl">
                                <plan.icon size={18} className="text-[var(--color-neo-white)]" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--color-neo-black)]">{plan.name}</h3>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-bold text-[var(--color-neo-black)]">
                                ₹{(annual ? plan.annualPrice : plan.monthlyPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="text-sm text-[var(--color-neo-black)]/50">{annual ? "/yr" : "/mo"}</span>
                        </div>

                        <div className="space-y-2 mb-6">
                            {plan.features.map((feat) => (
                                <div key={feat} className="flex items-center gap-2">
                                    <Check size={14} className="text-green-600" />
                                    <span className="text-sm text-[var(--color-neo-black)]/80">{feat}</span>
                                </div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleCheckout(plan)}
                            disabled={!plan.priceId || loadingPlan === plan.name}
                            className={`neo-btn w-full py-3 rounded-xl text-sm font-semibold ${plan.priceId
                                ? "bg-[var(--color-neo-black)] text-[var(--color-neo-white)]"
                                : "bg-[var(--color-neo-black)]/10 text-[var(--color-neo-black)]/50 cursor-default"
                                }`}
                        >
                            {loadingPlan === plan.name ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader size={14} className="animate-spin" /> Processing...
                                </span>
                            ) : (
                                plan.cta
                            )}
                        </motion.button>
                    </motion.div>
                ))}
            </div>

            {/* Stripe Badge */}
            <div className="text-center">
                <p className="text-xs text-[var(--color-neo-black)]/30 font-semibold">
                    Payments securely processed by Stripe • Cancel anytime
                </p>
            </div>
        </div>
    );
}
