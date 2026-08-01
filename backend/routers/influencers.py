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


@router.post("/fetch", response_model=dict)
async def fetch_influencer(req: SocialFetchRequest, x_user_id: str | None = Header(None)):
    """Fetch REAL influencer data from social media and run full AI analysis"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    
    try:
        # Clean handle: strip spaces, @, lowercase
        clean_handle = req.handle.replace(" ", "").replace("@", "").lower().strip()
        
        # 1. Check 24-hour database cache for sub-100ms instant response (zero quota cost)
        cached_profile = await db.get_influencer_by_handle(clean_handle, req.platform)
        if cached_profile and cached_profile.get("updated_at"):
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

        # 2. Check search quota for NEW profile fetches (default 10 free audits)
        user_prof = await db.get_user_profile(x_user_id)
        if user_prof:
            tier = user_prof.get("tier", "free")
            used = user_prof.get("searches_used", 0)
            limit = user_prof.get("searches_limit", 10)
            if tier == "free" and used >= limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Free search quota limit reached ({used}/{limit}). Please upgrade your plan to unlock unlimited searches."
                )
        
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
        followers = profile.get("followers", 0)
        avg_likes = profile.get("avg_likes", 0)
        avg_comments = profile.get("avg_comments", 0)
        following = profile.get("following", 0)
        er = profile.get("engagement_rate", 0)
        
        bot_score = 0  # 0-100 scale
        
        if followers > 0:
            like_ratio = avg_likes / followers
            comment_ratio = avg_comments / followers if followers > 0 else 0
            follow_ratio = following / followers if followers > 0 else 0
            comments_to_likes = avg_comments / avg_likes if avg_likes > 0 else 0
            
            # 1. Engagement rate suspicion (0-30 pts)
            # Mega accounts (1M+): expected ER 0.5-3%, Macro (100K-1M): 1-4%, Micro (<100K): 2-8%
            if followers >= 1000000:
                if er < 0.3: bot_score += 25  # suspiciously low for that many followers
                elif er < 0.8: bot_score += 15
                elif er > 8: bot_score += 20  # suspiciously high
            elif followers >= 100000:
                if er < 0.5: bot_score += 20
                elif er < 1.0: bot_score += 10
                elif er > 10: bot_score += 20
            else:
                if er < 0.5: bot_score += 15
                elif er > 15: bot_score += 15
            
            # 2. Like-to-follower ratio (0-25 pts)
            if like_ratio < 0.002: bot_score += 25  # less than 0.2% = likely fake followers
            elif like_ratio < 0.005: bot_score += 15
            elif like_ratio < 0.01: bot_score += 8
            elif like_ratio > 0.15: bot_score += 15  # suspiciously high
            
            # 3. Comments-to-likes ratio (0-20 pts)
            if avg_likes > 0:
                if comments_to_likes < 0.005: bot_score += 18  # almost no comments vs likes
                elif comments_to_likes < 0.01: bot_score += 10
                elif comments_to_likes > 0.5: bot_score += 12  # too many comments vs likes (bot comments)
            
            # 4. Following-to-followers ratio for large accounts (0-15 pts)
            if followers >= 100000:
                if follow_ratio > 0.7: bot_score += 15  # large accounts don't follow back this much
                elif follow_ratio > 0.4: bot_score += 8
            
            # 5. Zero engagement despite followers (0-10 pts)
            if followers > 10000 and avg_likes == 0: bot_score += 10
        
        # Clamp between 2-95 (no account is 0% or 100% bots)
        bot_score = max(2, min(95, bot_score))
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
        }, x_user_id)
        
        influencer_id = saved_profile.get("id", "")
        
        if influencer_id:
            follower_str = f"{profile.get('followers', 0):,}"
            risk_lvl = risk_result.get("overall_risk", "low")
            
            db_tasks = [
                db.save_engagement_data(influencer_id, timeline),
                db.increment_search_count(x_user_id),
                db.log_activity(
                    user_id=x_user_id,
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
                    user_id=x_user_id,
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
    min_followers: int | None = None,
    max_followers: int | None = None,
    min_engagement: float | None = None,
    risk_level: str | None = None,
    x_user_id: str | None = Header(None)
):
    """Search influencers from the database"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")

    results = await db.search_influencers(
        user_id=x_user_id,
        query=query,
        platform=platform,
        niche=niche,
        min_followers=min_followers,
        max_followers=max_followers,
        min_engagement=min_engagement,
        risk_level=risk_level,
    )
    return {"results": results, "count": len(results)}


@router.get("/all")
async def list_influencers(limit: int = 50, offset: int = 0, x_user_id: str | None = Header(None)):
    """Get all indexed influencers"""
    if not x_user_id:
        return {"results": [], "count": 0}
    
    results = await db.get_all_influencers(user_id=x_user_id, limit=limit, offset=offset)
    return {"results": results, "count": len(results)}


@router.get("/risks/all")
async def get_all_risk_flags(x_user_id: str | None = Header(None)):
    """Get all risk flags across all influencers with influencer details"""
    data = await db.get_all_risk_flags(user_id=x_user_id)
    return data


@router.delete("/risks/{flag_id}")
async def delete_risk_flag(flag_id: str, x_user_id: str | None = Header(None)):
    """Delete a single risk flag"""
    try:
        success = await db.delete_risk_flag(flag_id)
        if not success:
            raise HTTPException(status_code=404, detail="Risk flag not found")
        await db.log_activity(
            user_id=x_user_id or "system",
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    try:
        # Note: clear_all_influencers in service needs update to filter by user_id
        # For now, let's just use delete_influencer on all user's influencers
        infs = await db.get_all_influencers(user_id=x_user_id, limit=1000)
        for inf in infs:
            await db.delete_influencer(inf["id"])
            
        await db.log_activity(
            user_id=x_user_id,
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
    try:
        # Get name before deleting for notification
        profile = await db.get_influencer(influencer_id)
        if not profile or profile.get("user_id") != x_user_id:
             raise HTTPException(status_code=403, detail="Not authorized to delete this influencer")

        name = profile.get("name", "Unknown") if profile else "Unknown"
        handle = profile.get("handle", "") if profile else ""
        
        success = await db.delete_influencer(influencer_id)
        if not success:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        await db.log_activity(
            user_id=x_user_id,
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    data = await db.get_engagement_data(influencer_id)
    return {"data": data}


@router.get("/{influencer_id}/sentiment")
async def get_sentiment(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get sentiment analysis"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    data = await db.get_sentiment(influencer_id)
    return {"data": data}


@router.get("/{influencer_id}/download")
async def download_influencer_pdf(influencer_id: str, x_user_id: str | None = Header(None)):
    """Download an influencer profile summary as PDF"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    pdf_bytes = profile_to_pdf(profile)
    name = (profile.get("name") or "influencer").replace(" ", "_")[:50]
    safe_name = "".join(c for c in name if c.isalnum() or c in "._-")[:60] or "profile"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_profile.pdf"'},
    )


@router.get("/{influencer_id}/risks")
async def get_risks(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get risk flags"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    data = await db.get_risk_flags(influencer_id)
    return {"data": data}


@router.post("/{influencer_id}/reanalyze")
async def reanalyze_influencer(influencer_id: str, x_user_id: str | None = Header(None)):
    """Re-run AI analysis on an existing influencer"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
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
    
    await db.upsert_influencer({**profile, **updated}, x_user_id)
    
    if risk_result.get("flags"):
        await db.save_risk_flags(influencer_id, risk_result["flags"])
        
    if sentiment:
        await db.save_sentiment(influencer_id, sentiment)
    
    await db.log_activity(
        user_id=x_user_id,
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
        
    profile_a = await db.get_influencer(req.influencer_a_id)
    profile_b = await db.get_influencer(req.influencer_b_id)
    
    if not profile_a or profile_a.get("user_id") != x_user_id or not profile_b or profile_b.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="One or both influencers not found or access denied")
    
    def fmt(n):
        if n is None or not isinstance(n, (int, float)):
            return "0"
        if n >= 10000000: return f"{n/10000000:.2f}Cr"
        if n >= 100000: return f"{n/100000:.2f}L"
        return f"{int(n):,}"
    
    f_a, f_b = profile_a.get("followers", 0), profile_b.get("followers", 0)
    er_a, er_b = profile_a.get("engagement_rate", 0), profile_b.get("engagement_rate", 0)
    l_a, l_b = profile_a.get("avg_likes", 0), profile_b.get("avg_likes", 0)
    roi_a, roi_b = profile_a.get("predicted_roi", 0), profile_b.get("predicted_roi", 0)
    bot_a, bot_b = profile_a.get("bot_percentage", 0), profile_b.get("bot_percentage", 0)

    # Platform benchmark multipliers for fair cross-platform comparison
    benchmarks = {"youtube": 3.0, "instagram": 2.2, "tiktok": 5.0, "facebook": 1.5}
    norm_er_a = er_a / benchmarks.get(profile_a.get("platform", "").lower(), 2.5)
    norm_er_b = er_b / benchmarks.get(profile_b.get("platform", "").lower(), 2.5)

    cpe_a = round((profile_a.get("suggested_price", 1000) / max(1, l_a)), 2) if l_a > 0 else 0
    cpe_b = round((profile_b.get("suggested_price", 1000) / max(1, l_b)), 2) if l_b > 0 else 0

    metrics = [
        {"label": "Followers", "value_a": fmt(f_a), "value_b": fmt(f_b), "winner": "a" if f_a > f_b else ("b" if f_b > f_a else None)},
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
