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


@router.post("/brief")
async def generate_brief(req: BriefRequest, x_user_id: str | None = Header(None)):
    """Generate an AI marketing brief using real influencer data + Groq"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    
    profile = await db.get_influencer(req.influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    brief_content = await ai.generate_brief(
        influencer=profile,
        brand_name=req.brand_name,
        campaign_objective=req.campaign_objective,
        brand_niche=req.brand_niche or "",
        budget=req.budget,
    )
    
    # Calculate a REAL match score with actual brand context
    brand_info = {
        "brand_name": req.brand_name,
        "brand_niche": req.brand_niche or "General",
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
        "user_id": x_user_id,
        "influencer_id": req.influencer_id,
        "name": f"{profile.get('name', 'Unknown')} x {req.brand_name} — Marketing Brief",
        "report_data": report_data_obj,
    })
    
    await db.log_activity(
        user_id=x_user_id,
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    result = await ai.predict_roi(profile, budget)
    return result


@router.post("/predict-analytics/{influencer_id}")
async def get_live_analytics(influencer_id: str, x_user_id: str | None = Header(None)):
    """Predict analytics data using live AI for the dashboard"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    try:
        profile = await db.get_influencer(influencer_id)
        if not profile or profile.get("user_id") != x_user_id:
            raise HTTPException(status_code=403, detail="Influencer not found or access denied")
        
        result = await ai.predict_live_analytics(profile)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-comments")
async def analyze_comments(influencer_id: str, x_user_id: str | None = Header(None)):
    """Run sentiment analysis on real comments"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
    
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")

    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    report_data = await ai.generate_report(profile, report_type)
    
    saved_report = await db.save_report({
        "user_id": x_user_id,
        "influencer_id": influencer_id,
        "name": report_data.get("title", f"{profile.get('name', 'Unknown')} — {report_type.replace('_', ' ').title()}"),
        "report_data": {
            **report_data,
            "type": report_type,
        }
    })
    
    await db.log_activity(
        user_id=x_user_id,
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
    if not x_user_id:
        return {"reports": []}
    reports = await db.get_reports(user_id=x_user_id)
    return {"reports": reports}


@router.get("/reports/{report_id}")
async def get_report(report_id: str, x_user_id: str | None = Header(None)):
    """Get a specific report by ID"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    report = await db.get_report(report_id)
    if not report or report.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Report not found or access denied")
    return report


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str, x_user_id: str | None = Header(None)):
    """Download a single report as PDF"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    report = await db.get_report(report_id)
    if not report or report.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Report not found or access denied")
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    reports = []
    for rid in req.report_ids:
        r = await db.get_report(rid)
        if r and r.get("user_id") == x_user_id:
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
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    report = await db.get_report(report_id)
    if not report or report.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Report not found or access denied")
    report_name = report.get("name", "Unknown report")
    await db.delete_report(report_id)
    await db.log_activity(
        user_id=x_user_id,
        action="Report Deleted",
        details=f"Removed report: {report_name}",
        icon="trash",
    )
    return {"deleted": True, "id": report_id}


@router.get("/activity")
async def get_activity_feed(limit: int = 20, x_user_id: str | None = Header(None)):
    """Get recent activity/notifications"""
    if not x_user_id:
        return {"activities": []}
    activities = await db.get_activity_feed(user_id=x_user_id, limit=limit)
    return {"activities": activities}


@router.get("/market-rates/{influencer_id}")
async def get_market_rates(influencer_id: str, x_user_id: str | None = Header(None)):
    """Get estimated market rates for an influencer"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    rates = await ai.estimate_market_rates(profile)
    return rates


@router.post("/outreach-hook/{influencer_id}")
async def get_outreach_hook(influencer_id: str, brand_name: str = "Our Brand", x_user_id: str | None = Header(None)):
    """Generate a personalized outreach hook"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
    hook = await ai.generate_outreach_hook(profile, brand_name)
    return hook


@router.post("/content-audit/{influencer_id}")
async def run_content_audit(influencer_id: str, x_user_id: str | None = Header(None)):
    """Run a deep brand safety audit on recent content"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id required")
        
    profile = await db.get_influencer(influencer_id)
    if not profile or profile.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Influencer not found or access denied")
    
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
