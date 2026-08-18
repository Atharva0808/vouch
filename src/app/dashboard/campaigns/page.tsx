"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Megaphone,
    Plus,
    CheckCircle2,
    TrendingUp,
    DollarSign,
    Users,
    Eye,
    Target,
    BarChart3,
    Trash2,
    X,
    Calendar,
    ArrowUpRight,
    Sparkles,
    Check,
    AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import AvatarImg from "@/components/avatar-img";
import SkeletonShimmer from "@/components/skeleton-shimmer";
import {
    getCampaigns,
    getCampaignDetail,
    createCampaign,
    deleteCampaign,
    getAllInfluencers,
    CampaignSummary,
    CampaignCreatorItem,
    InfluencerProfile,
} from "@/lib/api-client";

export default function CampaignTrackerPage() {
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [activeCampaignDetail, setActiveCampaignDetail] = useState<{
        campaign: CampaignSummary;
        creators: CampaignCreatorItem[];
    } | null>(null);

    const [savedInfluencers, setSavedInfluencers] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Modal Form State
    const [formName, setFormName] = useState("");
    const [formBrand, setFormBrand] = useState("");
    const [formBudget, setFormBudget] = useState(500000);
    const [formStartDate, setFormStartDate] = useState("2026-10-15");
    const [formEndDate, setFormEndDate] = useState("2026-11-05");
    const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
    const [creatorFees, setCreatorFees] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, infData] = await Promise.all([
                getCampaigns().catch(() => []),
                getAllInfluencers(50).catch(() => ({ results: [] })),
            ]);

            setCampaigns(cData || []);
            const infList = infData.results || [];
            setSavedInfluencers(infList);

            // Auto select first campaign if available
            if (cData && cData.length > 0) {
                const firstId = cData[0].id;
                setSelectedCampaignId(firstId);
                loadCampaignDetail(firstId);
            } else {
                setActiveCampaignDetail(null);
            }
        } catch (err) {
            console.error("Failed to load campaign tracker data:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadCampaignDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const detail = await getCampaignDetail(id);
            setActiveCampaignDetail(detail);
        } catch (err) {
            console.error(`Failed to load details for campaign ${id}:`, err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSelectCampaign = (id: string) => {
        setSelectedCampaignId(id);
        loadCampaignDetail(id);
    };

    const toggleCreatorSelection = (id: string) => {
        if (selectedCreatorIds.includes(id)) {
            setSelectedCreatorIds(selectedCreatorIds.filter((cid) => cid !== id));
        } else {
            if (selectedCreatorIds.length >= 5) {
                alert("You can select up to 5 creators per campaign.");
                return;
            }
            setSelectedCreatorIds([...selectedCreatorIds, id]);
        }
    };

    const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !formBrand.trim()) {
            setErrorMsg("Campaign name and brand name are required.");
            return;
        }
        if (selectedCreatorIds.length === 0) {
            setErrorMsg("Please select at least 1 creator for your campaign.");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");
        try {
            await createCampaign({
                name: formName.trim(),
                brand_name: formBrand.trim(),
                budget: Number(formBudget),
                start_date: formStartDate,
                end_date: formEndDate,
                creator_ids: selectedCreatorIds,
                creator_fees: creatorFees,
            });

            setIsCreateOpen(false);
            // Reset form
            setFormName("");
            setFormBrand("");
            setSelectedCreatorIds([]);
            setCreatorFees({});
            // Reload
            await loadData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to create campaign");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await deleteCampaign(id);
            await loadData();
        } catch (err) {
            alert("Failed to delete campaign");
        }
    };

    // Calculate aggregated overall summary across all campaigns
    const overallTotalSpend = campaigns.reduce((acc, c) => acc + (c.total_spend || 0), 0);
    const overallTotalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
    const overallTotalImpressions = campaigns.reduce((acc, c) => acc + (c.total_impressions || 0), 0);
    const overallTotalSales = campaigns.reduce((acc, c) => acc + (c.total_sales || 0), 0);
    const overallAverageRoi = overallTotalSpend > 0 ? (overallTotalSales / overallTotalSpend).toFixed(1) : "0.0";

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-black pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-neo-pink neo-border neo-shadow-sm rounded-xl text-neo-black">
                            <Megaphone size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neo-black uppercase">
                                Active Campaign Tracker & ROI
                            </h1>
                            <p className="text-xs font-mono text-neo-black/60 tracking-wider font-bold">
                                MULTI-CREATOR PERFORMANCE AGGREGATION & REAL-TIME ROI PIPELINE
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="neo-btn bg-neo-yellow text-neo-black px-5 py-3 rounded-xl font-black flex items-center gap-2 text-sm text-center justify-center neo-shadow-sm"
                >
                    <Plus size={20} />
                    CREATE NEW CAMPAIGN
                </button>
            </div>

            {/* KPI Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric 1 */}
                <div className="neo-card bg-neo-white p-5 rounded-2xl neo-border neo-shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-bold text-neo-black/60">Active Campaigns</span>
                        <div className="p-2 bg-neo-yellow/30 rounded-lg text-neo-black neo-border">
                            <Megaphone size={18} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-neo-black">{campaigns.length}</span>
                        <span className="ml-2 text-xs font-bold text-neo-black/60">Tracked</span>
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="neo-card bg-neo-white p-5 rounded-2xl neo-border neo-shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-bold text-neo-black/60">Total Spend / Budget</span>
                        <div className="p-2 bg-neo-pink/30 rounded-lg text-neo-black neo-border">
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-black text-neo-black">
                            ₹{overallTotalSpend.toLocaleString("en-IN")}
                        </div>
                        <p className="text-xs font-bold text-neo-black/50">
                            of ₹{overallTotalBudget.toLocaleString("en-IN")} budget
                        </p>
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="neo-card bg-neo-white p-5 rounded-2xl neo-border neo-shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-bold text-neo-black/60">Combined Impressions</span>
                        <div className="p-2 bg-neo-blue/30 rounded-lg text-neo-black neo-border">
                            <Eye size={18} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-neo-black">
                            {overallTotalImpressions >= 1000000
                                ? `${(overallTotalImpressions / 1000000).toFixed(1)}M`
                                : `${(overallTotalImpressions / 1000).toFixed(0)}K`}
                        </span>
                        <span className="ml-2 text-xs font-bold text-emerald-600 font-mono">Aggregated</span>
                    </div>
                </div>

                {/* Metric 4 */}
                <div className="neo-card bg-neo-white p-5 rounded-2xl neo-border neo-shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-bold text-neo-black/60">Average Campaign ROI</span>
                        <div className="p-2 bg-neo-purple/30 rounded-lg text-neo-black neo-border">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-neo-purple">{overallAverageRoi}x</span>
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                            ₹{overallTotalSales.toLocaleString("en-IN")} Revenue
                        </span>
                    </div>
                </div>
            </div>

            {/* Campaign Selection Tabs */}
            {loading ? (
                <SkeletonShimmer count={3} />
            ) : campaigns.length === 0 ? (
                <div className="neo-card bg-neo-yellow/20 p-10 rounded-2xl neo-border text-center space-y-4">
                    <div className="w-16 h-16 bg-neo-yellow neo-border neo-shadow-sm rounded-2xl mx-auto flex items-center justify-center text-neo-black">
                        <Megaphone size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-neo-black uppercase">No Active Campaigns Yet</h3>
                    <p className="text-sm font-bold text-neo-black/70 max-w-md mx-auto">
                        Launch your first campaign (e.g. &quot;Diwali Special Launch 2026&quot;), assign creators from your roster, and track real-time spend vs ROI.
                    </p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="neo-btn bg-neo-black text-white px-6 py-3 rounded-xl font-black text-sm uppercase inline-flex items-center gap-2"
                    >
                        <Plus size={18} /> Create Your First Campaign
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Select Campaign Bar */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b-2 border-neo-black/10">
                        {campaigns.map((c) => {
                            const isSelected = c.id === selectedCampaignId;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelectCampaign(c.id)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 neo-border ${isSelected
                                        ? "bg-neo-black text-white neo-shadow-sm"
                                        : "bg-neo-white text-neo-black hover:bg-neo-yellow/30"
                                        }`}
                                >
                                    <Megaphone size={16} />
                                    <span>{c.name}</span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isSelected ? "bg-neo-yellow text-neo-black" : "bg-neo-black/10 text-neo-black"
                                            }`}
                                    >
                                        {c.brand_name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Campaign Detailed Analytics View */}
                    {detailLoading ? (
                        <SkeletonShimmer count={2} />
                    ) : activeCampaignDetail ? (
                        <div className="space-y-6">
                            {/* Campaign Top Info Card */}
                            <div className="neo-card bg-neo-white p-6 rounded-2xl neo-border neo-shadow-md space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-neo-black/10 pb-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black text-neo-black uppercase">
                                                {activeCampaignDetail.campaign.name}
                                            </h2>
                                            <span className="neo-badge bg-neo-pink text-neo-black text-xs font-black px-3 py-1 rounded-full neo-border">
                                                {activeCampaignDetail.campaign.brand_name}
                                            </span>
                                            <span className="neo-badge bg-emerald-300 text-neo-black text-xs font-black px-3 py-1 rounded-full neo-border">
                                                {activeCampaignDetail.campaign.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-mono text-neo-black/60 font-bold mt-1">
                                            Dates: {activeCampaignDetail.campaign.start_date || "Oct 15, 2026"} to{" "}
                                            {activeCampaignDetail.campaign.end_date || "Nov 05, 2026"}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteCampaign(activeCampaignDetail.campaign.id)}
                                        className="neo-btn bg-neo-red/20 text-neo-red hover:bg-neo-red hover:text-white px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 self-start"
                                    >
                                        <Trash2 size={14} /> Delete Campaign
                                    </button>
                                </div>

                                {/* Budget Utilization Bar & Analytics Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Spend vs Budget Tracker */}
                                    <div className="neo-card bg-neo-yellow/10 p-5 rounded-xl neo-border space-y-3 lg:col-span-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase text-neo-black">
                                                Spend vs Budget Tracker
                                            </span>
                                            <span className="text-xs font-mono font-black text-neo-black">
                                                {((activeCampaignDetail.campaign.total_spend / Math.max(activeCampaignDetail.campaign.budget, 1)) * 100).toFixed(0)}% Utilized
                                            </span>
                                        </div>

                                        <div className="w-full bg-neo-black/10 rounded-full h-4 neo-border overflow-hidden">
                                            <div
                                                className="bg-neo-pink h-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (activeCampaignDetail.campaign.total_spend / Math.max(activeCampaignDetail.campaign.budget, 1)) * 100
                                                    )}%`,
                                                }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-xs font-mono font-bold text-neo-black/80">
                                            <span>Spent: ₹{activeCampaignDetail.campaign.total_spend.toLocaleString("en-IN")}</span>
                                            <span>Budget: ₹{activeCampaignDetail.campaign.budget.toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>

                                    {/* Quick Metrics */}
                                    <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                                        <div className="neo-card bg-neo-blue/10 p-4 rounded-xl neo-border">
                                            <span className="text-[11px] font-mono font-black uppercase text-neo-black/60">
                                                Campaign Reach
                                            </span>
                                            <div className="text-2xl font-black text-neo-black mt-1">
                                                {(activeCampaignDetail.campaign.total_reach / 1000).toFixed(0)}K
                                            </div>
                                            <span className="text-[10px] font-bold text-neo-black/50">Combined Audience</span>
                                        </div>

                                        <div className="neo-card bg-neo-purple/10 p-4 rounded-xl neo-border">
                                            <span className="text-[11px] font-mono font-black uppercase text-neo-black/60">
                                                Actual Impressions
                                            </span>
                                            <div className="text-2xl font-black text-neo-purple mt-1">
                                                {activeCampaignDetail.campaign.total_impressions.toLocaleString("en-IN")}
                                            </div>
                                            <span className="text-[10px] font-bold text-neo-black/50">Delivered Views</span>
                                        </div>

                                        <div className="neo-card bg-neo-green/10 p-4 rounded-xl neo-border">
                                            <span className="text-[11px] font-mono font-black uppercase text-neo-black/60">
                                                Campaign ROI
                                            </span>
                                            <div className="text-2xl font-black text-emerald-700 mt-1">
                                                {activeCampaignDetail.campaign.overall_roi}x
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-600">High Performer</span>
                                        </div>

                                        <div className="neo-card bg-neo-orange/10 p-4 rounded-xl neo-border">
                                            <span className="text-[11px] font-mono font-black uppercase text-neo-black/60">
                                                Conversion Rate
                                            </span>
                                            <div className="text-2xl font-black text-neo-orange mt-1">
                                                {activeCampaignDetail.campaign.conversion_rate}%
                                            </div>
                                            <span className="text-[10px] font-bold text-neo-black/50">
                                                {activeCampaignDetail.campaign.total_conversions} Sales
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Creator Roster Table */}
                            <div className="neo-card bg-neo-white p-6 rounded-2xl neo-border neo-shadow-md space-y-4">
                                <div className="flex items-center justify-between border-b-2 border-neo-black/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={20} className="text-neo-black" />
                                        <h3 className="text-lg font-black text-neo-black uppercase">
                                            Assigned Creator Roster ({activeCampaignDetail.creators.length})
                                        </h3>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-neo-black text-xs font-mono uppercase bg-neo-yellow/20">
                                                <th className="py-3 px-4 font-black">Creator</th>
                                                <th className="py-3 px-4 font-black">Platform</th>
                                                <th className="py-3 px-4 font-black">Status</th>
                                                <th className="py-3 px-4 font-black">Agreed Fee</th>
                                                <th className="py-3 px-4 font-black">Impressions</th>
                                                <th className="py-3 px-4 font-black">Sales Gen.</th>
                                                <th className="py-3 px-4 font-black">ROI</th>
                                                <th className="py-3 px-4 font-black text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neo-black/10 text-sm">
                                            {activeCampaignDetail.creators.map((c) => {
                                                const creatorRoi =
                                                    c.agreed_fee > 0
                                                        ? (c.sales_generated / c.agreed_fee).toFixed(1)
                                                        : "0.0";
                                                return (
                                                    <tr key={c.id} className="hover:bg-neo-black/5 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold">
                                                            <div className="flex items-center gap-3">
                                                                <AvatarImg
                                                                    src={c.avatar_url || ""}
                                                                    name={c.name}
                                                                    handle={c.handle}
                                                                    platform={c.platform}
                                                                    size={38}
                                                                />
                                                                <div>
                                                                    <p className="font-extrabold text-neo-black">{c.name}</p>
                                                                    <p className="text-xs font-mono text-neo-black/60">@{c.handle}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold uppercase text-xs">
                                                            {c.platform}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="neo-badge bg-emerald-200 text-neo-black font-extrabold text-xs px-2.5 py-1 rounded-full neo-border">
                                                                {c.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold">
                                                            ₹{c.agreed_fee.toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold">
                                                            {c.actual_impressions.toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                                                            ₹{c.sales_generated.toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-black text-neo-purple">
                                                            {creatorRoi}x
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <Link
                                                                href={`/dashboard/influencer/${c.influencer_id}`}
                                                                className="neo-btn bg-neo-yellow text-neo-black text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                                                            >
                                                                Audit <ArrowUpRight size={12} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Create Campaign Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="neo-card bg-neo-white p-6 md:p-8 rounded-3xl neo-border neo-shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6"
                        >
                            <div className="flex items-center justify-between border-b-2 border-neo-black pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-neo-yellow rounded-xl neo-border">
                                        <Plus size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-neo-black uppercase">
                                        Create Active Campaign
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsCreateOpen(false)}
                                    className="p-2 hover:bg-neo-black/10 rounded-xl transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-neo-red/20 text-neo-red neo-border rounded-xl text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle size={16} /> {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black mb-1">
                                            Campaign Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Diwali Special Launch 2026"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-sm font-bold bg-neo-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black mb-1">
                                            Brand Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. boAt, Nike, Samsung"
                                            value={formBrand}
                                            onChange={(e) => setFormBrand(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-sm font-bold bg-neo-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black mb-1">
                                            Budget (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formBudget}
                                            onChange={(e) => setFormBudget(Number(e.target.value))}
                                            className="neo-input w-full p-3 rounded-xl text-sm font-bold bg-neo-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formStartDate}
                                            onChange={(e) => setFormStartDate(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-sm font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formEndDate}
                                            onChange={(e) => setFormEndDate(e.target.value)}
                                            className="neo-input w-full p-3 rounded-xl text-sm font-bold bg-neo-white"
                                        />
                                    </div>
                                </div>

                                {/* Creator Selection List */}
                                <div className="space-y-2 pt-2 border-t-2 border-neo-black/10">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-mono font-black uppercase text-neo-black">
                                            Assign Creators from Saved Database ({selectedCreatorIds.length}/5)
                                        </label>
                                        <span className="text-[10px] font-bold text-neo-black/60">
                                            Select 1 to 5 creators
                                        </span>
                                    </div>

                                    {savedInfluencers.length === 0 ? (
                                        <p className="text-xs text-neo-black/60 font-bold p-3 bg-neo-yellow/20 rounded-xl neo-border">
                                            No saved creators found in database. Search & analyze creators first!
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border-2 border-neo-black rounded-xl">
                                            {savedInfluencers.map((inf) => {
                                                const isSelected = selectedCreatorIds.includes(inf.id);
                                                return (
                                                    <div
                                                        key={inf.id}
                                                        onClick={() => toggleCreatorSelection(inf.id)}
                                                        className={`p-2.5 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${isSelected
                                                            ? "bg-neo-yellow text-neo-black font-black"
                                                            : "bg-neo-white hover:bg-neo-black/5"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <AvatarImg
                                                                src={inf.avatar_url || ""}
                                                                name={inf.name}
                                                                handle={inf.handle}
                                                                platform={inf.platform}
                                                                size={32}
                                                            />
                                                            <div>
                                                                <p className="text-xs font-black">{inf.name}</p>
                                                                <p className="text-[10px] font-mono text-neo-black/60">
                                                                    @{inf.handle} • {inf.followers.toLocaleString("en-IN")} followers
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={`w-6 h-6 rounded-lg neo-border flex items-center justify-center ${isSelected ? "bg-neo-black text-white" : "bg-neo-white"
                                                                }`}
                                                        >
                                                            {isSelected && <Check size={14} />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t-2 border-neo-black/10">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="neo-btn bg-neo-black/10 text-neo-black px-4 py-2.5 rounded-xl text-xs font-black"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="neo-btn bg-neo-yellow text-neo-black px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2"
                                    >
                                        {submitting ? "Creating..." : "Launch Campaign"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
