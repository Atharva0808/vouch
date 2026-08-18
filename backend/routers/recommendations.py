"""
AI Creator Recommendation API router — Automated multi-criteria creator discovery and ranking
"""
from fastapi import APIRouter, HTTPException, Header
from models.schemas import RecommendationRequest, RecommendationResponse
from services import recommender_service as recommender
from services import supabase_service as db

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.post("/discover", response_model=RecommendationResponse)
async def discover_top_creators(req: RecommendationRequest, x_user_id: str | None = Header(None)):
    """Run the AI Recommender Engine across social media and return Top 5 ranked creators"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")

    try:
        results = await recommender.run_creator_recommendations(x_user_id, req.model_dump())
        
        # Log to user activity feed
        await db.log_activity(
            user_id=x_user_id,
            action="AI Recommendations Generated",
            details=f"Ranked Top 5 creators for {req.category} (Age: {req.audience_age}, Budget: ₹{req.budget:,.0f})",
            icon="sparkles"
        )
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
