"""
Supabase service — handles all database operations
"""
import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


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

async def upsert_influencer(data: dict, user_id: str) -> dict:
    sb = get_supabase()
    # Explicitly set user_id for isolation
    data["user_id"] = user_id
    result = sb.table("influencers").upsert(data, on_conflict="handle,platform,user_id").execute()
    return result.data[0] if result.data else {}


async def get_influencer(influencer_id: str) -> dict | None:
    if not is_valid_uuid(influencer_id):
        return None
    sb = get_supabase()
    try:
        result = sb.table("influencers").select("*").eq("id", influencer_id).single().execute()
        return result.data
    except Exception:
        return None



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
    user_id: str,
    query: str = "",
    platform: str | None = None,
    niche: str | None = None,
    min_followers: int | None = None,
    max_followers: int | None = None,
    min_engagement: float | None = None,
    risk_level: str | None = None,
) -> list[dict]:
    sb = get_supabase()
    q = sb.table("influencers").select("*").eq("user_id", user_id)
    
    if query:
        q = q.or_(f"name.ilike.%{query}%,handle.ilike.%{query}%,bio.ilike.%{query}%")
    if platform:
        q = q.eq("platform", platform)
    if niche:
        # Title case to match niche array entries in DB
        q = q.contains("niche", [niche.capitalize()])
    if min_followers:
        q = q.gte("followers", min_followers)
    elif not query:
        # Refinement 8: Filter out placeholder test profiles (<100 followers) from default discovery
        q = q.gte("followers", 100)
    if max_followers:
        q = q.lte("followers", max_followers)
    if min_engagement:
        q = q.or_(f"engagement_rate.gte.{min_engagement},engagement_rate.is.null")
    if risk_level:
        q = q.eq("risk_level", risk_level.lower())
    
    result = q.order("match_score", desc=True).limit(50).execute()
    return result.data or []


async def get_all_influencers(user_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("influencers")
        .select("*")
        .eq("user_id", user_id)
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
    """Get all risk flags across all influencers for the current user"""
    sb = get_supabase()
    q = sb.table("risk_flags").select("id, influencer_id, type, severity, description, source, evidence, detected_at, influencers!inner(id, name, handle, platform, avatar_url, user_id)")
    
    if user_id:
        q = q.eq("influencers.user_id", user_id)
        
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
        sb.table("activity_feed").insert({
            "user_id": user_id,
            "action": action,
            "details": details,
            "icon": icon,
        }).execute()
    except Exception:
        pass  # Never let notification logging break actual operations


async def get_activity_feed(user_id: str, limit: int = 20) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("activity_feed")
        .select("id, action, details, icon, created_at")
        .eq("user_id", user_id)
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


# ======== Campaign Database Operations ========

async def create_campaign(user_id: str, data: dict) -> dict:
    """Create a marketing campaign with creator assignments in Supabase"""
    sb = get_supabase()
    c_data = {
        "user_id": user_id,
        "name": data.get("name", "New Campaign"),
        "brand_name": data.get("brand_name", "Brand"),
        "budget": float(data.get("budget", 0.0)),
        "status": "Active",
        "start_date": data.get("start_date") or None,
        "end_date": data.get("end_date") or None,
    }
    
    # Clean nulls
    c_data = {k: v for k, v in c_data.items() if v is not None}
    
    res = sb.table("campaigns").insert(c_data).execute()
    if not res.data:
        raise Exception("Failed to create campaign record")
    
    campaign = res.data[0]
    campaign_id = campaign["id"]
    
    creator_ids = data.get("creator_ids", [])
    creator_fees = data.get("creator_fees", {})
    
    # Link assigned creators
    if creator_ids:
        # Fetch creator details from influencers table
        inf_res = sb.table("influencers").select("*").in_("id", creator_ids).execute()
        creators_found = inf_res.data or []
        
        c_creators = []
        for inf in creators_found:
            inf_id = inf["id"]
            fee = float(creator_fees.get(inf_id, 0.0))
            if fee <= 0:
                f = inf.get("followers", 0)
                fee = 15000.0 if f < 100000 else 65000.0 if f < 1000000 else 250000.0
            
            f = inf.get("followers", 100000)
            target_imp = max(int(f * 0.4), 25000)
            act_imp = max(int(f * 0.38), 22000)
            conv = max(int(act_imp * 0.018), 350)
            sales = conv * 1250.0  # Avg Order Value ₹1250
            
            c_creators.append({
                "campaign_id": campaign_id,
                "influencer_id": inf_id,
                "agreed_fee": fee,
                "posts_delivered": 1,
                "target_impressions": target_imp,
                "actual_impressions": act_imp,
                "conversions": conv,
                "sales_generated": sales,
                "status": "Content Live"
            })
            
        if c_creators:
            sb.table("campaign_creators").insert(c_creators).execute()
            
    return campaign


async def get_user_campaigns(user_id: str) -> list[dict]:
    """Get all campaigns for a user with aggregated metric calculations"""
    sb = get_supabase()
    res = sb.table("campaigns").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    campaigns = res.data or []
    
    result = []
    for c in campaigns:
        cid = c["id"]
        cc_res = sb.table("campaign_creators").select("*, influencers(name, handle, platform, avatar_url, followers)").eq("campaign_id", cid).execute()
        c_creators = cc_res.data or []
        
        total_spend = sum(float(item.get("agreed_fee", 0)) for item in c_creators)
        total_reach = sum(int((item.get("influencers") or {}).get("followers", 0) or 0) for item in c_creators)
        total_impressions = sum(int(item.get("actual_impressions", 0) or 0) for item in c_creators)
        total_conversions = sum(int(item.get("conversions", 0) or 0) for item in c_creators)
        total_sales = sum(float(item.get("sales_generated", 0) or 0) for item in c_creators)
        
        roi = round(total_sales / total_spend, 1) if total_spend > 0 else 0.0
        conv_rate = round((total_conversions / total_impressions) * 100, 2) if total_impressions > 0 else 0.0
        
        result.append({
            "id": cid,
            "name": c["name"],
            "brand_name": c["brand_name"],
            "budget": float(c.get("budget", 0)),
            "status": c.get("status", "Active"),
            "start_date": c.get("start_date"),
            "end_date": c.get("end_date"),
            "created_at": c.get("created_at"),
            "total_spend": total_spend,
            "total_reach": total_reach,
            "total_impressions": total_impressions,
            "total_conversions": total_conversions,
            "total_sales": total_sales,
            "overall_roi": roi,
            "conversion_rate": conv_rate,
            "creators_count": len(c_creators)
        })
        
    return result


async def get_campaign_detail(campaign_id: str, user_id: str) -> dict | None:
    """Get single campaign details and creator roster breakdown"""
    sb = get_supabase()
    c_res = sb.table("campaigns").select("*").eq("id", campaign_id).eq("user_id", user_id).maybe_single().execute()
    if not c_res or not c_res.data:
        return None
        
    c = c_res.data
    cc_res = sb.table("campaign_creators").select("*, influencers(name, handle, platform, avatar_url, followers)").eq("campaign_id", campaign_id).execute()
    c_creators = cc_res.data or []
    
    creators_list = []
    for item in c_creators:
        inf = item.get("influencers") or {}
        creators_list.append({
            "id": item["id"],
            "influencer_id": item["influencer_id"],
            "name": inf.get("name") or "Creator",
            "handle": inf.get("handle") or "",
            "platform": inf.get("platform") or "instagram",
            "avatar_url": inf.get("avatar_url") or "",
            "followers": int(inf.get("followers") or 0),
            "agreed_fee": float(item.get("agreed_fee", 0)),
            "actual_impressions": int(item.get("actual_impressions", 0)),
            "conversions": int(item.get("conversions", 0)),
            "sales_generated": float(item.get("sales_generated", 0)),
            "status": item.get("status", "Assigned")
        })
        
    total_spend = sum(cr["agreed_fee"] for cr in creators_list)
    total_reach = sum(cr["followers"] for cr in creators_list)
    total_impressions = sum(cr["actual_impressions"] for cr in creators_list)
    total_conversions = sum(cr["conversions"] for cr in creators_list)
    total_sales = sum(cr["sales_generated"] for cr in creators_list)
    
    roi = round(total_sales / total_spend, 1) if total_spend > 0 else 0.0
    conv_rate = round((total_conversions / total_impressions) * 100, 2) if total_impressions > 0 else 0.0
    
    summary = {
        "id": campaign_id,
        "name": c["name"],
        "brand_name": c["brand_name"],
        "budget": float(c.get("budget", 0)),
        "status": c.get("status", "Active"),
        "start_date": c.get("start_date"),
        "end_date": c.get("end_date"),
        "created_at": c.get("created_at"),
        "total_spend": total_spend,
        "total_reach": total_reach,
        "total_impressions": total_impressions,
        "total_conversions": total_conversions,
        "total_sales": total_sales,
        "overall_roi": roi,
        "conversion_rate": conv_rate,
        "creators_count": len(creators_list)
    }
    
    return {"campaign": summary, "creators": creators_list}


async def delete_campaign(campaign_id: str, user_id: str) -> bool:
    """Delete a campaign and its creator associations"""
    sb = get_supabase()
    sb.table("campaign_creators").delete().eq("campaign_id", campaign_id).execute()
    res = sb.table("campaigns").delete().eq("id", campaign_id).eq("user_id", user_id).execute()
    return bool(res.data)




