import json
import os
from fastapi import APIRouter, HTTPException, Header
from services import supabase_service as db
from pydantic import BaseModel

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    company: str | None = None
    role: str | None = None
    account_type: str | None = None
    onboarding_completed: bool | None = None
    onboarding_data: dict | None = None
    business_name: str | None = None
    category: str | None = None
    location_area: str | None = None
    city: str | None = None
    target_age: list[str] | None = None
    interests: list[str] | None = None
    collaboration_type: str | None = None
    deliverables: list[str] | None = None
    social_handle: str | None = None
    primary_platform: str | None = None
    budget_range: str | None = None
    notifications: dict | None = None

SETTINGS_FILE = "settings_store.json"

def get_local_settings(user_id: str) -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return data.get(user_id, {})
        except:
            pass
    return {}

def save_local_settings(user_id: str, settings: dict):
    data = {}
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
        except:
            pass
    
    current_usr = data.get(user_id, {})
    current_usr.update(settings)
    data[user_id] = current_usr

    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=4)
    return current_usr

@router.get("/{user_id}")
async def get_profile(user_id: str, x_user_id: str | None = Header(None)):
    if not x_user_id or x_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    profile = await db.get_user_profile(user_id) or {}
    if not profile:
        profile = await db.upsert_user_profile({"id": user_id})
    local_settings = get_local_settings(user_id)
    # Filter out null DB values so local settings fallbacks are preserved
    clean_profile = {k: v for k, v in profile.items() if v is not None}
    merged = {**local_settings, **clean_profile}
    return merged

@router.post("/{user_id}")
async def update_profile(user_id: str, profile: UserProfileUpdate, x_user_id: str | None = Header(None)):
    if not x_user_id or x_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    data = profile.dict(exclude_unset=True)
    
    # Map fields to database payload
    db_fields = [
        "id", "email", "full_name", "company", "role", "notifications",
        "account_type", "onboarding_completed", "onboarding_data",
        "business_name", "category", "location_area", "city",
        "target_age", "interests", "collaboration_type", "deliverables",
        "social_handle", "primary_platform", "budget_range"
    ]
    db_data = {k: v for k, v in data.items() if k in db_fields}
    db_data["id"] = user_id
    
    # Try updating the base user profile in database
    updated = {}
    try:
        updated = await db.upsert_user_profile(db_data)
    except Exception as e:
        print(f"Error updating user profile in db: {e}")
    
    # Also save to local settings store for fallback
    saved_local = save_local_settings(user_id, data)
    
    merged = {**saved_local, **updated}
    return merged

@router.post("/{user_id}/onboarding")
async def save_onboarding(user_id: str, payload: dict, x_user_id: str | None = Header(None)):
    if not x_user_id or x_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Ensure onboarding_completed is true
    payload["onboarding_completed"] = True
    payload["id"] = user_id
    
    try:
        updated = await db.upsert_user_profile(payload)
    except Exception as e:
        print(f"Error saving onboarding in db: {e}")
        updated = {}
    
    saved_local = save_local_settings(user_id, payload)
    
    # Log activity feed event
    try:
        acc_type = payload.get("account_type", "user").capitalize()
        await db.log_activity(
            user_id=user_id,
            action=f"{acc_type} Onboarding Complete",
            details=f"Configured matching profile for {payload.get('business_name') or payload.get('social_handle') or 'your account'}",
            icon="user-plus"
        )
    except Exception:
        pass
        
    return {**saved_local, **updated, "status": "success"}


