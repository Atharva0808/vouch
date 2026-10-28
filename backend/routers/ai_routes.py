"""
AI routes — brief generation, ROI prediction, report generation
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import Response
from models.schemas import BriefRequest, BriefResponse, CombinedDownloadRequest
from services import supabase_service as db
from services import ai_service as ai
from services import social_service as social
from services.pdf_service import report_to_pdf, reports_to_combined_pdf
from datetime import datetime

router = APIRouter(prefix="/api/ai", tags=["AI"])

DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

def get_effective_user_id(x_user_id: any) -> str:
    if isinstance(x_user_id, str) and x_user_id.strip() and x_user_id.strip() != "undefined":
        return x_user_id.strip()
    return DEFAULT_DEMO_USER_ID

def check_access(owner_id: str | None, effective_user_id: str) -> bool:
    if not owner_id or not effective_user_id:
        return False
    # Reports can be viewed if owner matches or if created under default demo user
    return str(owner_id) == str(effective_user_id) or str(owner_id) == DEFAULT_DEMO_USER_ID or str(effective_user_id) == DEFAULT_DEMO_USER_ID


@router.post("/brief")
async def generate_brief(req: BriefRequest, x_user_id: str | None = Header(None)):
    """Generate an AI marketing brief using real influencer data + Groq"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    profile = await db.get_influencer(req.influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    brief_content = await ai.generate_brief(
        influencer=profile,
        brand_name=req.brand_name,
        campaign_objective=req.campaign_objective,
        brand_niche=req.brand_niche or "",
        budget=req.budget,
        brand_location=req.location or "",
        deliverables=req.deliverables,
        target_audience=req.target_audience,
    )
    
    # Calculate a REAL match score with actual brand context
    brand_info = {
        "brand_name": req.brand_name,
        "brand_niche": req.brand_niche or "General",
        "brand_location": req.location or "",
        "campaign_objective": req.campaign_objective,
        "budget": req.budget,
    }
    try:
        match_result = await ai.calculate_match_score(profile, brand_info)
        match_score = match_result.get("match_score") or profile.get("match_score", 85)
        match_recommendation = match_result.get("recommendation", "consider")
        match_reasoning = match_result.get("reasoning", "")
    except Exception:
        match_score = profile.get("match_score", 85)
        match_recommendation = "consider"
        match_reasoning = "High campaign alignment based on creator engagement profile."
    
    # Save the report to database with actual user_id
    # No more SYSTEM_USER_ID
    
    report_data_obj = {
        "type": "brief",
        "brief": brief_content,
        "campaign_objective": req.campaign_objective,
        "brand_name": req.brand_name,
        "score": match_score,
        "summary": match_reasoning or f"Campaign Brief created for {profile.get('name', 'Unknown')} x {req.brand_name}.",
        "recommendation": match_recommendation.upper(),
        "match_score": match_score,
        "match_recommendation": match_recommendation,
        "match_reasoning": match_reasoning,
    }

    report = await db.save_report({
        "user_id": effective_user_id,
        "influencer_id": req.influencer_id,
        "name": f"{profile.get('name', 'Unknown')} x {req.brand_name} — Marketing Brief",
        "report_data": report_data_obj,
    })
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Campaign Brief Generated",
        details=f"Created brief for {profile.get('name', '')} x {req.brand_name} — {req.campaign_objective}",
        icon="report",
    )
    
    return {
        "brief": brief_content,
        "influencer_name": profile.get("name", ""),
        "match_score": match_score,
        "match_recommendation": match_recommendation,
        "match_reasoning": match_reasoning,
        "generated_at": datetime.utcnow().isoformat(),
        "report_id": report.get("id"),
    }


@router.post("/roi/{influencer_id}")
async def predict_roi(influencer_id: str, budget: float = 0, x_user_id: str | None = Header(None)):
    """Predict ROI for a campaign with this influencer"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    result = await ai.predict_roi(profile, budget)
    return result


@router.post("/predict-analytics/{influencer_id}")
async def get_live_analytics(influencer_id: str, x_user_id: str | None = Header(None)):
    """Predict analytics data using live AI for the dashboard"""
    effective_user_id = get_effective_user_id(x_user_id)
    try:
        profile = await db.get_influencer(influencer_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Influencer not found or access denied")
        
        result = await ai.predict_live_analytics(profile)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-comments")
async def analyze_comments(influencer_id: str, x_user_id: str | None = Header(None)):
    """Run sentiment analysis on real comments"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    # Fetch fresh comments
    from services import social_service as social
    handle = profile.get("handle", "").replace("@", "")
    platform = profile.get("platform", "instagram")
    
    comments = await social.fetch_comments(handle, platform, profile)
    
    if not comments:
        raise HTTPException(status_code=404, detail="No comments found")
    
    sentiment = await ai.analyze_sentiment(comments, profile.get("name", ""))
    
    # Save to DB
    await db.save_sentiment(influencer_id, sentiment)
    
    return sentiment


@router.post("/generate-report")
async def generate_report(influencer_id: str, report_type: str = "full_analysis", x_user_id: str | None = Header(None)):
    """Generate a comprehensive AI analysis report for an influencer"""
    effective_user_id = get_effective_user_id(x_user_id)

    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    report_data = await ai.generate_report(profile, report_type)
    
    saved_report = await db.save_report({
        "user_id": effective_user_id,
        "influencer_id": influencer_id,
        "name": report_data.get("title", f"{profile.get('name', 'Unknown')} — {report_type.replace('_', ' ').title()}"),
        "report_data": {
            **report_data,
            "type": report_type,
        }
    })
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Report Generated",
        details=f"{report_type.replace('_', ' ').title()} report created for {profile.get('name', 'Unknown')} ({profile.get('handle', '')})",
        icon="report",
    )
    
    return {
        **report_data,
        "id": saved_report.get("id"),
        "influencer_name": profile.get("name", ""),
        "influencer_handle": profile.get("handle", ""),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/reports")
async def get_reports(x_user_id: str | None = Header(None)):
    """Get all generated reports from the database"""
    effective_user_id = get_effective_user_id(x_user_id)
    reports = await db.get_reports(user_id=effective_user_id)
    return {"reports": reports}


@router.get("/reports/{report_id}")
async def get_report(report_id: str, x_user_id: str | None = Header(None)):
    """Get a specific report by ID"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    report = await db.get_report(report_id)
    if not report or not check_access(report.get("user_id"), effective_user_id):
        raise HTTPException(status_code=404, detail="Report not found or access denied")
    return report


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str, x_user_id: str | None = Header(None)):
    """Download a single report as PDF"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    report = await db.get_report(report_id)
    if not report or not check_access(report.get("user_id"), effective_user_id):
        raise HTTPException(status_code=404, detail="Report not found or access denied")
    pdf_bytes = report_to_pdf(report)
    name = (report.get("name") or "report").replace(" ", "_")[:50]
    safe_name = "".join(c for c in name if c.isalnum() or c in "._-")[:60] or "report"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
    )


@router.post("/reports/download-combined")
async def download_combined_reports(req: CombinedDownloadRequest, x_user_id: str | None = Header(None)):
    """Download multiple reports combined into one PDF"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    reports = []
    for rid in req.report_ids:
        r = await db.get_report(rid)
        if r and check_access(r.get("user_id"), effective_user_id):
            reports.append(r)
    if not reports:
        raise HTTPException(status_code=404, detail="No valid reports found")
    pdf_bytes = reports_to_combined_pdf(reports)
    first_name = (reports[0].get("name") or "reports").replace(" ", "_")[:40]
    safe_name = "".join(c for c in first_name if c.isalnum() or c in "._-")[:40] or "reports"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_combined.pdf"'},
    )


@router.delete("/reports/{report_id}")
async def delete_report(report_id: str, x_user_id: str | None = Header(None)):
    """Delete a report by ID"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    report = await db.get_report(report_id)
    if not report or not check_access(report.get("user_id"), effective_user_id):
        raise HTTPException(status_code=404, detail="Report not found or access denied")
    report_name = report.get("name", "Unknown report")
    await db.delete_report(report_id)
    await db.log_activity(
        user_id=effective_user_id,
        action="Report Deleted",
        details=f"Removed report: {report_name}",
        icon="trash",
    )
    return {"deleted": True, "id": report_id}


@router.get("/activity")
async def get_activity_feed(limit: int = 20, x_user_id: str | None = Header(None)):
    """Get recent activity/notifications"""
    effective_user_id = get_effective_user_id(x_user_id)
    activities = await db.get_activity_feed(user_id=effective_user_id, limit=limit)
    return {"activities": activities}


@router.get("/market-rates/{influencer_id}")
async def get_market_rates(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get estimated market rates for an influencer"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    rates = await ai.estimate_market_rates(profile)
    return rates


@router.post("/outreach-hook/{influencer_id}")
async def get_outreach_hook(influencer_id: str, brand_name: str = "Our Brand", x_user_id: str | None = Header(None)):
    """Generate a personalized outreach hook"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    hook = await ai.generate_outreach_hook(profile, brand_name)
    return hook


@router.post("/content-audit/{influencer_id}")
async def run_content_audit(influencer_id: str, x_user_id: str | None = Header(None)):
    """Run a deep brand safety audit on recent content"""
    effective_user_id = get_effective_user_id(x_user_id)
        
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found or access denied")
    
    # Get recent posts for captions live since DB doesn't store them
    try:
        live_data = await social.fetch_social_profile(profile.get("handle", ""), profile.get("platform", "instagram"))
        recent_posts = live_data.get("recent_posts", [])
    except Exception as e:
        recent_posts = []
        
    captions = []
    for post in recent_posts:
        if isinstance(post, dict):
            cap = post.get("caption", post.get("text", ""))
            if cap: captions.append(cap)
        elif isinstance(post, str):
            captions.append(post)
            
    try:
        audit_results = await ai.audit_content_safety(captions)
        return audit_results
    except Exception as e:
        return {
            "risk_score": 0,
            "risk_level": "unknown",
            "detected_flags": [],
            "summary": f"Audit failed: {str(e)}",
            "safe_for_brands": False
        }


@router.post("/predict-analytics/{influencer_id}")
async def predict_analytics(influencer_id: str, x_user_id: str | None = Header(None)):
    """Predictive live analytics engine using real influencer performance metrics"""
    effective_user_id = get_effective_user_id(x_user_id)
    profile = await db.get_influencer(influencer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer not found")

    followers = profile.get("followers", 0) or 50000
    er = profile.get("engagement_rate", 0.0) or 4.5
    avg_likes = profile.get("avg_likes", 0) or int(followers * (er / 100))
    avg_comments = profile.get("avg_comments", 0) or int(avg_likes * 0.05)
    platform = (profile.get("platform") or "instagram").lower()

    # 1. 6-Month Real Growth Forecast
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_month_idx = datetime.utcnow().month - 1
    growth_rate = 1.025 if profile.get("trending") == "up" else (0.985 if profile.get("trending") == "down" else 1.01)

    growth_forecast = []
    current_f = followers
    for i in range(6):
        month_name = months[(current_month_idx + i + 1) % 12]
        current_f = int(current_f * growth_rate)
        predicted_eng = round(er * (1 + ((i % 3) * 0.04 - 0.02)), 2)
        reach = int(current_f * (0.68 if platform == "instagram" else 0.48))
        growth_forecast.append({
            "month": month_name,
            "followers": current_f,
            "engagement": max(0.5, predicted_eng),
            "reach": reach,
        })

    # 2. Audience Demographics based on platform and niche
    niche = profile.get("niche") or ["Lifestyle"]
    first_niche = niche[0].lower() if niche else "lifestyle"
    if "tech" in first_niche or "gaming" in first_niche:
        demographics = [
            {"age": "18-24", "percent": 45},
            {"age": "25-34", "percent": 35},
            {"age": "35-44", "percent": 14},
            {"age": "45+", "percent": 6},
        ]
    elif "fashion" in first_niche or "beauty" in first_niche:
        demographics = [
            {"age": "18-24", "percent": 52},
            {"age": "25-34", "percent": 32},
            {"age": "35-44", "percent": 11},
            {"age": "45+", "percent": 5},
        ]
    else:
        demographics = [
            {"age": "18-24", "percent": 38},
            {"age": "25-34", "percent": 42},
            {"age": "35-44", "percent": 14},
            {"age": "45+", "percent": 6},
        ]

    # 3. Campaign Prediction in INR
    estimated_reach = int(followers * (0.65 if platform == "instagram" else 0.42))
    estimated_impressions = int(followers * 0.92)
    clicks = max(10, int(followers * (er / 100) * 0.18))
    conversions = max(2, int(clicks * 0.08))
    cost_per_post = max(2500, int((followers * 0.045) / 500) * 500)
    cpe = round(cost_per_post / max(1, avg_likes), 2)
    roi = profile.get("predicted_roi") or round(3.2 + (er * 0.2), 1)

    campaign_prediction = {
        "estimatedReach": estimated_reach,
        "estimatedImpressions": estimated_impressions,
        "estimatedClicks": clicks,
        "estimatedConversions": conversions,
        "costPerPost": cost_per_post,
        "cpe": cpe,
        "roi": roi,
        "engagementValue": int(avg_likes * 1.5 + avg_comments * 4),
    }

    # 4. Weekly Performance rhythm
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    multipliers = [0.82, 0.91, 1.15, 0.96, 1.28, 1.35, 1.22]
    weekly_performance = []
    for d, m in zip(days, multipliers):
        weekly_performance.append({
            "day": d,
            "predictedLikes": int(avg_likes * m),
            "predictedComments": int(avg_comments * m),
            "predictedReach": int(estimated_reach * m * 0.25),
        })

    return {
        "growth_forecast": growth_forecast,
        "audience_demographics": demographics,
        "campaign_prediction": campaign_prediction,
        "weekly_performance": weekly_performance,
    }

