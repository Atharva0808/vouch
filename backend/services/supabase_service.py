"""
Supabase service — handles all database operations
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


# ======== Influencers ========

async def upsert_influencer(data: dict) -> dict:
    sb = get_supabase()
    result = sb.table("influencers").upsert(data, on_conflict="handle,platform").execute()
    return result.data[0] if result.data else {}


async def get_influencer(influencer_id: str) -> dict:
    sb = get_supabase()
    result = sb.table("influencers").select("*").eq("id", influencer_id).single().execute()
    return result.data


async def get_influencer_by_handle(handle: str, platform: str) -> dict | None:
    sb = get_supabase()
    try:
        result = (
            sb.table("influencers")
            .select("*")
            .eq("handle", handle)
            .eq("platform", platform)
            .maybe_single()
            .execute()
        )
        return result.data if result else None
    except Exception:
        return None


async def search_influencers(
    query: str = "",
    platform: str | None = None,
    niche: str | None = None,
    min_followers: int | None = None,
    max_followers: int | None = None,
    min_engagement: float | None = None,
    risk_level: str | None = None,
) -> list[dict]:
    sb = get_supabase()
    q = sb.table("influencers").select("*")
    
    if query:
        q = q.or_(f"name.ilike.%{query}%,handle.ilike.%{query}%,bio.ilike.%{query}%")
    if platform:
        q = q.eq("platform", platform)
    if niche:
        q = q.contains("niche", [niche])
    if min_followers:
        q = q.gte("followers", min_followers)
    if max_followers:
        q = q.lte("followers", max_followers)
    if min_engagement:
        q = q.gte("engagement_rate", min_engagement)
    if risk_level:
        q = q.eq("risk_level", risk_level)
    
    result = q.order("match_score", desc=True).limit(50).execute()
    return result.data or []


async def get_all_influencers(limit: int = 50, offset: int = 0) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("influencers")
        .select("*")
        .order("match_score", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


# ======== Engagement Data ========

async def save_engagement_data(influencer_id: str, data: list[dict]) -> None:
    sb = get_supabase()
    rows = [{"influencer_id": influencer_id, **d} for d in data]
    sb.table("engagement_data").upsert(rows, on_conflict="influencer_id,date").execute()


async def get_engagement_data(influencer_id: str) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("engagement_data")
        .select("*")
        .eq("influencer_id", influencer_id)
        .order("date", desc=False)
        .execute()
    )
    return result.data or []


# ======== Sentiment ========

async def save_sentiment(influencer_id: str, data: dict) -> None:
    sb = get_supabase()
    sb.table("sentiment_analysis").upsert(
        {"influencer_id": influencer_id, **data},
        on_conflict="influencer_id"
    ).execute()


async def get_sentiment(influencer_id: str) -> dict | None:
    sb = get_supabase()
    try:
        result = (
            sb.table("sentiment_analysis")
            .select("*")
            .eq("influencer_id", influencer_id)
            .maybe_single()
            .execute()
        )
        return result.data if result else None
    except Exception:
        return None


# ======== Risk Flags ========

async def save_risk_flags(influencer_id: str, flags: list[dict]) -> None:
    sb = get_supabase()
    # Clear old flags first
    sb.table("risk_flags").delete().eq("influencer_id", influencer_id).execute()
    if flags:
        rows = [{"influencer_id": influencer_id, **f} for f in flags]
        sb.table("risk_flags").insert(rows).execute()


async def get_risk_flags(influencer_id: str) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("risk_flags")
        .select("*")
        .eq("influencer_id", influencer_id)
        .execute()
    )
    return result.data or []


# ======== Reports ========

async def save_report(report: dict) -> dict:
    sb = get_supabase()
    result = sb.table("reports").insert(report).execute()
    return result.data[0] if result.data else {}


async def get_reports(user_id: str | None = None) -> list[dict]:
    sb = get_supabase()
    q = sb.table("reports").select("*")
    if user_id:
        q = q.eq("user_id", user_id)
    result = q.order("created_at", desc=True).limit(50).execute()
    return result.data or []


async def get_report(report_id: str) -> dict | None:
    sb = get_supabase()
    try:
        result = (
            sb.table("reports")
            .select("*")
            .eq("id", report_id)
            .maybe_single()
            .execute()
        )
        return result.data if result else None
    except Exception:
        return None


async def delete_report(report_id: str) -> bool:
    sb = get_supabase()
    try:
        sb.table("reports").delete().eq("id", report_id).execute()
        return True
    except Exception:
        return False


async def get_all_risk_flags() -> list[dict]:
    """Get all risk flags across all influencers with influencer details"""
    sb = get_supabase()
    result = (
        sb.table("risk_flags")
        .select("id, influencer_id, type, severity, description, source, evidence, detected_at, influencers(id, name, handle, platform, avatar_url)")
        .order("detected_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


async def delete_risk_flag(flag_id: str) -> bool:
    """Delete a single risk flag by ID"""
    sb = get_supabase()
    try:
        result = sb.table("risk_flags").delete().eq("id", flag_id).execute()
        return bool(result.data)
    except Exception:
        return False


# ======== User Profile ========

async def get_user_profile(user_id: str) -> dict | None:
    sb = get_supabase()
    try:
        result = (
            sb.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return result.data if result else None
    except Exception:
        return None


async def upsert_user_profile(data: dict) -> dict:
    sb = get_supabase()
    result = sb.table("user_profiles").upsert(data, on_conflict="id").execute()
    return result.data[0] if result.data else {}


async def increment_search_count(user_id: str) -> dict:
    sb = get_supabase()
    profile = await get_user_profile(user_id)
    if profile:
        new_count = profile.get("searches_used", 0) + 1
        result = (
            sb.table("user_profiles")
            .update({"searches_used": new_count})
            .eq("id", user_id)
            .execute()
        )
        return result.data[0] if result.data else {}
    return {}


# ======== Activity Feed ========

async def log_activity(action: str, details: str = "", icon: str = "bell") -> None:
    """Log an activity / notification. Fire-and-forget — never breaks the caller."""
    try:
        sb = get_supabase()
        sb.table("activity_feed").insert({
            "action": action,
            "details": details,
            "icon": icon,
        }).execute()
    except Exception:
        pass  # Never let notification logging break actual operations


async def get_activity_feed(limit: int = 20) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("activity_feed")
        .select("id, action, details, icon, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ======== Delete Operations ========

async def delete_influencer(influencer_id: str) -> bool:
    """Delete an influencer and all related data"""
    sb = get_supabase()
    # Delete related data first
    sb.table("engagement_data").delete().eq("influencer_id", influencer_id).execute()
    sb.table("sentiment_analysis").delete().eq("influencer_id", influencer_id).execute()
    sb.table("risk_flags").delete().eq("influencer_id", influencer_id).execute()
    sb.table("reports").delete().eq("influencer_id", influencer_id).execute()
    # Delete the influencer
    result = sb.table("influencers").delete().eq("id", influencer_id).execute()
    return bool(result.data)


async def clear_all_influencers() -> int:
    """Delete ALL influencers and related data from the database"""
    sb = get_supabase()
    # The child tables have ON DELETE CASCADE, so just delete influencers
    # Use a condition that matches all rows — created_at is always > year 2000
    result = sb.table("influencers").delete().gte("created_at", "2000-01-01").execute()
    return len(result.data) if result.data else 0


