"""
Payment routes — Stripe checkout, webhooks, subscription management
"""
from fastapi import APIRouter, HTTPException, Request, Header
from services import stripe_service as stripe_svc
from services import supabase_service as db

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/checkout")
async def create_checkout(price_id: str, user_id: str, user_email: str):
    """Create a Stripe checkout session"""
    try:
        result = await stripe_svc.create_checkout_session(
            user_id=user_id,
            user_email=user_email,
            price_id=price_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portal")
async def create_portal(customer_id: str):
    """Create a Stripe customer portal session"""
    try:
        result = await stripe_svc.create_portal_session(customer_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events"""
    payload = await request.body()
    
    try:
        result = await stripe_svc.handle_webhook(payload, stripe_signature or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if result.get("action") == "upgrade":
        # Update user tier in database
        await db.upsert_user_profile({
            "id": result["user_id"],
            "tier": result["plan"],  # mapped to DB column 'tier'
            "searches_limit": result["searches_limit"],
            "stripe_customer_id": result["customer_id"],
            "searches_used": 0,  # Reset on upgrade
        })
    elif result.get("action") == "downgrade":
        # Find user by customer ID and downgrade to free
        customer_id = result.get("customer_id")
        if customer_id:
            user_prof = await db.get_user_by_stripe_customer_id(customer_id)
            if user_prof:
                await db.upsert_user_profile({
                    "id": user_prof["id"],
                    "tier": "free",
                    "searches_limit": 10,
                })
    
    return {"status": "ok"}


@router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "name": "Free",
                "price": 0,
                "currency": "INR",
                "features": [
                    "10 influencer lookups/month",
                    "Basic engagement metrics",
                    "1 AI brief per month",
                    "Community support",
                ],
                "limitations": [
                    "No risk monitoring",
                    "No PDF exports",
                    "No competitor benchmarking",
                ],
                "cta": "Current Plan",
                "popular": False,
            },
            {
                "name": "Pro",
                "price": 999,
                "currency": "INR",
                "features": [
                    "50 influencer lookups/month",
                    "Deep-dive engagement analysis",
                    "Fake engagement detection",
                    "Sentiment analysis",
                    "20 AI briefs per month",
                    "PDF report exports",
                    "Priority support",
                ],
                "limitations": [
                    "No team collaboration",
                    "No API access",
                ],
                "cta": "Upgrade to Pro",
                "popular": True,
            },
            {
                "name": "Agency",
                "price": 3999,
                "currency": "INR",
                "features": [
                    "Unlimited influencer lookups",
                    "Full risk monitoring dashboard",
                    "Real-time trend tracking",
                    "Unlimited AI briefs",
                    "White-label PDF exports",
                    "Team collaboration",
                    "API access",
                    "Dedicated account manager",
                ],
                "limitations": [],
                "cta": "Upgrade to Agency",
                "popular": False,
            },
        ]
    }
