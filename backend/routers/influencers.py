"""
Influencer API routes — fetch, search, analyze real influencers
"""
from fastapi import APIRouter, HTTPException, Query, Response, Header
from models.schemas import (
    InfluencerProfile, SocialFetchRequest, SearchRequest,
    SentimentAnalysis, RiskAssessment, CompareRequest, CompareResponse
)
from services import supabase_service as db
from services import ai_service as ai
from services import social_service as social
from services.pdf_service import profile_to_pdf
from datetime import datetime
import asyncio

router = APIRouter(prefix="/api/influencers", tags=["Influencers"])

import uuid
DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

def get_effective_user_id(x_user_id: any) -> str:
    if isinstance(x_user_id, str) and x_user_id.strip() and x_user_id.strip() not in ("undefined", "null"):
        val = x_user_id.strip()
        try:
            uuid.UUID(val)
            return val
        except ValueError:
            pass
    return DEFAULT_DEMO_USER_ID

def check_influencer_access(profile: dict | None, effective_user_id: str) -> bool:
    if not profile:
        return False
    return str(profile.get("user_id", "")) == str(effective_user_id)


@router.post("/fetch", response_model=dict)
async def fetch_influencer(req: SocialFetchRequest, x_user_id: str | None = Header(None)):
    """Fetch REAL influencer data from social media and run full AI analysis"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    try:
        # Clean handle: strip spaces, @, lowercase
        clean_handle = req.handle.replace(" ", "").replace("@", "").lower().strip()
        
        # 1. Check database cache ONLY if it contains authentic verified data (never placeholder/ui-avatars/unknown)
        cached_profile = await db.get_influencer_by_handle(clean_handle, req.platform)
        if cached_profile and cached_profile.get("updated_at"):
            c_avatar = cached_profile.get("avatar_url", "")
            c_name = cached_profile.get("name", "")
            c_followers = cached_profile.get("followers", 0)
            
            # If cached profile has placeholder data (ui-avatars, Unknown, 12000, 12345), ignore cache and fetch real live data!
            is_valid_real_cache = (
                bool(c_avatar)
                and "ui-avatars.com" not in c_avatar
                and c_name not in ("Unknown", "Anonymous")
                and c_followers not in (0, 12000, 12345)
            )
            if is_valid_real_cache:
                try:
                    last_updated = datetime.fromisoformat(cached_profile["updated_at"].replace("Z", ""))
                    if (datetime.utcnow() - last_updated).total_seconds() < 86400:  # 24 hours
                        timeline = await db.get_engagement_data(cached_profile["id"])
                        sentiment = await db.get_sentiment(cached_profile["id"])
                        risk_flags = await db.get_risk_flags(cached_profile["id"])
                        return {
                            "profile": cached_profile,
                            "engagement": timeline,
                            "sentiment": sentiment or {},
                            "risk": {"overall_risk": cached_profile.get("risk_level", "low"), "flags": risk_flags},
                            "cached": True
                        }
                except Exception:
                    pass

        # Demo Mode: Unlimited search quota for presentation
        user_prof = await db.get_user_profile(effective_user_id)
        # Search quota restriction disabled for presentation demo
        
        # 1. Fetch real profile from social media
        profile = await social.fetch_social_profile(clean_handle, req.platform)
        
        # 2. Fetch real comments for sentiment analysis
        comments = await social.fetch_comments(clean_handle, req.platform, profile)
        
        # 3. Generate engagement timeline from real data
        timeline = social.generate_engagement_timeline(profile)
        
        # 3.5 Detect accurate niche using AI (replaces regex fallback)
        captions = [p.get("caption", "") for p in profile.get("recent_posts", []) if isinstance(p, dict) and p.get("caption")]
        
        # 4. Run Unified Single-Prompt AI Analysis for Sub-3.5s Execution Speed
        unified_ai = await ai.analyze_creator_unified(profile, comments, timeline)
        
        ai_niches = unified_ai.get("niches", ["General"])
        risk_result = unified_ai.get("risk_result", {})
        sentiment = unified_ai.get("sentiment", {})
        fake_result = unified_ai.get("fake_result", {})
        roi_result = unified_ai.get("roi_result", {})
        
        if ai_niches and ai_niches != ["General"]:
            profile["niche"] = ai_niches
            
        match_result = {
            "match_score": 0, 
            "recommendation": "Pending Brief", 
            "strengths": [], 
            "weaknesses": []
        }
        
        # Risk assessment
        profile["risk_level"] = risk_result.get("overall_risk", "medium")
        
        # Calculate bot percentage from REAL metrics (don't trust AI's lazy 5% default)
        followers = profile.get("followers", 0) or 0
        er = profile.get("engagement_rate", 0) or 0
        avg_likes = profile.get("avg_likes", 0) or 0
        if avg_likes <= 0 and followers > 0:
            eff_er = er if er > 0 else 2.2
            avg_likes = max(1, int(followers * (eff_er / 100) * 0.95))
            profile["avg_likes"] = avg_likes

        avg_comments = profile.get("avg_comments", 0) or 0
        if avg_comments <= 0 and followers > 0:
            avg_comments = max(1, int(avg_likes * 0.05))
            profile["avg_comments"] = avg_comments

        following = profile.get("following", 0) or 0
        platform_name = (profile.get("platform") or "instagram").lower()
        
        bot_score = 0  # 0-100 scale
        
        if followers > 0:
            like_ratio = avg_likes / followers if followers > 0 else 0
            comment_ratio = avg_comments / followers if followers > 0 else 0
            follow_ratio = following / followers if followers > 0 else 0
            comments_to_likes = avg_comments / avg_likes if avg_likes > 0 else 0
            
            # Platform-aware baseline thresholds (YouTube engagement rates are lower than IG)
            is_yt = platform_name == "youtube"
            low_er_thresh = 0.15 if is_yt else 0.5
            
            # 1. Engagement rate suspicion
            if followers >= 1000000:
                if er < (0.1 if is_yt else 0.3): bot_score += 20
                elif er > (6.0 if is_yt else 10.0): bot_score += 15
            elif followers >= 100000:
                if er < low_er_thresh: bot_score += 15
                elif er > (8.0 if is_yt else 12.0): bot_score += 15
            else:
                if er < low_er_thresh: bot_score += 10
                elif er > (12.0 if is_yt else 18.0): bot_score += 12
            
            # 2. Like-to-follower ratio (Skip heavy penalty if hidden likes estimated via comments)
            if avg_comments > 0 and avg_likes > 0:
                if like_ratio < 0.001 and not is_yt: bot_score += 15
                elif like_ratio > 0.20: bot_score += 12
            
            # 3. Comments-to-likes ratio (0-15 pts)
            if avg_likes > 0 and avg_comments > 0:
                if comments_to_likes < 0.003: bot_score += 15  # unnatural lack of comments vs likes
                elif comments_to_likes > 0.6: bot_score += 10
            
            # 4. Following-to-followers ratio for large accounts
            if followers >= 100000 and not is_yt:
                if follow_ratio > 0.7: bot_score += 15
                elif follow_ratio > 0.4: bot_score += 8
            
            # 5. Completely zero likes AND zero comments
            if followers > 10000 and avg_likes == 0 and avg_comments == 0:
                bot_score += 25
        
        # Clamp between 3-92
        bot_score = max(3, min(92, bot_score))
        profile["bot_percentage"] = bot_score
        
        # Sentiment
        if sentiment:
            profile["brand_safety_score"] = sentiment.get("brand_safety_score", 0)
        
        # ROI prediction
        profile["predicted_roi"] = roi_result.get("predicted_roi", 0)
        
        # 5. Save everything to Supabase
        saved_profile = await db.upsert_influencer({
            **profile,
            "niche": profile.get("niche", []),
            "updated_at": datetime.utcnow().isoformat(),
        }, effective_user_id)
        
        influencer_id = saved_profile.get("id", "")
        
        if influencer_id:
            follower_str = f"{profile.get('followers', 0):,}"
            risk_lvl = risk_result.get("overall_risk", "low")
            
            db_tasks = [
                db.save_engagement_data(influencer_id, timeline),
                db.increment_search_count(effective_user_id),
                db.log_activity(
                    user_id=effective_user_id,
                    action="Influencer Fetched",
                    details=f"Added {profile.get('name', '')} ({profile.get('handle', '')}) from {req.platform} — {follower_str} followers, {profile.get('risk_level', 'unknown')} risk",
                    icon="user-plus",
                )
            ]
            if sentiment:
                db_tasks.append(db.save_sentiment(influencer_id, sentiment))
            if risk_result.get("flags"):
                db_tasks.append(db.save_risk_flags(influencer_id, risk_result["flags"]))
            if risk_lvl in ("high", "critical"):
                db_tasks.append(db.log_activity(
                    user_id=effective_user_id,
                    action=f"⚠️ {risk_lvl.upper()} Risk Detected",
                    details=f"{profile.get('name', '')} ({profile.get('handle', '')}) flagged as {risk_lvl} risk — {len(risk_result.get('flags', []))} issue(s) found",
                    icon="alert",
                ))
            
            await asyncio.gather(*db_tasks, return_exceptions=True)

        return {
            "profile": saved_profile,
            "engagement": timeline,
            "sentiment": sentiment,
            "risk": risk_result,
            "fake_engagement": fake_result,
            "roi": roi_result,
            "match": match_result,
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_influencers(
    query: str = "",
    platform: str | None = None,
    niche: str | None = None,
    location: str | None = None,
    min_followers: int | None = None,
    max_followers: int | None = None,
    min_engagement: float | None = None,
    risk_level: str | None = None,
    x_user_id: str | None = Header(None)
):
    """Search influencers from the database"""
    effective_user_id = get_effective_user_id(x_user_id)

    results = await db.search_influencers(
        user_id=effective_user_id,
        query=query,
        platform=platform,
        niche=niche,
        location=location,
        min_followers=min_followers,
        max_followers=max_followers,
        min_engagement=min_engagement,
        risk_level=risk_level,
    )
    return {"results": results, "count": len(results)}


@router.get("/all")
async def list_influencers(limit: int = 50, offset: int = 0, x_user_id: str | None = Header(None)):
    """Get all indexed influencers"""
    effective_user_id = get_effective_user_id(x_user_id)
    results = await db.get_all_influencers(user_id=effective_user_id, limit=limit, offset=offset)
    return {"results": results, "count": len(results)}


@router.get("/risks/all")
async def get_all_risk_flags(x_user_id: str | None = Header(None)):
    """Get all risk flags across all influencers with influencer details"""
    effective_user_id = get_effective_user_id(x_user_id)
    data = await db.get_all_risk_flags(user_id=effective_user_id)
    return data


@router.delete("/risks/{flag_id}")
async def delete_risk_flag(flag_id: str, x_user_id: str | None = Header(None)):
    """Delete a single risk flag"""
    effective_user_id = get_effective_user_id(x_user_id)
    try:
        success = await db.delete_risk_flag(flag_id)
        if not success:
            raise HTTPException(status_code=404, detail="Risk flag not found")
        await db.log_activity(
            user_id=effective_user_id,
            action="Risk Flag Dismissed",
            details=f"Manually dismissed risk flag {flag_id[:8]}…",
            icon="shield",
        )
        return {"deleted": True, "id": flag_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear-all")
async def clear_all_influencers(x_user_id: str | None = Header(None)):
    """Delete ALL influencers and related data from the database"""
    effective_user_id = get_effective_user_id(x_user_id)
    try:
        await db.clear_all_influencers(user_id=effective_user_id)
            
        await db.log_activity(
            user_id=effective_user_id,
            action="Collection Cleared",
            details="All influencers and their analysis data were permanently deleted",
            icon="trash",
        )
        return {"deleted": True, "message": "All influencers and data cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{influencer_id}")
async def delete_influencer(influencer_id: str, x_user_id: str | None = Header(None)):
    """Delete a single influencer and all related data"""
    effective_user_id = get_effective_user_id(x_user_id)
    try:
        profile = await db.get_influencer(influencer_id)
        if not profile:
            return {"deleted": True, "message": "Influencer already deleted"}
        
        is_owner = str(profile.get("user_id", "")) == str(effective_user_id)
        is_demo = str(profile.get("user_id", "")) == DEFAULT_DEMO_USER_ID or effective_user_id == DEFAULT_DEMO_USER_ID
        if not (is_owner or is_demo):
            raise HTTPException(status_code=403, detail="Not authorized to delete this influencer")

        name = profile.get("name", "Unknown")
        handle = profile.get("handle", "")
        
        await db.delete_influencer(influencer_id, user_id=effective_user_id)
        
        await db.log_activity(
            user_id=effective_user_id,
            action="Influencer Removed",
            details=f"Deleted {name} ({handle}) and all related analysis data",
            icon="trash",
        )
        return {"deleted": True, "message": "Influencer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{influencer_id}")
async def get_influencer(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get full influencer profile with all analysis data"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    engagement = await db.get_engagement_data(influencer_id)
    sentiment = await db.get_sentiment(influencer_id)
    risk_flags = await db.get_risk_flags(influencer_id)
    
    return {
        "profile": profile,
        "engagement": engagement,
        "sentiment": sentiment,
        "risk_flags": risk_flags,
    }


@router.get("/{influencer_id}/engagement")
async def get_engagement(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get engagement timeline data"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found")
    data = await db.get_engagement_data(influencer_id)
    return {"data": data}


@router.get("/{influencer_id}/sentiment")
async def get_sentiment(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get sentiment analysis"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not check_influencer_access(profile, effective_user_id):
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    data = await db.get_sentiment(influencer_id)
    return {"data": data}


@router.get("/{influencer_id}/download")
async def download_influencer_pdf(influencer_id: str, x_user_id: str | None = Header(None)):
    """Download an influencer profile summary as PDF"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not check_influencer_access(profile, effective_user_id):
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    pdf_bytes = profile_to_pdf(profile)
    name = (profile.get("name") or "influencer").replace(" ", "_")[:50]
    safe_name = "".join(c for c in name if c.isalnum() or c in "._-")[:60] or "profile"
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_audit_{today_str}.pdf"'},
    )


@router.get("/{influencer_id}/risks")
async def get_risks(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get risk flags"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not check_influencer_access(profile, effective_user_id):
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    data = await db.get_risk_flags(influencer_id)
    return {"data": data}


@router.post("/{influencer_id}/reanalyze")
async def reanalyze_influencer(influencer_id: str, x_user_id: str | None = Header(None)):
    """Re-run AI analysis on an existing influencer"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not check_influencer_access(profile, effective_user_id):
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    engagement = await db.get_engagement_data(influencer_id)
    
    # Re-run AI — risk assessment uses only real profile metrics (no synthetic timeline)
    match_result = await ai.calculate_match_score(profile)
    
    # Needs comments for risk analysis and sentiment
    clean_handle = profile.get("handle", "").replace("@", "").lower().strip()
    comments = await social.fetch_comments(clean_handle, profile.get("platform", "instagram"), profile)
    
    # AI Niche detection
    captions = [p.get("caption", "") for p in profile.get("recent_posts", []) if isinstance(p, dict) and p.get("caption")]
    ai_niches = await ai.detect_niche(profile.get("bio", ""), profile.get("name", ""), captions)
    
    risk_result = await ai.assess_risk(profile, comments)
    roi_result = await ai.predict_roi(profile)
    
    sentiment = {}
    if comments:
        sentiment = await ai.analyze_sentiment(comments, profile.get("name", ""))
        profile["brand_safety_score"] = sentiment.get("brand_safety_score", 0)
    
    # Update
    updated = {
        "match_score": match_result.get("match_score", 0),
        "risk_level": risk_result.get("overall_risk", "medium"),
        "bot_percentage": risk_result.get("bot_percentage", 0),
        "predicted_roi": roi_result.get("predicted_roi", 0),
        "updated_at": datetime.utcnow().isoformat(),
    }
    if ai_niches and ai_niches != ["General"]:
        updated["niche"] = ai_niches
    
    await db.upsert_influencer({**profile, **updated}, effective_user_id)
    
    if risk_result.get("flags"):
        await db.save_risk_flags(influencer_id, risk_result["flags"])
        
    if sentiment:
        await db.save_sentiment(influencer_id, sentiment)
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Re-Analysis Complete",
        details=f"Re-ran AI analysis on {profile.get('name', 'Unknown')} ({profile.get('handle', '')}) — Match: {match_result.get('match_score', 0)}%, Risk: {risk_result.get('overall_risk', 'unknown')}",
        icon="refresh",
    )
    
    return {
        "match": match_result,
        "risk": risk_result,
        "roi": roi_result,
    }


@router.post("/compare")
async def compare_influencers(req: CompareRequest, x_user_id: str | None = Header(None)):
    """Compare two influencers side-by-side"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    profile_a = await db.get_influencer(req.influencer_a_id)
    profile_b = await db.get_influencer(req.influencer_b_id)
    
    if not profile_a or not profile_b:
        raise HTTPException(status_code=404, detail="One or both influencers not found")
    
    def fmt(n):
        if n is None or not isinstance(n, (int, float)):
            return "0"
        if n >= 10000000: return f"{n/10000000:.2f}Cr"
        if n >= 100000: return f"{n/100000:.2f}L"
        return f"{int(n):,}"
    
    f_a, f_b = profile_a.get("followers", 0) or 0, profile_b.get("followers", 0) or 0
    er_a, er_b = profile_a.get("engagement_rate", 0) or 0, profile_b.get("engagement_rate", 0) or 0
    l_a, l_b = profile_a.get("avg_likes", 0) or 0, profile_b.get("avg_likes", 0) or 0
    roi_a, roi_b = profile_a.get("predicted_roi", 0) or 0, profile_b.get("predicted_roi", 0) or 0
    bot_a, bot_b = profile_a.get("bot_percentage", 0) or 0, profile_b.get("bot_percentage", 0) or 0

    # Dynamic fallback: If Avg Likes is 0 in database, derive realistically from followers & ER
    if l_a <= 0 and f_a > 0:
        eff_er_a = er_a if er_a > 0 else 2.2
        l_a = max(1, int(f_a * (eff_er_a / 100) * 0.95))
    if l_b <= 0 and f_b > 0:
        eff_er_b = er_b if er_b > 0 else 2.2
        l_b = max(1, int(f_b * (eff_er_b / 100) * 0.95))

    # Platform benchmark multipliers for fair cross-platform comparison
    benchmarks = {"youtube": 3.0, "instagram": 2.2}
    norm_er_a = er_a / benchmarks.get(profile_a.get("platform", "").lower(), 2.5)
    norm_er_b = er_b / benchmarks.get(profile_b.get("platform", "").lower(), 2.5)

    def get_market_rate(followers: int, custom_price: any) -> int:
        if isinstance(custom_price, (int, float)) and custom_price > 1000:
            return int(custom_price)
        if followers >= 10000000: return int(followers * 0.12)
        elif followers >= 1000000: return int(followers * 0.18)
        elif followers >= 100000: return int(followers * 0.22)
        else: return max(3000, int(followers * 0.25))

    rate_a = get_market_rate(f_a, profile_a.get("suggested_price"))
    rate_b = get_market_rate(f_b, profile_b.get("suggested_price"))

    cpe_a = round(rate_a / max(1, l_a), 2)
    cpe_b = round(rate_b / max(1, l_b), 2)

    def get_tier(followers):
        if followers >= 50000000: return "Global Icon"
        if followers >= 10000000: return "Superstar"
        if followers >= 1000000: return "Mega"
        if followers >= 100000: return "Macro"
        if followers >= 10000: return "Micro"
        return "Nano"

    tier_a, tier_b = get_tier(f_a), get_tier(f_b)

    metrics = [
        {"label": "Followers", "value_a": fmt(f_a), "value_b": fmt(f_b), "winner": "a" if f_a > f_b else ("b" if f_b > f_a else None)},
        {"label": "Creator Tier", "value_a": tier_a, "value_b": tier_b, "winner": None},
        {"label": "Engagement Rate", "value_a": f"{er_a}%", "value_b": f"{er_b}%", "winner": "a" if norm_er_a > norm_er_b else ("b" if norm_er_b > norm_er_a else None)},
        {"label": "Avg Likes", "value_a": fmt(l_a), "value_b": fmt(l_b), "winner": "a" if l_a > l_b else ("b" if l_b > l_a else None)},
        {"label": "Cost Per Eng. (CPE)", "value_a": f"₹{cpe_a}", "value_b": f"₹{cpe_b}", "winner": "a" if cpe_a > 0 and (cpe_b == 0 or cpe_a < cpe_b) else ("b" if cpe_b > 0 and (cpe_a == 0 or cpe_b < cpe_a) else None)},
        {"label": "Risk Level", "value_a": profile_a.get("risk_level", "unknown"), "value_b": profile_b.get("risk_level", "unknown"), "winner": "a" if profile_a.get("risk_level") == "low" and profile_b.get("risk_level") != "low" else ("b" if profile_b.get("risk_level") == "low" and profile_a.get("risk_level") != "low" else None)},
        {"label": "Predicted ROI", "value_a": f"{roi_a}x", "value_b": f"{roi_b}x", "winner": "a" if roi_a > roi_b else ("b" if roi_b > roi_a else None)},
        {"label": "Bot %", "value_a": f"{bot_a}%", "value_b": f"{bot_b}%", "winner": "a" if bot_a < bot_b else ("b" if bot_b < bot_a else None)},
    ]
    
    a_wins = sum(1 for m in metrics if m.get("winner") == "a")
    b_wins = sum(1 for m in metrics if m.get("winner") == "b")
    
    if a_wins > b_wins:
        rec = f"{profile_a.get('name')} is the stronger choice with {a_wins}/{len(metrics)} metrics in their favor."
    elif b_wins > a_wins:
        rec = f"{profile_b.get('name')} is the stronger choice with {b_wins}/{len(metrics)} metrics in their favor."
    else:
        rec = "Both influencers are evenly matched. Consider other factors."
    
    return {
        "influencer_a": profile_a,
        "influencer_b": profile_b,
        "metrics": metrics,
        "recommendation": rec,
    }
