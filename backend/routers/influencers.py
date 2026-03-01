"""
Influencer API routes — fetch, search, analyze real influencers
"""
from fastapi import APIRouter, HTTPException, Query
from models.schemas import (
    InfluencerProfile, SocialFetchRequest, SearchRequest,
    SentimentAnalysis, RiskAssessment, CompareRequest, CompareResponse
)
from services import supabase_service as db
from services import ai_service as ai
from services import social_service as social
from datetime import datetime

router = APIRouter(prefix="/api/influencers", tags=["Influencers"])


@router.post("/fetch", response_model=dict)
async def fetch_influencer(req: SocialFetchRequest):
    """Fetch REAL influencer data from social media and run full AI analysis"""
    try:
        # Clean handle: strip spaces, @, lowercase
        clean_handle = req.handle.replace(" ", "").replace("@", "").lower().strip()
        
        # 1. Fetch real profile from social media
        profile = await social.fetch_social_profile(clean_handle, req.platform)
        
        # 2. Fetch real comments for sentiment analysis
        comments = await social.fetch_comments(clean_handle, req.platform, profile)
        
        # 3. Generate engagement timeline from real data
        timeline = social.generate_engagement_timeline(profile)
        
        # 4. Run AI analysis in parallel-ish fashion
        # Match score
        match_result = await ai.calculate_match_score(profile)
        profile["match_score"] = match_result.get("match_score", 0)
        profile["recommendation"] = match_result.get("recommendation", "consider")
        
        # Risk assessment — uses ONLY real profile metrics + real comments (no synthetic timeline)
        risk_result = await ai.assess_risk(profile, comments)
        profile["risk_level"] = risk_result.get("overall_risk", "medium")
        profile["bot_percentage"] = risk_result.get("bot_percentage", 0)
        
        # Sentiment
        sentiment = {}
        if comments:
            sentiment = await ai.analyze_sentiment(comments, profile.get("name", ""))
            profile["brand_safety_score"] = sentiment.get("brand_safety_score", 0)
        
        # Fake engagement detection
        fake_result = await ai.detect_fake_engagement(timeline, profile)
        
        # ROI prediction
        roi_result = await ai.predict_roi(profile)
        profile["predicted_roi"] = roi_result.get("predicted_roi", 0)
        
        # 5. Save everything to Supabase
        saved_profile = await db.upsert_influencer({
            **profile,
            "niche": profile.get("niche", []),
            "updated_at": datetime.utcnow().isoformat(),
        })
        
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
            action="Influencer Fetched",
            details=f"Added {profile.get('name', '')} ({profile.get('handle', '')}) from {req.platform} — {follower_str} followers, {profile.get('risk_level', 'unknown')} risk",
            icon="user-plus",
        )
        # Alert on high/critical risk
        risk_lvl = risk_result.get("overall_risk", "low")
        if risk_lvl in ("high", "critical"):
            await db.log_activity(
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
):
    """Search influencers from the database"""
    results = await db.search_influencers(
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
async def list_influencers(limit: int = 50, offset: int = 0):
    """Get all indexed influencers"""
    results = await db.get_all_influencers(limit=limit, offset=offset)
    return {"results": results, "count": len(results)}


@router.get("/risks/all")
async def get_all_risk_flags():
    """Get all risk flags across all influencers with influencer details"""
    data = await db.get_all_risk_flags()
    return data


@router.delete("/risks/{flag_id}")
async def delete_risk_flag(flag_id: str):
    """Delete a single risk flag"""
    try:
        success = await db.delete_risk_flag(flag_id)
        if not success:
            raise HTTPException(status_code=404, detail="Risk flag not found")
        await db.log_activity(
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
async def clear_all_influencers():
    """Delete ALL influencers and related data from the database"""
    try:
        await db.clear_all_influencers()
        await db.log_activity(
            action="Collection Cleared",
            details="All influencers and their analysis data were permanently deleted",
            icon="trash",
        )
        return {"deleted": True, "message": "All influencers and data cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{influencer_id}")
async def delete_influencer(influencer_id: str):
    """Delete a single influencer and all related data"""
    try:
        # Get name before deleting for notification
        profile = await db.get_influencer(influencer_id)
        name = profile.get("name", "Unknown") if profile else "Unknown"
        handle = profile.get("handle", "") if profile else ""
        
        success = await db.delete_influencer(influencer_id)
        if not success:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        await db.log_activity(
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
    
    await db.upsert_influencer({**profile, **updated})
    
    if risk_result.get("flags"):
        await db.save_risk_flags(influencer_id, risk_result["flags"])
        
    if sentiment:
        await db.save_sentiment(influencer_id, sentiment)
    
    await db.log_activity(
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
        if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
        if n >= 1_000: return f"{n/1_000:.1f}K"
        return str(n)
    
    metrics = [
        {"label": "Followers", "value_a": fmt(profile_a.get("followers", 0)), "value_b": fmt(profile_b.get("followers", 0)), "winner": "a" if profile_a.get("followers", 0) > profile_b.get("followers", 0) else "b"},
        {"label": "Engagement Rate", "value_a": f"{profile_a.get('engagement_rate', 0)}%", "value_b": f"{profile_b.get('engagement_rate', 0)}%", "winner": "a" if profile_a.get("engagement_rate", 0) > profile_b.get("engagement_rate", 0) else "b"},
        {"label": "Avg Likes", "value_a": fmt(profile_a.get("avg_likes", 0)), "value_b": fmt(profile_b.get("avg_likes", 0)), "winner": "a" if profile_a.get("avg_likes", 0) > profile_b.get("avg_likes", 0) else "b"},
        {"label": "Match Score", "value_a": f"{profile_a.get('match_score', 0)}%", "value_b": f"{profile_b.get('match_score', 0)}%", "winner": "a" if profile_a.get("match_score", 0) > profile_b.get("match_score", 0) else "b"},
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
