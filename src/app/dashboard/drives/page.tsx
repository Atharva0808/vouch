"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Megaphone,
    Plus,
    Search,
    MapPin,
    Users,
    TrendingUp,
    IndianRupee,
    Calendar,
    CheckCircle,
    Clock,
    X,
    Filter,
    Send,
    Sparkles,
    Building2,
    Eye,
    Trash2,
    Briefcase,
    Store,
    ArrowUpRight,
    SlidersHorizontal,
    Star,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Check,
} from "lucide-react";
import {
    getDrives,
    getDrive,
    getMyDrives,
    getMyApplications,
    createDrive,
    applyToDrive,
    deleteDrive,
    updateApplicationStatus,
    type MarketingDrive,
    type DriveApplication,
    formatNumber,
} from "@/lib/api-client";
import { getStoredUserProfile, type OnboardingProfile } from "@/lib/user-profile";

export default function MarketingDrivesPage() {
    const [profile, setProfile] = useState<OnboardingProfile>(getStoredUserProfile());
    const [activeTab, setActiveTab] = useState<"browse" | "my-drives" | "my-applications">("browse");

    // Drives lists
    const [drives, setDrives] = useState<MarketingDrive[]>([]);
    const [myDrives, setMyDrives] = useState<MarketingDrive[]>([]);
    const [myApplications, setMyApplications] = useState<DriveApplication[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCity, setSelectedCity] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Create Drive Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        brand_name: profile.business_name || "Brand Partner",
        title: "",
        description: "",
        category: profile.category || "cafe_restaurant",
        location_area: profile.location_area || "Central Area",
        city: profile.city || "Navi Mumbai",
        platform_preference: "instagram",
        min_followers: 5000,
        min_engagement_rate: 3.0,
        deliverables: "1 Reel + 2 Stories",
        compensation: "₹5,000",
        budget: 20000,
        collab_type: "both",
        max_applications: 20,
    });

    // Apply Modal State
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [selectedDriveForApply, setSelectedDriveForApply] = useState<MarketingDrive | null>(null);
    const [applying, setApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);
    const [applyForm, setApplyForm] = useState({
        creator_name: profile.business_name || "Creator",
        creator_handle: profile.social_handle || "@creator",
        creator_platform: "instagram",
        creator_followers: 25000,
        creator_engagement_rate: 4.5,
        creator_location: profile.city || "Navi Mumbai",
        pitch: "",
    });

    // View Applications Modal (Brand Side)
    const [viewApplicantsDrive, setViewApplicantsDrive] = useState<MarketingDrive | null>(null);

    useEffect(() => {
        const p = getStoredUserProfile();
        setProfile(p);
        setCreateForm((prev) => ({
            ...prev,
            brand_name: p.business_name || prev.brand_name,
            location_area: p.location_area || prev.location_area,
            city: p.city || prev.city,
            category: p.category || prev.category,
        }));
        loadDrivesData();
    }, []);

    const loadDrivesData = async () => {
        setLoading(true);
        try {
            // Load real drives from backend
            const browseRes = await getDrives();
            setDrives(browseRes.drives || []);

            // Load user's posted drives
            const myDrivesRes = await getMyDrives();
            if (myDrivesRes.drives) {
                setMyDrives(myDrivesRes.drives);
            }

            // Load user's applications
            const myAppsRes = await getMyApplications();
            if (myAppsRes.applications) {
                setMyApplications(myAppsRes.applications);
            }
        } catch {
            setDrives([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDrive = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await createDrive({
                ...createForm,
                niche_required: [createForm.category],
                target_audience: ["Local Customers", "Target City"],
            });
            if (res.drive) {
                setDrives((prev) => [res.drive, ...prev]);
                setMyDrives((prev) => [res.drive, ...prev]);
            }
            setCreateModalOpen(false);
            setActiveTab("my-drives");
        } catch (err: any) {
            alert(err?.message || "Failed to create drive. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleOpenApply = (drive: MarketingDrive) => {
        setSelectedDriveForApply(drive);
        setApplySuccess(false);
        setApplyModalOpen(true);
    };

    const handleSubmitApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriveForApply) return;
        setApplying(true);
        try {
            await applyToDrive(selectedDriveForApply.id, applyForm);
            setApplySuccess(true);
            setTimeout(() => {
                setApplyModalOpen(false);
                setApplySuccess(false);
                loadDrivesData();
                setActiveTab("my-applications");
            }, 1800);
        } catch (err: any) {
            alert(err?.message || "Application could not be submitted.");
            setApplying(false);
        }
    };

    const handleDeleteDrive = async (driveId: string) => {
        if (!confirm("Are you sure you want to delete this marketing drive?")) return;
        try {
            await deleteDrive(driveId);
            setDrives((prev) => prev.filter((d) => d.id !== driveId));
            setMyDrives((prev) => prev.filter((d) => d.id !== driveId));
        } catch (err: any) {
            alert(err?.message || "Failed to delete drive");
        }
    };

    const handleOpenReviewApplicants = async (drive: MarketingDrive) => {
        setViewApplicantsDrive(drive);
        try {
            const full = await getDrive(drive.id);
            if (full && full.applications) {
                setViewApplicantsDrive(full);
            }
        } catch {
            // retain existing
        }
    };

    const handleUpdateAppStatus = async (appId: string, status: string) => {
        try {
            await updateApplicationStatus(appId, status);
            // Refresh
            if (viewApplicantsDrive) {
                const updatedApps = (viewApplicantsDrive.applications || []).map((a) =>
                    a.id === appId ? { ...a, status } : a
                );
                setViewApplicantsDrive({ ...viewApplicantsDrive, applications: updatedApps });
            }
            loadDrivesData();
        } catch (err: any) {
            alert(err?.message || "Failed to update application status");
        }
    };

    // Filter drives
    const filteredDrives = drives.filter((d) => {
        const matchesSearch =
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.location_area.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = selectedCity === "all" || d.city.toLowerCase() === selectedCity.toLowerCase();
        const matchesCategory = selectedCategory === "all" || d.category === selectedCategory;
        return matchesSearch && matchesCity && matchesCategory;
    });

    const isBrand = profile.account_type === "brand" || !profile.account_type;

    return (
        <div className="space-y-6 pb-16">
            {/* Header Banner */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="neo-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-300 via-neo-yellow to-orange-300 text-neo-black relative overflow-hidden"
            >
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full neo-border bg-neo-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                <Megaphone size={14} className="text-orange-600" />
                                Campaign Drives Engine
                            </span>
                            <span className="px-3 py-1 rounded-full neo-border bg-neo-black text-neo-white text-[11px] font-black uppercase tracking-wider">
                                {isBrand ? "Brand Campaign Manager" : "Creator Opportunity Hub"}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">
                            Marketing Drives
                        </h1>
                        <p className="text-neo-black/85 text-xs sm:text-sm font-semibold max-w-2xl leading-relaxed">
                            {isBrand
                                ? "Publish verified campaign drives with defined deliverables, eligibility criteria, and INR budgets. Receive verified applications from high-converting local creators."
                                : "Discover high-paying marketing drives from verified brands in your city. Apply directly with your audited engagement rate and media kit."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {isBrand && (
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setCreateModalOpen(true)}
                                className="neo-btn bg-neo-black text-neo-white px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-md"
                            >
                                <Plus size={18} /> Post a Marketing Drive
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-neo-black/10 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("browse")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                            activeTab === "browse"
                                ? "bg-neo-yellow neo-border text-neo-black shadow-sm"
                                : "text-neo-black/60 hover:text-neo-black"
                        }`}
                    >
                        <Search size={16} /> All Active Drives ({drives.length})
                    </button>

                    {isBrand && (
                        <button
                            onClick={() => setActiveTab("my-drives")}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                                activeTab === "my-drives"
                                    ? "bg-neo-yellow neo-border text-neo-black shadow-sm"
                                    : "text-neo-black/60 hover:text-neo-black"
                            }`}
                        >
                            <Building2 size={16} /> My Posted Drives ({myDrives.length})
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab("my-applications")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                            activeTab === "my-applications"
                                ? "bg-neo-yellow neo-border text-neo-black shadow-sm"
                                : "text-neo-black/60 hover:text-neo-black"
                        }`}
                    >
                        <Briefcase size={16} /> My Applications ({myApplications.length})
                    </button>
                </div>

                {activeTab === "browse" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-black/40" />
                            <input
                                type="text"
                                placeholder="Search by title, brand, or area..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="neo-input w-full pl-9 pr-3 py-2 text-xs rounded-xl font-bold bg-neo-white"
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="neo-input px-3 py-2 text-xs rounded-xl font-bold bg-neo-white hidden md:block"
                        >
                            <option value="all">All Categories</option>
                            <option value="cafe_restaurant">Cafe & Restaurant</option>
                            <option value="fashion_apparel">Fashion & Apparel</option>
                            <option value="fitness_wellness">Fitness & Gym</option>
                            <option value="beauty_cosmetics">Beauty & Skincare</option>
                        </select>
                    </div>
                )}
            </div>

            {/* TAB 1: ALL ACTIVE DRIVES */}
            {activeTab === "browse" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="neo-card p-6 rounded-2xl bg-neo-white animate-pulse h-48" />
                            ))}
                        </div>
                    ) : filteredDrives.length === 0 ? (
                        <div className="neo-card p-12 rounded-3xl bg-neo-white text-center space-y-3">
                            <Megaphone size={40} className="mx-auto text-neo-black/30" />
                            <h3 className="text-lg font-black text-neo-black">No Marketing Drives Found</h3>
                            <p className="text-xs text-neo-black/60 max-w-sm mx-auto">
                                No active drives match your search query. Try adjusting your filters or be the first to post a new campaign drive!
                            </p>
                            {isBrand && (
                                <button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="neo-btn bg-neo-yellow px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5"
                                >
                                    <Plus size={14} /> Create First Drive
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {filteredDrives.map((drive) => {
                                const daysLeft = Math.max(
                                    1,
                                    Math.ceil(
                                        (new Date(drive.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    )
                                );
                                return (
                                    <motion.div
                                        key={drive.id}
                                        whileHover={{ y: -3 }}
                                        className="neo-card bg-neo-white rounded-2xl p-6 flex flex-col justify-between space-y-4 relative overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            {/* Top badges */}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2.5 py-0.5 rounded-md neo-border bg-neo-yellow text-[10px] font-black uppercase text-neo-black">
                                                        {drive.category.replace(/_/g, " ")}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-md neo-border bg-neo-black/5 text-[10px] font-bold text-neo-black/80 flex items-center gap-1">
                                                        <MapPin size={11} className="text-neo-pink" />
                                                        {drive.location_area}, {drive.city}
                                                    </span>
                                                </div>

                                                <span className="px-2.5 py-0.5 rounded-md neo-border bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                                                    <Clock size={11} /> {daysLeft} Days Left
                                                </span>
                                            </div>

                                            {/* Drive Title & Brand */}
                                            <div>
                                                <h3 className="text-lg font-black text-neo-black tracking-tight leading-snug">
                                                    {drive.title}
                                                </h3>
                                                <p className="text-xs font-bold text-neo-black/50 flex items-center gap-1 mt-0.5">
                                                    <Store size={13} /> {drive.brand_name}
                                                </p>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-neo-black/75 font-medium line-clamp-3 leading-relaxed">
                                                {drive.description}
                                            </p>
                                        </div>

                                        {/* Deliverables & Pay */}
                                        <div className="p-3.5 rounded-xl bg-neo-black/5 space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-neo-black/60 font-bold">Deliverables:</span>
                                                <span className="font-black text-neo-black text-right max-w-[240px] truncate">
                                                    {drive.deliverables}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-neo-black/60 font-bold">Compensation Offer:</span>
                                                <span className="font-black text-orange-600 text-sm">
                                                    {drive.compensation}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 border-t border-neo-black/10">
                                                <span className="text-neo-black/60 font-bold">Eligibility:</span>
                                                <span className="font-bold text-neo-black text-[11px]">
                                                    Min {formatNumber(drive.min_followers)} followers • {drive.min_engagement_rate}% ER
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-between gap-3 pt-1">
                                            <div className="text-[11px] font-bold text-neo-black/50">
                                                {drive.applications_count || 0} / {drive.max_applications} Applicants
                                            </div>

                                            <button
                                                onClick={() => handleOpenApply(drive)}
                                                className="neo-btn bg-neo-yellow text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:scale-105 transition-transform"
                                            >
                                                <Send size={14} /> Apply to Drive
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MY POSTED DRIVES (BRAND VIEW) */}
            {activeTab === "my-drives" && (
                <div className="space-y-4">
                    {myDrives.length === 0 ? (
                        <div className="neo-card p-12 rounded-3xl bg-neo-white text-center space-y-4">
                            <Building2 size={44} className="mx-auto text-neo-black/30" />
                            <h3 className="text-lg font-black text-neo-black">No Marketing Drives Posted Yet</h3>
                            <p className="text-xs text-neo-black/60 max-w-sm mx-auto">
                                You haven't posted any marketing drives yet. Create your first campaign drive to invite creators with footfall verification!
                            </p>
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="neo-btn bg-neo-yellow px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-2"
                            >
                                <Plus size={16} /> Post New Campaign Drive
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myDrives.map((drive) => (
                                <motion.div
                                    key={drive.id}
                                    className="neo-card bg-neo-white rounded-2xl p-6 space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-neo-black">{drive.title}</h3>
                                                <span className="px-2 py-0.5 rounded-md neo-border bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                                    {drive.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neo-black/60 font-semibold mt-0.5">
                                                {drive.location_area}, {drive.city} • Budget: ₹{drive.budget?.toLocaleString() || "N/A"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenReviewApplicants(drive)}
                                                className="neo-btn bg-neo-yellow text-neo-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"
                                            >
                                                <Eye size={14} /> Review Applicants ({drive.applications?.length || drive.applications_count || 0})
                                            </button>

                                            <button
                                                onClick={() => handleDeleteDrive(drive.id)}
                                                className="neo-btn bg-red-100 text-red-700 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-red-200"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-neo-black/10">
                                        <div className="p-2.5 rounded-xl bg-neo-black/5">
                                            <div className="text-[10px] font-bold text-neo-black/50">Deliverables</div>
                                            <div className="font-black text-neo-black truncate mt-0.5">{drive.deliverables}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-neo-black/5">
                                            <div className="text-[10px] font-bold text-neo-black/50">Offer</div>
                                            <div className="font-black text-orange-600 truncate mt-0.5">{drive.compensation}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-neo-black/5">
                                            <div className="text-[10px] font-bold text-neo-black/50">Eligibility</div>
                                            <div className="font-black text-neo-black mt-0.5">
                                                Min {formatNumber(drive.min_followers)} flw
                                            </div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-neo-black/5">
                                            <div className="text-[10px] font-bold text-neo-black/50">Applications Cap</div>
                                            <div className="font-black text-neo-black mt-0.5">
                                                {drive.applications_count || 0} / {drive.max_applications} Max
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: MY APPLICATIONS (CREATOR VIEW) */}
            {activeTab === "my-applications" && (
                <div className="space-y-4">
                    {myApplications.length === 0 ? (
                        <div className="neo-card p-12 rounded-3xl bg-neo-white text-center space-y-4">
                            <Briefcase size={44} className="mx-auto text-neo-black/30" />
                            <h3 className="text-lg font-black text-neo-black">No Applications Submitted Yet</h3>
                            <p className="text-xs text-neo-black/60 max-w-sm mx-auto">
                                You haven't applied to any marketing drives yet. Browse the active drives feed and apply to earn brand sponsorships!
                            </p>
                            <button
                                onClick={() => setActiveTab("browse")}
                                className="neo-btn bg-neo-yellow px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-2"
                            >
                                <Search size={16} /> Explore Active Drives
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myApplications.map((app) => (
                                <motion.div
                                    key={app.id}
                                    className="neo-card bg-neo-white rounded-2xl p-5 space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-base text-neo-black">
                                                    {app.marketing_drives?.title || "Campaign Drive Application"}
                                                </h3>
                                                <span
                                                    className={`px-2 py-0.5 rounded-md neo-border text-[10px] font-black uppercase ${
                                                        app.status === "accepted"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : app.status === "rejected"
                                                            ? "bg-red-100 text-red-800"
                                                            : app.status === "shortlisted"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}
                                                >
                                                    {app.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-neo-black/50 mt-0.5">
                                                Applied on: {new Date(app.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xs font-black text-orange-600">
                                                {app.marketing_drives?.compensation || "Compensation on review"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-neo-black/5 text-xs text-neo-black/80">
                                        <span className="font-bold text-neo-black block text-[10px] uppercase text-neo-black/50 mb-1">
                                            Your Pitch:
                                        </span>
                                        "{app.pitch}"
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* =========================================================================
                MODAL 1: CREATE MARKETING DRIVE (BRAND POSTING)
               ========================================================================= */}
            <AnimatePresence>
                {createModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="neo-card bg-neo-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 my-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b-2 border-neo-black/10 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-neo-yellow neo-border">
                                        <Megaphone size={20} className="text-neo-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-neo-black">Post a Marketing Drive</h3>
                                        <p className="text-xs text-neo-black/50 font-bold">
                                            Attract top verified local creators for your brand campaign
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-neo-black/10"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateDrive} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Brand / Business Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.brand_name}
                                            onChange={(e) => setCreateForm({ ...createForm, brand_name: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Category
                                        </label>
                                        <select
                                            value={createForm.category}
                                            onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        >
                                            <option value="cafe_restaurant">Cafe & Restaurant</option>
                                            <option value="fashion_apparel">Fashion & Apparel</option>
                                            <option value="fitness_wellness">Fitness & Gym</option>
                                            <option value="beauty_cosmetics">Beauty & Skincare</option>
                                            <option value="tech_gadgets">Tech & Electronics</option>
                                            <option value="local_services">Local Retail & Services</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-neo-black/70">
                                        Drive Campaign Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Grand Opening Food Tasting & Instagram Reel Campaign"
                                        value={createForm.title}
                                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                        className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-neo-black/70">
                                        Campaign Brief & Scope
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Describe what you want the creators to highlight, tone of voice, dates for store visit, etc."
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        className="neo-input w-full p-2.5 rounded-xl text-xs font-medium bg-neo-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Store / Target Area
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Seawoods, Vashi, Kalyan"
                                            value={createForm.location_area}
                                            onChange={(e) => setCreateForm({ ...createForm, location_area: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Navi Mumbai, Mumbai, Pune"
                                            value={createForm.city}
                                            onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Deliverables
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 1 In-Store Reel + 2 Stories"
                                            value={createForm.deliverables}
                                            onChange={(e) => setCreateForm({ ...createForm, deliverables: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Compensation / Offer
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. ₹5,000 + Free Meal for 2"
                                            value={createForm.compensation}
                                            onChange={(e) => setCreateForm({ ...createForm, compensation: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Total Budget (₹ INR)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={createForm.budget}
                                            onChange={(e) => setCreateForm({ ...createForm, budget: Number(e.target.value) })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Min Followers
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={createForm.min_followers}
                                            onChange={(e) => setCreateForm({ ...createForm, min_followers: Number(e.target.value) })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-neo-black/70">
                                            Min ER (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={createForm.min_engagement_rate}
                                            onChange={(e) => setCreateForm({ ...createForm, min_engagement_rate: Number(e.target.value) })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-neo-black/10">
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(false)}
                                        className="neo-btn bg-neo-white text-neo-black px-4 py-2.5 rounded-xl text-xs font-black"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="neo-btn bg-neo-yellow text-neo-black px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5"
                                    >
                                        {creating ? "Publishing Drive..." : "Publish Marketing Drive"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* =========================================================================
                MODAL 2: APPLY TO DRIVE (CREATOR APPLICATION)
               ========================================================================= */}
            <AnimatePresence>
                {applyModalOpen && selectedDriveForApply && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="neo-card bg-neo-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5"
                        >
                            <div className="flex items-center justify-between border-b-2 border-neo-black/10 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-neo-yellow neo-border">
                                        <Send size={20} className="text-neo-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-neo-black">Apply to Marketing Drive</h3>
                                        <p className="text-xs text-neo-black/50 font-bold">
                                            {selectedDriveForApply.title} ({selectedDriveForApply.brand_name})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setApplyModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-neo-black/10"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {applySuccess ? (
                                <div className="text-center py-8 space-y-3">
                                    <CheckCircle size={52} className="mx-auto text-emerald-500 animate-bounce" />
                                    <h4 className="font-black text-xl text-neo-black">Application Submitted!</h4>
                                    <p className="text-xs text-neo-black/60 max-w-xs mx-auto">
                                        Your pitch and verified metrics have been dispatched to {selectedDriveForApply.brand_name}. You can track the status in "My Applications".
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitApplication} className="space-y-4">
                                    <div className="p-3.5 rounded-2xl bg-neo-black/5 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Offered Pay:</span>
                                            <span className="font-black text-orange-600">{selectedDriveForApply.compensation}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Deliverables:</span>
                                            <span className="font-black text-neo-black">{selectedDriveForApply.deliverables}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-neo-black/60 font-bold">Location:</span>
                                            <span className="font-black text-neo-black">{selectedDriveForApply.location_area}, {selectedDriveForApply.city}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black uppercase text-neo-black/70">Your Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={applyForm.creator_name}
                                                onChange={(e) => setApplyForm({ ...applyForm, creator_name: e.target.value })}
                                                className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black uppercase text-neo-black/70">Social Handle</label>
                                            <input
                                                type="text"
                                                required
                                                value={applyForm.creator_handle}
                                                onChange={(e) => setApplyForm({ ...applyForm, creator_handle: e.target.value })}
                                                className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black uppercase text-neo-black/70">Followers Count</label>
                                            <input
                                                type="number"
                                                required
                                                value={applyForm.creator_followers}
                                                onChange={(e) => setApplyForm({ ...applyForm, creator_followers: Number(e.target.value) })}
                                                className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black uppercase text-neo-black/70">Engagement Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                required
                                                value={applyForm.creator_engagement_rate}
                                                onChange={(e) => setApplyForm({ ...applyForm, creator_engagement_rate: Number(e.target.value) })}
                                                className="neo-input w-full p-2.5 rounded-xl text-xs font-bold bg-neo-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-neo-black/70">Your Pitch & Relevant Links</label>
                                        <textarea
                                            rows={3}
                                            required
                                            value={applyForm.pitch}
                                            onChange={(e) => setApplyForm({ ...applyForm, pitch: e.target.value })}
                                            className="neo-input w-full p-2.5 rounded-xl text-xs font-medium bg-neo-white"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-neo-black/10">
                                        <button
                                            type="button"
                                            onClick={() => setApplyModalOpen(false)}
                                            className="neo-btn bg-neo-white text-neo-black px-4 py-2.5 rounded-xl text-xs font-black"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={applying}
                                            className="neo-btn bg-neo-yellow text-neo-black px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5"
                                        >
                                            {applying ? "Submitting..." : "Submit Application"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* =========================================================================
                MODAL 3: REVIEW APPLICANTS (BRAND VIEW)
               ========================================================================= */}
            <AnimatePresence>
                {viewApplicantsDrive && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="neo-card bg-neo-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 my-8 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b-2 border-neo-black/10 pb-4">
                                <div>
                                    <h3 className="font-black text-lg text-neo-black">
                                        Applicants for "{viewApplicantsDrive.title}"
                                    </h3>
                                    <p className="text-xs text-neo-black/50 font-bold">
                                        Review creator pitches and manage acceptance
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewApplicantsDrive(null)}
                                    className="p-1.5 rounded-lg hover:bg-neo-black/10"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {(!viewApplicantsDrive.applications || viewApplicantsDrive.applications.length === 0) ? (
                                <div className="text-center py-8 space-y-2">
                                    <Users size={36} className="mx-auto text-neo-black/30" />
                                    <p className="text-xs font-bold text-neo-black/60">
                                        No applications received for this drive yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {viewApplicantsDrive.applications.map((app) => (
                                        <div
                                            key={app.id}
                                            className="p-4 rounded-2xl bg-neo-black/5 neo-border space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-black text-sm text-neo-black">
                                                        {app.creator_name}{" "}
                                                        <span className="text-xs text-neo-black/50 font-bold">
                                                            ({app.creator_handle})
                                                        </span>
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-neo-black/70">
                                                        <span>{formatNumber(app.creator_followers)} followers</span>
                                                        <span>•</span>
                                                        <span className="text-neo-pink font-bold">
                                                            {app.creator_engagement_rate}% ER
                                                        </span>
                                                        <span>•</span>
                                                        <span>{app.creator_location}</span>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`px-2.5 py-0.5 rounded-md neo-border text-[10px] font-black uppercase ${
                                                        app.status === "accepted"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : app.status === "rejected"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}
                                                >
                                                    {app.status}
                                                </span>
                                            </div>

                                            <p className="text-xs text-neo-black/85 bg-neo-white p-3 rounded-xl neo-border font-medium">
                                                "{app.pitch}"
                                            </p>

                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                <button
                                                    onClick={() => handleUpdateAppStatus(app.id, "accepted")}
                                                    className="neo-btn bg-emerald-400 text-neo-black px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1"
                                                >
                                                    <Check size={12} /> Accept & Hire
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateAppStatus(app.id, "shortlisted")}
                                                    className="neo-btn bg-blue-300 text-neo-black px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1"
                                                >
                                                    <Star size={12} /> Shortlist
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateAppStatus(app.id, "rejected")}
                                                    className="neo-btn bg-red-200 text-neo-black px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1"
                                                >
                                                    <X size={12} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
