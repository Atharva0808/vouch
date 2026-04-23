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
        
        # 1. Fetch real profile from social media
        profile = await social.fetch_social_profile(clean_handle, req.platform)
        
        # 2. Fetch real comments for sentiment analysis
        comments = await social.fetch_comments(clean_handle, req.platform, profile)
        
        # 3. Generate engagement timeline from real data
        timeline = social.generate_engagement_timeline(profile)
        
        # 3.5 Detect accurate niche using AI (replaces regex fallback)
        captions = [p.get("caption", "") for p in profile.get("recent_posts", []) if isinstance(p, dict) and p.get("caption")]
        
        # 4. Run AI analysis concurrently to save massive amounts of time
        async def get_sentiment():
            if comments:
                res = await ai.analyze_sentiment(comments, profile.get("name", ""))
                return res
            return {}

        niche_task = ai.detect_niche(profile.get("bio", ""), profile.get("name", ""), captions)
        risk_task = ai.assess_risk(profile, comments)
        sentiment_task = get_sentiment()
        fake_task = ai.detect_fake_engagement(timeline, profile)
        roi_task = ai.predict_roi(profile)
        
        ai_niches, risk_result, sentiment, fake_result, roi_result = await asyncio.gather(
            niche_task, risk_task, sentiment_task, fake_task, roi_task
        )
        
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
            await db.save_engagement_data(influencer_id, timeline)
            if sentiment:
                await db.save_sentiment(influencer_id, sentiment)
            if risk_result.get("flags"):
                await db.save_risk_flags(influencer_id, risk_result["flags"])
        
        # Log activity
        follower_str = f"{profile.get('followers', 0):,}"
        await db.log_activity(
            user_id=x_user_id,
            action="Influencer Fetched",
            details=f"Added {profile.get('name', '')} ({profile.get('handle', '')}) from {req.platform} — {follower_str} followers, {profile.get('risk_level', 'unknown')} risk",
            icon="user-plus",
        )
        # Alert on high/critical risk
        risk_lvl = risk_result.get("overall_risk", "low")
        if risk_lvl in ("high", "critical"):
            await db.log_activity(
                user_id=x_user_id,
                action=f"⚠️ {risk_lvl.upper()} Risk Detected",
                details=f"{profile.get('name', '')} ({profile.get('handle', '')}) flagged as {risk_lvl} risk — {len(risk_result.get('flags', []))} issue(s) found",
                icon="alert",
            )
        
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
async def get_influencer(influencer_id: str):
    """Get full influencer profile with all analysis data"""
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
async def get_engagement(influencer_id: str):
    """Get engagement timeline data"""
    data = await db.get_engagement_data(influencer_id)
    return {"data": data}


@router.get("/{influencer_id}/sentiment")
async def get_sentiment(influencer_id: str):
    """Get sentiment analysis"""
    data = await db.get_sentiment(influencer_id)
    return {"data": data}




@router.get("/{influencer_id}/download")
async def download_influencer_pdf(influencer_id: str):
    """Download an influencer profile summary as PDF"""
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    pdf_bytes = profile_to_pdf(profile)
    name = (profile.get("name") or "influencer").replace(" ", "_")[:50]
    safe_name = "".join(c for c in name if c.isalnum() or c in "._-")[:60] or "profile"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_profile.pdf"'},
    )


@router.get("/{influencer_id}/risks")
async def get_risks(influencer_id: str):
    """Get risk flags"""
    data = await db.get_risk_flags(influencer_id)
    return {"data": data}


@router.post("/{influencer_id}/reanalyze")
async def reanalyze_influencer(influencer_id: str):
    """Re-run AI analysis on an existing influencer"""
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
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
async def compare_influencers(req: CompareRequest):
    """Compare two influencers side-by-side"""
    profile_a = await db.get_influencer(req.influencer_a_id)
    profile_b = await db.get_influencer(req.influencer_b_id)
    
    if not profile_a or not profile_b:
        raise HTTPException(status_code=404, detail="One or both influencers not found")
    
    def fmt(n):
        if n >= 10000000: return f"{n/10000000:.2f}Cr"
        if n >= 100000: return f"{n/100000:.2f}L"
        return f"{n:,}"
    
    metrics = [
        {"label": "Followers", "value_a": fmt(profile_a.get("followers", 0)), "value_b": fmt(profile_b.get("followers", 0)), "winner": "a" if profile_a.get("followers", 0) > profile_b.get("followers", 0) else "b"},
        {"label": "Engagement Rate", "value_a": f"{profile_a.get('engagement_rate', 0)}%", "value_b": f"{profile_b.get('engagement_rate', 0)}%", "winner": "a" if profile_a.get("engagement_rate", 0) > profile_b.get("engagement_rate", 0) else "b"},
        {"label": "Avg Likes", "value_a": fmt(profile_a.get("avg_likes", 0)), "value_b": fmt(profile_b.get("avg_likes", 0)), "winner": "a" if profile_a.get("avg_likes", 0) > profile_b.get("avg_likes", 0) else "b"},
        {"label": "Risk Level", "value_a": profile_a.get("risk_level", "unknown"), "value_b": profile_b.get("risk_level", "unknown"), "winner": "a" if profile_a.get("risk_level") == "low" and profile_b.get("risk_level") != "low" else "b" if profile_b.get("risk_level") == "low" else None},
        {"label": "Predicted ROI", "value_a": f"{profile_a.get('predicted_roi', 0)}x", "value_b": f"{profile_b.get('predicted_roi', 0)}x", "winner": "a" if profile_a.get("predicted_roi", 0) > profile_b.get("predicted_roi", 0) else "b"},
        {"label": "Bot %", "value_a": f"{profile_a.get('bot_percentage', 0)}%", "value_b": f"{profile_b.get('bot_percentage', 0)}%", "winner": "a" if profile_a.get("bot_percentage", 0) < profile_b.get("bot_percentage", 0) else "b"},
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
