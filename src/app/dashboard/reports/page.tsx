"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FileText, Download, Calendar, Eye, Loader, Plus, X, Shield, Check, Trash2, Search } from "lucide-react";
import { getReports, generateReport, getAllInfluencers, downloadReportPdf, downloadCombinedReportsPdf, deleteReport, type Report, type InfluencerProfile } from "@/lib/api-client";

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>(["full_analysis"]);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const toggleType = (id: string) => {
        setSelectedTypes(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reportsData, influencersData] = await Promise.all([
                getReports(),
                getAllInfluencers(100)
            ]);
            setReports(reportsData.reports || []);
            setInfluencers(influencersData.results || []);
        } catch (err) {
            console.error("Failed to load reports data", err);
        }
        setLoading(false);
    };

    const handleGenerate = async () => {
        if (!selectedInfluencerId) return;
        setGenerating(true);
        setError("");
        try {
            await Promise.all(selectedTypes.map(type =>
                generateReport(selectedInfluencerId, type)
            ));
            setShowModal(false);
            setSelectedTypes(["full_analysis"]);
            loadData(); // Refresh list
        } catch (err: any) {
            setError(err.message || "Failed to generate report");
        }
        setGenerating(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleDownload = async (reportId: string) => {
        setDownloadingId(reportId);
        setError("");
        try {
            await downloadReportPdf(reportId);
        } catch (err) {
            setError("Failed to download report");
        }
        setDownloadingId(null);
    };

    const handleDownloadAll = async () => {
        if (reports.length === 0) return;
        setDownloadingAll(true);
        setError("");
        try {
            await downloadCombinedReportsPdf(reports.map((r) => r.id));
        } catch (err) {
            setError("Failed to download combined report");
        }
        setDownloadingAll(false);
    };

    const handleDelete = async (reportId: string) => {
        if (typeof window !== "undefined" && !window.confirm("Delete this report? This cannot be undone.")) return;
        setDeletingId(reportId);
        setError("");
        try {
            await deleteReport(reportId);
            setReports((prev) => prev.filter((r) => r.id !== reportId));
        } catch (err) {
            setError("Failed to delete report");
        }
        setDeletingId(null);
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-neo-black">Reports</h1>
                    <p className="text-sm text-neo-black/40 font-semibold">AI-POWERED DECISION MATRIX</p>
                </div>
                <div className="flex items-center gap-2">
                    {reports.length > 1 && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownloadAll}
                            disabled={downloadingAll}
                            className="neo-btn bg-neo-green text-neo-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60"
                        >
                            {downloadingAll ? <Loader size={16} className="animate-spin" /> : <FileText size={16} />}
                            {downloadingAll ? "Preparing…" : "Download All as PDF"}
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowModal(true)}
                        className="neo-btn bg-neo-pink text-neo-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} /> Generate New
                    </motion.button>
                </div>
            </motion.div>

            {error && (
                <p className="text-xs text-neo-red font-bold p-3 bg-neo-red/10 rounded-xl border-l-4 border-neo-red">
                    {error}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader className="animate-spin text-neo-pink" size={32} />
                </div>
            ) : reports.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {reports.map((report, i) => (
                        <motion.div
                            key={report.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="neo-card rounded-2xl p-6 bg-neo-white hover:border-neo-pink transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-neo-black/5 neo-border rounded-xl group-hover:bg-neo-pink/10 transition-colors">
                                    <FileText size={24} className="text-neo-black" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-neo-black truncate">{report.name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-neo-black/40">
                                            <Calendar size={10} /> {formatDate(report.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-neo-black/40">
                                            <Eye size={10} /> {report.report_data?.pages || 0} Pages
                                        </span>
                                        <span className="neo-badge bg-neo-green/20 text-green-700 px-2 py-0.5 rounded text-[10px] uppercase">
                                            {report.report_data?.type?.replace('_', ' ') || 'Report'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDownload(report.id)}
                                        disabled={downloadingId === report.id}
                                        className="neo-btn bg-neo-yellow p-3 rounded-xl disabled:opacity-60"
                                        title="Download PDF"
                                    >
                                        {downloadingId === report.id ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDelete(report.id)}
                                        disabled={deletingId === report.id}
                                        className="neo-btn bg-neo-red/90 text-neo-white p-3 rounded-xl disabled:opacity-60"
                                        title="Delete report"
                                    >
                                        {deletingId === report.id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="neo-card rounded-2xl p-12 text-center bg-neo-white">
                    <FileText size={48} className="mx-auto mb-4 text-neo-black/10" />
                    <h3 className="text-lg font-bold text-neo-black">No reports generated</h3>
                    <p className="text-sm text-neo-black/40 mb-6">Start by generating your first AI analysis report.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="neo-btn bg-neo-pink text-neo-white px-6 py-3 rounded-xl text-sm font-bold"
                    >
                        Generate Your First Report
                    </button>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-neo-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg neo-card rounded-3xl bg-neo-white p-8 overflow-hidden"
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-neo-black/5 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-neo-black/5">
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-tight">Generate Intelligence Report</h2>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-neo-black/40 mb-2 block">
                                        Step 1: Select Influencer
                                    </label>
                                    <select
                                        value={selectedInfluencerId}
                                        onChange={(e) => setSelectedInfluencerId(e.target.value)}
                                        className="neo-input w-full py-4 px-4 rounded-2xl text-sm"
                                    >
                                        <option value="">Choose from your collection...</option>
                                        {influencers.map((inf) => (
                                            <option key={inf.id} value={inf.id}>
                                                {inf.name} (@{inf.handle})
                                            </option>
                                        ))}
                                    </select>
                                    {influencers.length === 0 && (
                                        <p className="text-[10px] text-neo-red mt-2 font-bold px-2">
                                            No influencers found. Please fetch an influencer first.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs font-bold uppercase text-neo-black/40 block">
                                            Step 2: Selection Report Types
                                        </label>
                                        <button
                                            onClick={() => setSelectedTypes(["full_analysis", "brand_safety", "risk_assessment", "roi_prediction"])}
                                            className="text-[10px] font-bold text-neo-pink hover:underline"
                                        >
                                            SELECT ALL
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { id: "full_analysis", label: "Full Analysis", icon: Eye },
                                            { id: "brand_safety", label: "Brand Safety", icon: Shield },
                                            { id: "risk_assessment", label: "Risk Audit", icon: Search },
                                            { id: "roi_prediction", label: "ROI Forecast", icon: Calendar },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => toggleType(t.id)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${selectedTypes.includes(t.id)
                                                    ? "bg-neo-yellow border-neo-black text-neo-black neo-shadow-sm"
                                                    : "bg-neo-white border-neo-black/10 text-neo-black/60 hover:border-neo-black/30"
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTypes.includes(t.id) ? "border-neo-black bg-neo-black text-neo-white" : "border-neo-black/20"}`}>
                                                    {selectedTypes.includes(t.id) && <Check size={10} />}
                                                </div>
                                                <t.icon size={16} />
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-xs text-neo-red font-bold p-3 bg-neo-red/10 rounded-xl border-l-4 border-neo-red">
                                        {error}
                                    </p>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={!selectedInfluencerId || generating}
                                    onClick={handleGenerate}
                                    className="neo-btn w-full bg-neo-black text-neo-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <>
                                            <Loader size={18} className="animate-spin" /> RUNNING AUDIT...
                                        </>
                                    ) : (
                                        <>
                                            Generate Report
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
