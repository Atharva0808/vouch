"""
Campaign Tracker API router — manage campaigns, link creators, and calculate ROI metrics
"""
from fastapi import APIRouter, HTTPException, Header
from models.schemas import CampaignCreateRequest, CampaignDetailResponse, CampaignSummary
from services import supabase_service as db

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


@router.post("/create", response_model=dict)
async def create_new_campaign(req: CampaignCreateRequest, x_user_id: str | None = Header(None)):
    """Create a new marketing campaign and assign selected creators"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
        
    try:
        campaign = await db.create_campaign(x_user_id, req.model_dump())
        return {"status": "success", "campaign": campaign}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[CampaignSummary])
async def list_user_campaigns(x_user_id: str | None = Header(None)):
    """List all campaigns for the authenticated user with aggregated metrics"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
        
    try:
        campaigns = await db.get_user_campaigns(x_user_id)
        return campaigns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign_details(campaign_id: str, x_user_id: str | None = Header(None)):
    """Get single campaign details and creator breakdown"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
        
    try:
        detail = await db.get_campaign_detail(campaign_id, x_user_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{campaign_id}")
async def remove_campaign(campaign_id: str, x_user_id: str | None = Header(None)):
    """Delete a campaign"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
        
    try:
        success = await db.delete_campaign(campaign_id, x_user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or already deleted")
        return {"status": "success", "message": "Campaign deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
