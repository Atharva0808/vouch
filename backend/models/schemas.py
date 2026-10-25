"""
Pydantic models for the Vouch API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Platform(str, Enum):
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TrendDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ======== Influencer ========
class InfluencerCreate(BaseModel):
    name: str
    handle: str
    platform: Platform
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    niche: List[str] = []
    location: Optional[str] = ""


class InfluencerProfile(BaseModel):
    id: str
    name: str
    handle: str
    platform: Platform
    avatar_url: Optional[str] = ""
    followers: int = 0
    following: int = 0
    posts: int = 0
    engagement_rate: float = 0.0
    avg_likes: int = 0
    avg_comments: int = 0
    niche: List[str] = []
    location: Optional[str] = ""
    verified: bool = False
    match_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    predicted_roi: float = 0.0
    bot_percentage: float = 0.0
    trending: TrendDirection = TrendDirection.STABLE
    trend_percent: float = 0.0
    bio: Optional[str] = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ======== Engagement ========
class EngagementDataPoint(BaseModel):
    date: str
    followers: int
    likes: int
    comments: int
    shares: int = 0
    organic: bool = True


# ======== Sentiment ========
class SentimentTheme(BaseModel):
    label: str
    count: int
    sentiment: str  # positive, negative, neutral


class SentimentAnalysis(BaseModel):
    positive: float
    negative: float
    neutral: float
    themes: List[SentimentTheme] = []
    raw_comments_analyzed: int = 0


# ======== Risk ========
class RiskFlag(BaseModel):
    type: str
    severity: Severity
    description: str
    detected_at: str


class RiskAssessment(BaseModel):
    overall_risk: RiskLevel
    bot_percentage: float
    flags: List[RiskFlag] = []


# ======== AI Brief ========
class BriefRequest(BaseModel):
    influencer_id: str
    brand_name: str
    campaign_objective: str
    brand_niche: Optional[str] = ""
    budget: Optional[float] = None
    location: Optional[str] = ""
    deliverables: Optional[List[str]] = []
    target_audience: Optional[List[str]] = []


class BriefResponse(BaseModel):
    brief: str
    influencer_name: str
    match_score: float
    generated_at: str


# ======== Search ========
class SearchRequest(BaseModel):
    query: str
    platform: Optional[Platform] = None
    niche: Optional[str] = None
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    min_engagement: Optional[float] = None
    risk_level: Optional[RiskLevel] = None


# ======== Compare ========
class CompareRequest(BaseModel):
    influencer_a_id: str
    influencer_b_id: str


class CompareMetric(BaseModel):
    label: str
    value_a: str
    value_b: str
    winner: Optional[str] = None  # "a", "b", or None for tie


class CompareResponse(BaseModel):
    influencer_a: InfluencerProfile
    influencer_b: InfluencerProfile
    metrics: List[CompareMetric]
    recommendation: str


# ======== User / Auth ========
class UserProfile(BaseModel):
    id: str
    email: str
    name: Optional[str] = ""
    plan: str = "free"  # free, pro, agency
    searches_used: int = 0
    searches_limit: int = 3
    stripe_customer_id: Optional[str] = None
    created_at: Optional[str] = None


# ======== Stripe ========
class CheckoutRequest(BaseModel):
    price_id: str
    user_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str


# ======== Social Media Fetch ========
class SocialFetchRequest(BaseModel):
    handle: str
    platform: Platform


class SocialFetchResponse(BaseModel):
    profile: InfluencerProfile
    engagement_data: List[EngagementDataPoint]
    recent_posts: List[dict] = []


class CombinedDownloadRequest(BaseModel):
    report_ids: List[str] = Field(..., min_length=1, max_length=20)


# ======== Marketing Drives ========
class CreateDriveRequest(BaseModel):
    brand_name: str
    title: str
    description: str = ""
    category: str = "general"
    location_area: str = ""
    city: str = ""
    platform_preference: str = "any"  # instagram, youtube, any
    target_audience: List[str] = []  # age groups / interests
    min_followers: int = 0
    min_engagement_rate: float = 0.0
    niche_required: List[str] = []
    deliverables: str = ""
    compensation: str = ""  # e.g. "₹5,000 + Free Meal for 2"
    budget: float = 0.0  # in INR
    collab_type: str = "both"  # paid, barter, both
    deadline: Optional[str] = None  # ISO date string
    max_applications: int = 50


class ApplyToDriveRequest(BaseModel):
    creator_name: str = ""
    creator_handle: str = ""
    creator_platform: str = "instagram"
    creator_followers: int = 0
    creator_engagement_rate: float = 0.0
    creator_location: str = ""
    pitch: str = ""
