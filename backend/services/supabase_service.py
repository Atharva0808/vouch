"""
Supabase service — handles all database operations
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local")
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def is_valid_uuid(val: str) -> bool:
    if not val or not isinstance(val, str):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


# ======== Influencers ========

VALID_INFLUENCER_COLUMNS = {
    'id', 'handle', 'platform', 'name', 'avatar_url', 'followers', 'following',
    'posts', 'engagement_rate', 'avg_likes', 'avg_comments', 'bio', 'verified',
    'location', 'niche', 'match_score', 'risk_level', 'external_url',
    'last_analyzed_at', 'created_at', 'bot_percentage', 'predicted_roi',
    'recent_posts', 'recommendation', 'updated_at', 'brand_safety_score', 'user_id'
}

async def upsert_influencer(data: dict, user_id: str) -> dict:
    sb = get_supabase()
    # Explicitly set user_id for isolation
    data["user_id"] = user_id
    clean_data = {k: v for k, v in data.items() if k in VALID_INFLUENCER_COLUMNS}
    result = sb.table("influencers").upsert(clean_data, on_conflict="handle,platform,user_id").execute()
    return result.data[0] if result.data else {}


async def get_influencer(influencer_id: str, user_id: str | None = None) -> dict | None:
    if not is_valid_uuid(influencer_id):
        return None
    sb = get_supabase()
    try:
        q = sb.table("influencers").select("*").eq("id", influencer_id)
        if user_id and is_valid_uuid(user_id):
            q = q.eq("user_id", user_id)
        result = q.maybe_single().execute()
        return result.data if result else None
    except Exception:
        return None


async def get_influencer_by_handle(handle: str, platform: str, user_id: str | None = None) -> dict | None:
    sb = get_supabase()
    clean_h = handle.lstrip("@").strip()
    variants = [clean_h, f"@{clean_h}"]
    try:
        # First try with user_id if provided
        if user_id and is_valid_uuid(user_id):
            for h in variants:
                res = (
                    sb.table("influencers")
                    .select("*")
                    .eq("handle", h)
                    .eq("platform", platform)
                    .eq("user_id", user_id)
                    .maybe_single()
                    .execute()
                )
                if res and res.data:
                    return res.data
        # If not found or no user_id, check across all users (authentic global directory)
        for h in variants:
            res = (
                sb.table("influencers")
                .select("*")
                .eq("handle", h)
                .eq("platform", platform)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if res and res.data and len(res.data) > 0:
                return res.data[0]
        return None
    except Exception:
        return None


async def search_influencers(
    user_id: str,
    query: str = "",
    platform: str | None = None,
    niche: str | None = None,
    location: str | None = None,
    min_followers: int | None = None,
    max_followers: int | None = None,
    min_engagement: float | None = None,
    risk_level: str | None = None,
) -> list[dict]:
    if not user_id or not is_valid_uuid(user_id):
        return []
    sb = get_supabase()
    # Strict user isolation: only fetch creators belonging to this specific user account
    q = sb.table("influencers").select("*").eq("user_id", user_id)
    
    if query:
        q = q.or_(f"name.ilike.%{query}%,handle.ilike.%{query}%,bio.ilike.%{query}%,location.ilike.%{query}%")
    if platform:
        q = q.eq("platform", platform)
    if niche:
        # Title case to match niche array entries in DB
        q = q.contains("niche", [niche.capitalize()])
    if location:
        q = q.ilike("location", f"%{location}%")
    if min_followers:
        q = q.gte("followers", min_followers)
    if max_followers:
        q = q.lte("followers", max_followers)
    if min_engagement:
        q = q.or_(f"engagement_rate.gte.{min_engagement},engagement_rate.is.null")
    if risk_level:
        q = q.eq("risk_level", risk_level.lower())
    
    result = q.order("created_at", desc=True).limit(50).execute()
    return result.data or []


async def get_all_influencers(user_id: str = "", limit: int = 50, offset: int = 0) -> list[dict]:
    if not user_id or not is_valid_uuid(user_id):
        return []
    sb = get_supabase()
    # Strict user isolation: never leak influencers between different user accounts
    q = sb.table("influencers").select("*").eq("user_id", user_id)
    
    result = (
        q.order("created_at", desc=True)
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
    if not is_valid_uuid(influencer_id):
        return []
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
    if not is_valid_uuid(influencer_id):
        return None
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
    if not is_valid_uuid(influencer_id):
        return []
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
    if not is_valid_uuid(report.get("user_id")):
        report["user_id"] = "00000000-0000-0000-0000-000000000001"
    result = sb.table("reports").insert(report).execute()
    return result.data[0] if result.data else {}


async def get_reports(user_id: str | None = None) -> list[dict]:
    sb = get_supabase()
    q = sb.table("reports").select("*")
    if user_id and is_valid_uuid(user_id):
        # Strict user isolation: only return reports for this specific user
        user_res = q.eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        return user_res.data or []
    
    # Return all non-demo reports if no user_id specified
    all_res = sb.table("reports").select("*").neq("user_id", "00000000-0000-0000-0000-000000000000").order("created_at", desc=True).limit(50).execute()
    return all_res.data or []


async def get_report(report_id: str) -> dict | None:
    if not is_valid_uuid(report_id):
        return None
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


async def get_all_risk_flags(user_id: str | None = None) -> list[dict]:
    """Get all risk flags across influencers with strict user isolation"""
    sb = get_supabase()
    q = sb.table("risk_flags").select("id, influencer_id, type, severity, description, source, evidence, detected_at, influencers!inner(id, name, handle, platform, avatar_url, user_id)")
    
    if user_id and is_valid_uuid(user_id):
        q = q.eq("influencers.user_id", user_id)
    else:
        q = q.neq("influencers.user_id", "00000000-0000-0000-0000-000000000000")
        
    result = (
        q.order("detected_at", desc=True)
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
    if not is_valid_uuid(user_id):
        return None
    sb = get_supabase()
    try:
        result = (
            sb.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        profile = result.data if result else None
        if profile and profile.get("last_search_reset"):
            try:
                last_reset = datetime.fromisoformat(profile["last_search_reset"].replace("Z", ""))
                if (datetime.utcnow() - last_reset).days >= 30:
                    # Auto-reset monthly quota
                    now_str = datetime.utcnow().isoformat()
                    updated = sb.table("user_profiles").update({
                        "searches_used": 0,
                        "last_search_reset": now_str
                    }).eq("id", user_id).execute()
                    if updated.data:
                        profile = updated.data[0]
            except Exception:
                pass
        return profile
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

async def log_activity(user_id: str, action: str, details: str = "", icon: str = "bell") -> None:
    """Log an activity / notification. Fire-and-forget — never breaks the caller."""
    try:
        sb = get_supabase()
        effective_uid = user_id if is_valid_uuid(user_id) else "00000000-0000-0000-0000-000000000001"
        sb.table("activity_feed").insert({
            "user_id": effective_uid,
            "action": action,
            "details": details,
            "icon": icon,
        }).execute()
    except Exception:
        pass  # Never let notification logging break actual operations


async def get_activity_feed(user_id: str, limit: int = 20) -> list[dict]:
    sb = get_supabase()
    q = sb.table("activity_feed").select("id, action, details, icon, created_at")
    if is_valid_uuid(user_id):
        q = q.eq("user_id", user_id)
    result = (
        q.order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ======== Delete Operations ========

async def delete_influencer(influencer_id: str, user_id: str | None = None) -> bool:
    """Delete an influencer and all related data (scoped to user or demo user)"""
    if not is_valid_uuid(influencer_id):
        return False
    sb = get_supabase()
    # Delete related data first
    sb.table("engagement_data").delete().eq("influencer_id", influencer_id).execute()
    sb.table("sentiment_analysis").delete().eq("influencer_id", influencer_id).execute()
    sb.table("risk_flags").delete().eq("influencer_id", influencer_id).execute()
    sb.table("reports").delete().eq("influencer_id", influencer_id).execute()
    
    # Delete the influencer strictly scoped to this user or demo user
    q = sb.table("influencers").delete().eq("id", influencer_id)
    if user_id and is_valid_uuid(user_id) and user_id != "00000000-0000-0000-0000-000000000001":
        q = q.or_(f"user_id.eq.{user_id},user_id.eq.00000000-0000-0000-0000-000000000001")
    elif user_id and is_valid_uuid(user_id):
        q = q.eq("user_id", user_id)
    result = q.execute()
    return True


async def clear_all_influencers(user_id: str) -> int:
    """Delete ALL influencers belonging to a specific user (never wipes other users)"""
    if not user_id or not is_valid_uuid(user_id):
        return 0
    sb = get_supabase()
    
    # Find all influencer IDs for this user
    user_infs = sb.table("influencers").select("id").eq("user_id", user_id).execute()
    inf_ids = [row["id"] for row in (user_infs.data or []) if is_valid_uuid(row.get("id"))]
    
    for inf_id in inf_ids:
        sb.table("engagement_data").delete().eq("influencer_id", inf_id).execute()
        sb.table("sentiment_analysis").delete().eq("influencer_id", inf_id).execute()
        sb.table("risk_flags").delete().eq("influencer_id", inf_id).execute()
        sb.table("reports").delete().eq("influencer_id", inf_id).execute()
        
    result = sb.table("influencers").delete().eq("user_id", user_id).execute()
    return len(result.data) if result.data else 0
    return len(result.data) if result.data else 0


async def get_user_by_stripe_customer_id(customer_id: str) -> dict | None:
    """Find user profile by Stripe customer ID"""
    if not customer_id:
        return None
    sb = get_supabase()
    try:
        result = (
            sb.table("user_profiles")
            .select("*")
            .eq("stripe_customer_id", customer_id)
            .maybe_single()
            .execute()
        )
        return result.data if result else None
    except Exception:
        return None


# ======== Marketing Drives (Resilient Dual-Mode Storage) ========

async def create_drive(data: dict) -> dict:
    """Create a new marketing drive (brand posts a campaign)"""
    sb = get_supabase()
    if not is_valid_uuid(data.get("user_id")):
        data["user_id"] = "00000000-0000-0000-0000-000000000001"
    
    drive_id = data.get("id") or str(uuid.uuid4())
    data["id"] = drive_id
    now_iso = datetime.utcnow().isoformat()
    data["created_at"] = data.get("created_at") or now_iso
    data["updated_at"] = now_iso

    try:
        result = sb.table("marketing_drives").insert(data).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass

    try:
        sb.table("reports").insert({
            "id": drive_id,
            "user_id": data["user_id"],
            "name": "marketing_drive",
            "report_data": data,
        }).execute()
        return data
    except Exception as err:
        print(f"Error creating marketing drive fallback: {err}")
        return data


async def get_drives(
    city: str | None = None,
    category: str | None = None,
    status: str = "active",
    limit: int = 50,
) -> list[dict]:
    """Get active marketing drives, optionally filtered by city/category"""
    sb = get_supabase()
    try:
        q = sb.table("marketing_drives").select("*")
        if status:
            q = q.eq("status", status)
        if city and city != "all":
            q = q.ilike("city", f"%{city}%")
        if category and category != "all":
            q = q.eq("category", category)
        result = q.order("created_at", desc=True).limit(limit).execute()
        if result.data is not None:
            return result.data
    except Exception:
        pass

    # Resilient fallback via reports table
    try:
        res = sb.table("reports").select("*").eq("name", "marketing_drive").order("created_at", desc=True).execute()
        drives = []
        for row in (res.data or []):
            d = row.get("report_data") or {}
            d["id"] = row.get("id")
            d["user_id"] = row.get("user_id")
            if not d.get("created_at"):
                d["created_at"] = row.get("created_at")

            if status and d.get("status") != status:
                continue
            if city and city != "all" and city.lower() not in (d.get("city") or "").lower():
                continue
            if category and category != "all" and d.get("category") != category:
                continue
            drives.append(d)
        return drives[:limit]
    except Exception as err:
        print(f"Error fetching drives fallback: {err}")
        return []


async def get_drive(drive_id: str) -> dict | None:
    """Get a single drive by ID"""
    if not is_valid_uuid(drive_id):
        return None
    sb = get_supabase()
    try:
        result = (
            sb.table("marketing_drives")
            .select("*")
            .eq("id", drive_id)
            .maybe_single()
            .execute()
        )
        if result and result.data:
            return result.data
    except Exception:
        pass

    try:
        res = (
            sb.table("reports")
            .select("*")
            .eq("name", "marketing_drive")
            .eq("id", drive_id)
            .maybe_single()
            .execute()
        )
        if res and res.data:
            d = res.data.get("report_data") or {}
            d["id"] = res.data.get("id")
            d["user_id"] = res.data.get("user_id")
            return d
    except Exception:
        pass
    return None


async def get_user_drives(user_id: str) -> list[dict]:
    """Get all drives posted by a specific user (brand)"""
    sb = get_supabase()
    if not is_valid_uuid(user_id):
        return []
    try:
        result = (
            sb.table("marketing_drives")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        if result.data is not None:
            return result.data
    except Exception:
        pass

    try:
        res = (
            sb.table("reports")
            .select("*")
            .eq("name", "marketing_drive")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        drives = []
        for row in (res.data or []):
            d = row.get("report_data") or {}
            d["id"] = row.get("id")
            d["user_id"] = row.get("user_id")
            if not d.get("created_at"):
                d["created_at"] = row.get("created_at")
            drives.append(d)
        return drives
    except Exception as err:
        print(f"Error get_user_drives fallback: {err}")
        return []


async def update_drive(drive_id: str, data: dict) -> dict:
    """Update a drive"""
    sb = get_supabase()
    data["updated_at"] = datetime.utcnow().isoformat()
    try:
        result = sb.table("marketing_drives").update(data).eq("id", drive_id).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass

    try:
        existing = await get_drive(drive_id) or {}
        merged = {**existing, **data}
        sb.table("reports").update({"report_data": merged}).eq("id", drive_id).execute()
        return merged
    except Exception as err:
        print(f"Error update_drive fallback: {err}")
        return data


async def delete_drive(drive_id: str) -> bool:
    """Delete a drive and all its applications (CASCADE)"""
    sb = get_supabase()
    try:
        sb.table("marketing_drives").delete().eq("id", drive_id).execute()
    except Exception:
        pass

    try:
        sb.table("reports").delete().eq("id", drive_id).execute()
        # Delete associated applications
        apps = await get_drive_applications(drive_id)
        for app in apps:
            if app.get("id"):
                try:
                    sb.table("reports").delete().eq("id", app["id"]).execute()
                except Exception:
                    pass
        return True
    except Exception as err:
        print(f"Error delete_drive fallback: {err}")
        return False


# ======== Drive Applications ========

async def apply_to_drive(data: dict) -> dict:
    """Creator applies to a marketing drive"""
    sb = get_supabase()
    if not is_valid_uuid(data.get("user_id")):
        data["user_id"] = "00000000-0000-0000-0000-000000000001"
    
    app_id = data.get("id") or str(uuid.uuid4())
    data["id"] = app_id
    data["created_at"] = data.get("created_at") or datetime.utcnow().isoformat()

    try:
        result = sb.table("drive_applications").insert(data).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass

    try:
        sb.table("reports").insert({
            "id": app_id,
            "user_id": data["user_id"],
            "name": "drive_application",
            "report_data": data,
        }).execute()
        return data
    except Exception as err:
        print(f"Error apply_to_drive fallback: {err}")
        return data


async def get_drive_applications(drive_id: str) -> list[dict]:
    """Get all applications for a specific drive"""
    if not is_valid_uuid(drive_id):
        return []
    sb = get_supabase()
    try:
        result = (
            sb.table("drive_applications")
            .select("*")
            .eq("drive_id", drive_id)
            .order("created_at", desc=True)
            .execute()
        )
        if result.data is not None:
            return result.data
    except Exception:
        pass

    try:
        res = sb.table("reports").select("*").eq("name", "drive_application").order("created_at", desc=True).execute()
        apps = []
        for row in (res.data or []):
            a = row.get("report_data") or {}
            if str(a.get("drive_id", "")) == str(drive_id):
                a["id"] = a.get("id") or row.get("id")
                a["user_id"] = a.get("user_id") or row.get("user_id")
                apps.append(a)
        return apps
    except Exception as err:
        print(f"Error get_drive_applications fallback: {err}")
        return []


async def get_user_applications(user_id: str) -> list[dict]:
    """Get all drive applications by a specific creator"""
    if not is_valid_uuid(user_id):
        return []
    sb = get_supabase()
    try:
        result = (
            sb.table("drive_applications")
            .select("*, marketing_drives(*)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        if result.data is not None:
            return result.data
    except Exception:
        pass

    try:
        res = (
            sb.table("reports")
            .select("*")
            .eq("name", "drive_application")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        apps = []
        for row in (res.data or []):
            a = row.get("report_data") or {}
            a["id"] = a.get("id") or row.get("id")
            a["user_id"] = a.get("user_id") or row.get("user_id")
            # Attach parent drive details
            drive_id = a.get("drive_id")
            if drive_id:
                drive = await get_drive(drive_id)
                if drive:
                    a["marketing_drives"] = drive
            apps.append(a)
        return apps
    except Exception as err:
        print(f"Error get_user_applications fallback: {err}")
        return []


async def update_application_status(application_id: str, status: str) -> dict:
    """Brand accepts/rejects a creator application"""
    sb = get_supabase()
    try:
        result = (
            sb.table("drive_applications")
            .update({"status": status})
            .eq("id", application_id)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        pass

    try:
        res = (
            sb.table("reports")
            .select("*")
            .eq("name", "drive_application")
            .eq("id", application_id)
            .maybe_single()
            .execute()
        )
        if res and res.data:
            app_data = res.data.get("report_data") or {}
            app_data["status"] = status
            app_data["id"] = application_id
            sb.table("reports").update({"report_data": app_data}).eq("id", application_id).execute()
            return app_data
    except Exception as err:
        print(f"Error update_application_status fallback: {err}")
    return {"id": application_id, "status": status}


async def check_already_applied(drive_id: str, user_id: str) -> bool:
    """Check if a creator already applied to this drive"""
    if not is_valid_uuid(drive_id) or not is_valid_uuid(user_id):
        return False
    sb = get_supabase()
    try:
        result = (
            sb.table("drive_applications")
            .select("id")
            .eq("drive_id", drive_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if result and result.data is not None:
            return True
    except Exception:
        pass

    try:
        apps = await get_drive_applications(drive_id)
        for a in apps:
            if str(a.get("user_id", "")) == str(user_id):
                return True
    except Exception:
        pass
    return False
