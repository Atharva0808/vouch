"""
Marketing Drives routes — Brands post campaigns, Creators apply
Like Upwork job postings for influencer marketing
"""
from fastapi import APIRouter, HTTPException, Header
from models.schemas import CreateDriveRequest, ApplyToDriveRequest
from services import supabase_service as db
from datetime import datetime

router = APIRouter(prefix="/api/drives", tags=["Marketing Drives"])

DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"


def get_effective_user_id(x_user_id: str | None) -> str:
    return x_user_id.strip() if x_user_id and x_user_id.strip() else DEFAULT_DEMO_USER_ID


# ======== Drive CRUD (Brand side) ========

@router.post("")
async def create_drive(req: CreateDriveRequest, x_user_id: str | None = Header(None)):
    """Brand creates a new marketing drive / campaign posting"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    drive_data = {
        "user_id": effective_user_id,
        "brand_name": req.brand_name,
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "location_area": req.location_area,
        "city": req.city,
        "platform_preference": req.platform_preference,
        "target_audience": req.target_audience,
        "min_followers": req.min_followers,
        "min_engagement_rate": req.min_engagement_rate,
        "niche_required": req.niche_required,
        "deliverables": req.deliverables,
        "compensation": req.compensation,
        "budget": req.budget,
        "collab_type": req.collab_type,
        "max_applications": req.max_applications,
        "status": "active",
    }
    
    if req.deadline:
        drive_data["deadline"] = req.deadline
    
    drive = await db.create_drive(drive_data)
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Marketing Drive Created",
        details=f"Posted new drive: {req.title} — Budget: ₹{req.budget:,.0f}" if req.budget else f"Posted new drive: {req.title}",
        icon="megaphone",
    )
    
    return {"drive": drive, "message": "Marketing drive created successfully"}


@router.get("")
async def list_drives(
    city: str | None = None,
    category: str | None = None,
    status: str = "active",
    x_user_id: str | None = Header(None),
):
    """Browse all active marketing drives (for creators to discover)"""
    drives = await db.get_drives(city=city, category=category, status=status)
    return {"drives": drives, "count": len(drives)}


@router.get("/my-drives")
async def get_my_drives(x_user_id: str | None = Header(None)):
    """Get all drives posted by the current user (brand)"""
    effective_user_id = get_effective_user_id(x_user_id)
    drives = await db.get_user_drives(effective_user_id)
    return {"drives": drives, "count": len(drives)}


@router.get("/my-applications")
async def get_my_applications(x_user_id: str | None = Header(None)):
    """Get all drives the current user (creator) has applied to"""
    effective_user_id = get_effective_user_id(x_user_id)
    applications = await db.get_user_applications(effective_user_id)
    return {"applications": applications, "count": len(applications)}


@router.get("/{drive_id}")
async def get_drive(drive_id: str, x_user_id: str | None = Header(None)):
    """Get a single drive with its applications count"""
    drive = await db.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    
    applications = await db.get_drive_applications(drive_id)
    drive["applications_count"] = len(applications)
    drive["applications"] = applications
    
    return drive


@router.put("/{drive_id}")
async def update_drive(drive_id: str, req: CreateDriveRequest, x_user_id: str | None = Header(None)):
    """Update an existing drive (only by the brand that created it)"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    drive = await db.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.get("user_id") != effective_user_id and effective_user_id != DEFAULT_DEMO_USER_ID:
        raise HTTPException(status_code=403, detail="Not authorized to edit this drive")
    
    update_data = {
        "brand_name": req.brand_name,
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "location_area": req.location_area,
        "city": req.city,
        "platform_preference": req.platform_preference,
        "target_audience": req.target_audience,
        "min_followers": req.min_followers,
        "min_engagement_rate": req.min_engagement_rate,
        "niche_required": req.niche_required,
        "deliverables": req.deliverables,
        "compensation": req.compensation,
        "budget": req.budget,
        "collab_type": req.collab_type,
        "max_applications": req.max_applications,
    }
    
    updated = await db.update_drive(drive_id, update_data)
    return {"drive": updated, "message": "Drive updated successfully"}


@router.delete("/{drive_id}")
async def delete_drive(drive_id: str, x_user_id: str | None = Header(None)):
    """Delete a drive"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    drive = await db.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.get("user_id") != effective_user_id and effective_user_id != DEFAULT_DEMO_USER_ID:
        raise HTTPException(status_code=403, detail="Not authorized to delete this drive")
    
    await db.delete_drive(drive_id)
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Marketing Drive Deleted",
        details=f"Removed drive: {drive.get('title', 'Unknown')}",
        icon="trash",
    )
    
    return {"deleted": True, "message": "Drive deleted successfully"}


@router.patch("/{drive_id}/status")
async def update_drive_status(drive_id: str, status: str = "active", x_user_id: str | None = Header(None)):
    """Pause/resume/complete a drive"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    drive = await db.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    
    if status not in ("active", "paused", "completed", "expired"):
        raise HTTPException(status_code=400, detail="Invalid status. Use: active, paused, completed, expired")
    
    updated = await db.update_drive(drive_id, {"status": status})
    return {"drive": updated, "message": f"Drive status changed to {status}"}


# ======== Application Routes (Creator side) ========

@router.post("/{drive_id}/apply")
async def apply_to_drive(drive_id: str, req: ApplyToDriveRequest, x_user_id: str | None = Header(None)):
    """Creator applies to a marketing drive"""
    effective_user_id = get_effective_user_id(x_user_id)
    
    # Check drive exists and is active
    drive = await db.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.get("status") != "active":
        raise HTTPException(status_code=400, detail="This drive is no longer accepting applications")
    
    # Check if already applied
    already_applied = await db.check_already_applied(drive_id, effective_user_id)
    if already_applied:
        raise HTTPException(status_code=409, detail="You have already applied to this drive")
    
    # Check eligibility based on minimum criteria
    min_followers = drive.get("min_followers", 0)
    min_er = drive.get("min_engagement_rate", 0.0)
    
    if min_followers > 0 and req.creator_followers < min_followers:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum {min_followers:,} followers required. You have {req.creator_followers:,}."
        )
    
    if min_er > 0 and req.creator_engagement_rate < min_er:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum {min_er}% engagement rate required. You have {req.creator_engagement_rate}%."
        )
    
    # Check max applications cap
    existing_apps = await db.get_drive_applications(drive_id)
    max_apps = drive.get("max_applications", 50)
    if len(existing_apps) >= max_apps:
        raise HTTPException(status_code=400, detail="This drive has reached its maximum number of applications")
    
    application_data = {
        "drive_id": drive_id,
        "user_id": effective_user_id,
        "creator_name": req.creator_name,
        "creator_handle": req.creator_handle,
        "creator_platform": req.creator_platform,
        "creator_followers": req.creator_followers,
        "creator_engagement_rate": req.creator_engagement_rate,
        "creator_location": req.creator_location,
        "pitch": req.pitch,
        "status": "pending",
    }
    
    application = await db.apply_to_drive(application_data)
    
    await db.log_activity(
        user_id=effective_user_id,
        action="Applied to Marketing Drive",
        details=f"Applied to: {drive.get('title', 'Unknown')} by {drive.get('brand_name', 'Unknown')}",
        icon="send",
    )
    
    return {"application": application, "message": "Application submitted successfully"}


@router.patch("/applications/{application_id}/status")
async def update_application(application_id: str, status: str = "pending", x_user_id: str | None = Header(None)):
    """Brand accepts or rejects a creator's application"""
    if status not in ("pending", "accepted", "rejected", "shortlisted"):
        raise HTTPException(status_code=400, detail="Invalid status. Use: pending, accepted, rejected, shortlisted")
    
    updated = await db.update_application_status(application_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"application": updated, "message": f"Application {status}"}
