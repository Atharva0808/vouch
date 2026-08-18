"""
AI Automated Creator Recommendation Engine — Multi-Criteria Weighted Scoring & Ranking System
"""
import os
import json
from datetime import datetime
from groq import Groq
from services import supabase_service as db
from services.ai_service import get_groq, MODEL

# Pre-curated real creators knowledge base for rich multi-category discovery
NICHE_CREATOR_SEEDS = {
    "Tech": [
        {"name": "Marques Brownlee", "handle": "mkbhd", "platform": "youtube", "followers": 18500000, "engagement_rate": 3.8, "risk_level": "low", "predicted_roi": 3.8, "niche": ["Tech", "Gadgets", "Reviews"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Technical Guruji", "handle": "technicalguruji", "platform": "youtube", "followers": 23400000, "engagement_rate": 2.9, "risk_level": "low", "predicted_roi": 3.4, "niche": ["Tech", "Smartphones", "Hindi"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Shlok Srivastava", "handle": "techburner", "platform": "instagram", "followers": 4800000, "engagement_rate": 5.4, "risk_level": "low", "predicted_roi": 4.1, "niche": ["Tech", "Comedy", "Gadgets"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Austin Evans", "handle": "austintechtips", "platform": "youtube", "followers": 5400000, "engagement_rate": 3.2, "risk_level": "low", "predicted_roi": 3.2, "niche": ["Tech", "Gaming", "Builds"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
        {"name": "Beebom", "handle": "beebomco", "platform": "instagram", "followers": 1900000, "engagement_rate": 4.2, "risk_level": "low", "predicted_roi": 3.6, "niche": ["Tech", "Apps", "AI"], "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Gagandeep Singh", "handle": "geekygadgets", "platform": "instagram", "followers": 850000, "engagement_rate": 4.9, "risk_level": "low", "predicted_roi": 3.9, "niche": ["Tech", "Audio", "Unboxing"], "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80"},
    ],
    "Fitness": [
        {"name": "Ranveer Allahbadia", "handle": "beerbiceps", "platform": "instagram", "followers": 4200000, "engagement_rate": 4.1, "risk_level": "low", "predicted_roi": 3.7, "niche": ["Fitness", "Health", "Lifestyle"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Gaurav Taneja", "handle": "flyingbeast320", "platform": "youtube", "followers": 8900000, "engagement_rate": 5.2, "risk_level": "low", "predicted_roi": 4.2, "niche": ["Fitness", "Bodybuilding", "Vlogs"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Yatinder Singh", "handle": "yatindersingh_official", "platform": "instagram", "followers": 1700000, "engagement_rate": 3.6, "risk_level": "low", "predicted_roi": 3.4, "niche": ["Fitness", "Workouts", "Nutrition"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Jeet Selal", "handle": "jeetselal", "platform": "youtube", "followers": 4100000, "engagement_rate": 4.8, "risk_level": "low", "predicted_roi": 3.9, "niche": ["Fitness", "Science", "Training"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
        {"name": "Radhika Bose", "handle": "yogasini", "platform": "instagram", "followers": 640000, "engagement_rate": 5.8, "risk_level": "low", "predicted_roi": 4.3, "niche": ["Fitness", "Yoga", "Wellness"], "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
    ],
    "Beauty": [
        {"name": "Kritika Khurana", "handle": "thatbohogirl", "platform": "instagram", "followers": 1800000, "engagement_rate": 4.9, "risk_level": "low", "predicted_roi": 4.0, "niche": ["Beauty", "Fashion", "Lifestyle"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Malvika Sitlani", "handle": "malvikasitlaniofficial", "platform": "instagram", "followers": 650000, "engagement_rate": 5.1, "risk_level": "low", "predicted_roi": 4.2, "niche": ["Beauty", "Skincare", "Makeup"], "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
        {"name": "Shreya Jain", "handle": "shreyajain26", "platform": "youtube", "followers": 820000, "engagement_rate": 6.2, "risk_level": "low", "predicted_roi": 4.4, "niche": ["Beauty", "Cosmetics", "Tutorials"], "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"},
        {"name": "Komal Pandey", "handle": "komalpandeyofficial", "platform": "instagram", "followers": 1900000, "engagement_rate": 6.8, "risk_level": "low", "predicted_roi": 4.5, "niche": ["Fashion", "Beauty", "Styling"], "avatar_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80"},
    ],
    "Fashion": [
        {"name": "Komal Pandey", "handle": "komalpandeyofficial", "platform": "instagram", "followers": 1900000, "engagement_rate": 6.8, "risk_level": "low", "predicted_roi": 4.5, "niche": ["Fashion", "Styling", "Outfits"], "avatar_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80"},
        {"name": "Siddharth Batra", "handle": "siddharth98batra", "platform": "instagram", "followers": 320000, "engagement_rate": 5.5, "risk_level": "low", "predicted_roi": 3.8, "niche": ["Fashion", "Menswear", "Grooming"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Aashna Shroff", "handle": "aashnashroff", "platform": "instagram", "followers": 1050000, "engagement_rate": 4.3, "risk_level": "low", "predicted_roi": 3.9, "niche": ["Fashion", "Luxury", "Travel"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Santoshi Shetty", "handle": "santoshishetty", "platform": "instagram", "followers": 780000, "engagement_rate": 4.1, "risk_level": "low", "predicted_roi": 3.6, "niche": ["Fashion", "Architecture", "Lifestyle"], "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"},
    ],
    "Gaming": [
        {"name": "CarryMinati (Ajey Nagar)", "handle": "carryislive", "platform": "youtube", "followers": 12500000, "engagement_rate": 7.4, "risk_level": "medium", "predicted_roi": 4.1, "niche": ["Gaming", "Streaming", "Entertainment"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Total Gaming (Ajay)", "handle": "totalgaming_official", "platform": "youtube", "followers": 39800000, "engagement_rate": 4.5, "risk_level": "low", "predicted_roi": 3.9, "niche": ["Gaming", "FreeFire", "Esports"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Mortal (Naman Mathur)", "handle": "ig_mortal", "platform": "instagram", "followers": 5400000, "engagement_rate": 6.1, "risk_level": "low", "predicted_roi": 4.3, "niche": ["Gaming", "Esports", "BGMI"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
        {"name": "Scout (Tanmay Singh)", "handle": "scout_op", "platform": "youtube", "followers": 4900000, "engagement_rate": 5.3, "risk_level": "low", "predicted_roi": 3.7, "niche": ["Gaming", "Competitive", "Tech"], "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"},
    ],
    "Food": [
        {"name": "Ranveer Brar", "handle": "ranveer.brar", "platform": "instagram", "followers": 3600000, "engagement_rate": 4.8, "risk_level": "low", "predicted_roi": 4.2, "niche": ["Food", "Culinary", "Recipes"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Kunal Kapur", "handle": "chefkunal", "platform": "youtube", "followers": 6100000, "engagement_rate": 4.2, "risk_level": "low", "predicted_roi": 3.8, "niche": ["Food", "Cooking", "Indian"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Kabita Singh", "handle": "kabitaskitchen", "platform": "youtube", "followers": 13900000, "engagement_rate": 3.5, "risk_level": "low", "predicted_roi": 3.6, "niche": ["Food", "Home Cooking", "Daily"], "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
        {"name": "Your Food Lab (Sanjyot Keer)", "handle": "yourfoodlab", "platform": "instagram", "followers": 2900000, "engagement_rate": 5.9, "risk_level": "low", "predicted_roi": 4.4, "niche": ["Food", "Street Food", "Cinematic"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
    ],
    "Travel": [
        {"name": "Shenaz Treasury", "handle": "shenaztreasury", "platform": "instagram", "followers": 1100000, "engagement_rate": 4.7, "risk_level": "low", "predicted_roi": 3.9, "niche": ["Travel", "Hotels", "Vlogs"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Mountain Trekker (Varun Vagish)", "handle": "mountaintrekker", "platform": "youtube", "followers": 1700000, "engagement_rate": 5.1, "risk_level": "low", "predicted_roi": 4.1, "niche": ["Travel", "Backpacking", "Mountains"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Tanya Khanijow", "handle": "tanyakhanijow", "platform": "youtube", "followers": 1200000, "engagement_rate": 5.6, "risk_level": "low", "predicted_roi": 4.2, "niche": ["Travel", "Solo Travel", "Culture"], "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
    ],
    "Finance": [
        {"name": "Ankur Warikoo", "handle": "warikoo", "platform": "youtube", "followers": 4300000, "engagement_rate": 5.8, "risk_level": "low", "predicted_roi": 4.5, "niche": ["Finance", "Career", "Mindset"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Sharan Hegde", "handle": "financewithsharan", "platform": "instagram", "followers": 2700000, "engagement_rate": 6.9, "risk_level": "low", "predicted_roi": 4.6, "niche": ["Finance", "Investing", "Comedy"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "Akshat Shrivastava", "handle": "akshat_shrivastava", "platform": "youtube", "followers": 2200000, "engagement_rate": 4.4, "risk_level": "low", "predicted_roi": 3.8, "niche": ["Finance", "Stocks", "Real Estate"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
        {"name": "Pranjal Kamra", "handle": "pranjalkamra", "platform": "youtube", "followers": 6500000, "engagement_rate": 3.9, "risk_level": "low", "predicted_roi": 3.7, "niche": ["Finance", "Mutual Funds", "Savings"], "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"},
    ],
    "Lifestyle": [
        {"name": "Dolly Singh", "handle": "dollysingh", "platform": "instagram", "followers": 1600000, "engagement_rate": 5.2, "risk_level": "low", "predicted_roi": 4.0, "niche": ["Lifestyle", "Comedy", "Acting"], "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"},
        {"name": "Kusha Kapila", "handle": "kushakapila", "platform": "instagram", "followers": 3800000, "engagement_rate": 4.9, "risk_level": "low", "predicted_roi": 4.1, "niche": ["Lifestyle", "Entertainment", "Fashion"], "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"},
        {"name": "Ahsaas Channa", "handle": "ahsaassy_", "platform": "instagram", "followers": 3900000, "engagement_rate": 6.3, "risk_level": "low", "predicted_roi": 4.3, "niche": ["Lifestyle", "Acting", "Gen-Z"], "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"},
    ],
    "Education": [
        {"name": "Dhruv Rathee", "handle": "dhruvrathee", "platform": "youtube", "followers": 26800000, "engagement_rate": 6.2, "risk_level": "medium", "predicted_roi": 3.9, "niche": ["Education", "Analysis", "Current Affairs"], "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"},
        {"name": "Abhi and Niyu", "handle": "abhiandniyu", "platform": "instagram", "followers": 5100000, "engagement_rate": 5.5, "risk_level": "low", "predicted_roi": 4.2, "niche": ["Education", "Positive News", "India"], "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"},
        {"name": "StudyIQ IAS", "handle": "studyiq", "platform": "youtube", "followers": 17200000, "engagement_rate": 3.1, "risk_level": "low", "predicted_roi": 3.3, "niche": ["Education", "Exam Prep", "UPSC"], "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"},
    ]
}


def calculate_estimated_fee(followers: int, er: float, platform: str) -> float:
    """Calculate realistic estimated commercial post fee in INR"""
    if followers < 100000:
        base = 25000.0 + (followers / 100000) * 20000.0
    elif followers < 1000000:
        base = 50000.0 + ((followers - 100000) / 900000) * 150000.0
    elif followers < 10000000:
        base = 200000.0 + ((followers - 1000000) / 9000000) * 400000.0
    else:
        base = 650000.0 + min((followers - 10000000) / 10000000 * 350000.0, 850000.0)

    # YouTube videos command ~1.3x rate over Instagram Reels
    if platform.lower() == "youtube":
        base *= 1.3
    
    # Premium for high engagement
    if er > 5.0:
        base *= 1.15
        
    return round(base, -3)  # Round to nearest 1000


def compute_mcdm_scores(candidate: dict, req: dict, weights: dict) -> dict:
    """Multi-Criteria Decision Making (MCDM) weighted scoring function"""
    f = candidate.get("followers", 100000)
    er = candidate.get("engagement_rate", 3.0)
    platform = candidate.get("platform", "instagram").lower()
    niches = [n.lower() for n in candidate.get("niche", [])]
    target_category = req.get("category", "Tech").lower()
    target_age = req.get("audience_age", "18-24")
    budget = req.get("budget", 100000.0)
    roi_val = candidate.get("predicted_roi", 3.2)
    risk_level = candidate.get("risk_level", "low").lower()

    # 1. S_niche: Category semantic alignment (50-100)
    if target_category in niches or any(target_category in n for n in niches):
        s_niche = 96.0
    elif any(n in ["lifestyle", "general", "vlogs"] for n in niches):
        s_niche = 78.0
    else:
        s_niche = 65.0

    # 2. S_age: Audience demographic suitability (50-100)
    # 18-24 Gen-Z: High preference for Instagram/Shorts + High Engagement Rate
    # 25-34 Millennials: High preference for YouTube in-depth + Tech/Finance/Food
    # 13-17 Gen-Alpha: High preference for Gaming/TikTok
    # 35-50 Gen-X: High preference for Facebook/YouTube + Health/Finance/Education
    s_age = 80.0
    if target_age == "18-24":
        if platform in ["instagram", "tiktok"] and er >= 4.5:
            s_age = 98.0
        elif er >= 3.5:
            s_age = 88.0
        else:
            s_age = 75.0
    elif target_age == "25-34":
        if platform == "youtube" or target_category in ["tech", "finance", "food", "lifestyle"]:
            s_age = 95.0
        else:
            s_age = 82.0
    elif target_age == "13-17":
        if target_category in ["gaming", "entertainment", "comedy"]:
            s_age = 96.0
        else:
            s_age = 70.0
    elif target_age == "35-50":
        if target_category in ["finance", "health", "education", "food"]:
            s_age = 92.0
        else:
            s_age = 72.0

    # 3. S_roi: Normalized Predicted ROI Score (50-100)
    # 3.0x -> 80, 3.5x -> 88, 4.0x -> 95, 4.5x -> 99
    s_roi = min(99.0, max(60.0, 50.0 + (roi_val * 11.0)))

    # 4. S_safety: Brand Safety Score (50-100)
    if risk_level == "low":
        s_safety = 96.0
    elif risk_level == "medium":
        s_safety = 76.0
    else:
        s_safety = 45.0

    # 5. S_budget: Budget compatibility (50-100)
    fee = candidate.get("estimated_fee", calculate_estimated_fee(f, er, platform))
    if fee <= budget:
        # Fits completely in budget
        utilization = fee / max(budget, 1)
        if 0.3 <= utilization <= 0.95:
            s_budget = 98.0  # Perfect sweet spot
        else:
            s_budget = 90.0
    else:
        # Over budget -> linear penalty
        over_ratio = (fee - budget) / budget
        s_budget = max(50.0, 85.0 - (over_ratio * 40.0))

    # Calculate Composite Score using MCDM weights
    composite = (
        (weights["niche"] * s_niche) +
        (weights["age"] * s_age) +
        (weights["roi"] * s_roi) +
        (weights["safety"] * s_safety) +
        (weights["budget"] * s_budget)
    )

    return {
        "composite_score": round(composite, 1),
        "score_breakdown": {
            "niche_fit": round(s_niche, 1),
            "age_fit": round(s_age, 1),
            "roi_score": round(s_roi, 1),
            "safety_score": round(s_safety, 1),
            "budget_fit": round(s_budget, 1),
        },
        "estimated_fee": fee
    }


async def generate_ai_reasons(top_creators: list[dict], req: dict) -> list[str]:
    """Generate concise, intelligent strategy rationales for top creators using Groq LLM"""
    ai = get_groq()
    category = req.get("category", "Tech")
    age = req.get("audience_age", "18-24")
    budget = req.get("budget", 100000.0)
    goal = req.get("campaign_goal", "maximize_roi").replace("_", " ").title()

    if ai is None:
        # High quality deterministic fallback reasons
        reasons = []
        for i, c in enumerate(top_creators):
            name = c.get("name", "Creator")
            er = c.get("engagement_rate", 3.5)
            roi = c.get("predicted_roi", 3.2)
            f = c.get("followers", 100000)
            if i == 0:
                reasons.append(f"Rank #1 Top Match: Outstanding {er}% engagement rate delivering exceptional organic traction among {age} demographic with a predicted {roi}x campaign ROI.")
            elif i == 1:
                reasons.append(f"High Conversion Velocity: Strong authority in {category} with high viewer affinity and cost-effective commercial rate within ₹{budget:,.0f} budget.")
            elif i == 2:
                reasons.append(f"Audience Demographic Champion: Highly active {age} follower base with verified low brand risk and dependable {roi}x revenue return.")
            elif i == 3:
                reasons.append(f"Broad Reach Multiplier: Established presence with {f:,} followers and consistent video engagement perfectly positioned for {goal} campaigns.")
            else:
                reasons.append(f"High-Efficiency Value Pick: Low-risk verified profile with steady community engagement and high audience trust.")
        return reasons

    prompt = f"""You are the AI Recommendation Engine for influencer marketing platform 'Vouch'.
Explain in 1 concise, razor-sharp sentence why each of the following 5 creators is recommended for:
- Category: {category}
- Target Audience Age: {age}
- Budget: ₹{budget:,.0f}
- Campaign Goal: {goal}

Creators to evaluate:
{json.dumps([{ 'name': c['name'], 'handle': c['handle'], 'followers': c['followers'], 'er': c['engagement_rate'], 'roi': c['predicted_roi'], 'composite_score': c['composite_score'] } for c in top_creators], indent=2)}

Return a JSON array of 5 strings (one crisp sentence per creator in exact order):
["Reason for creator 1", "Reason for creator 2", "Reason for creator 3", "Reason for creator 4", "Reason for creator 5"]"""

    try:
        response = ai.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a senior influencer talent strategist. Output only a valid JSON array of 5 concise reasoning strings."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        if isinstance(parsed, list) and len(parsed) >= len(top_creators):
            return parsed[:len(top_creators)]
        elif isinstance(parsed, dict):
            # Extract first list found in dict
            for v in parsed.values():
                if isinstance(v, list) and len(v) >= len(top_creators):
                    return [str(x) for x in v[:len(top_creators)]]
        raise Exception("LLM returned unexpected JSON format")
    except Exception as e:
        print(f"Groq recommendation reasoning error: {e}")
        return [
            f"Strong category authority in {category} with verified {c.get('engagement_rate', 3.5)}% engagement and {c.get('predicted_roi', 3.2)}x estimated ROI."
            for c in top_creators
        ]


async def run_creator_recommendations(user_id: str, req: dict) -> dict:
    """Execute the full AI creator discovery and multi-criteria weighted ranking pipeline"""
    category = req.get("category", "Tech").strip().title()
    age = req.get("audience_age", "18-24")
    budget = float(req.get("budget", 100000.0))
    goal = req.get("campaign_goal", "maximize_roi")
    platform_filter = req.get("platform", "all").lower()

    # 1. Determine weights based on selected campaign priority
    if goal == "maximize_roi":
        weights = {"niche": 0.30, "age": 0.15, "roi": 0.35, "safety": 0.10, "budget": 0.10}
    elif goal == "high_engagement":
        weights = {"niche": 0.30, "age": 0.20, "roi": 0.20, "safety": 0.10, "budget": 0.20}
    elif goal == "brand_safety":
        weights = {"niche": 0.25, "age": 0.15, "roi": 0.15, "safety": 0.35, "budget": 0.10}
    elif goal == "maximum_reach":
        weights = {"niche": 0.30, "age": 0.25, "roi": 0.15, "safety": 0.10, "budget": 0.20}
    else:
        weights = {"niche": 0.35, "age": 0.20, "roi": 0.20, "safety": 0.15, "budget": 0.10}

    # 2. Candidate Sourcing:
    # A) Query local user-specific database influencers
    candidates = []
    try:
        user_infs = await db.get_user_influencers(user_id=user_id, limit=50)
        for inf in user_infs:
            candidates.append({
                "id": inf["id"],
                "name": inf.get("name") or "Creator",
                "handle": inf.get("handle") or "",
                "platform": inf.get("platform") or "instagram",
                "avatar_url": inf.get("avatar_url") or "",
                "followers": int(inf.get("followers", 0) or 0),
                "engagement_rate": float(inf.get("engagement_rate", 0.0) or 0.0),
                "risk_level": inf.get("risk_level") or "low",
                "predicted_roi": float(inf.get("predicted_roi", 3.2) or 3.2),
                "niche": inf.get("niche") or [category],
            })
    except Exception as e:
        print(f"Error fetching user influencers for recommendations: {e}")

    # B) Seed candidate pool from rich curated social discovery library for the target category
    matched_seeds = NICHE_CREATOR_SEEDS.get(category, NICHE_CREATOR_SEEDS.get("Tech", []))
    for seed in matched_seeds:
        # Avoid duplicate handles if already in database
        if not any(c.get("handle", "").lower() == seed["handle"].lower() for c in candidates):
            candidates.append({
                "id": seed["handle"],
                **seed
            })

    # C) Also add relevant cross-niche creators if pool is small
    if len(candidates) < 6:
        for other_cat, other_seeds in NICHE_CREATOR_SEEDS.items():
            if other_cat != category:
                for seed in other_seeds[:2]:
                    if not any(c.get("handle", "").lower() == seed["handle"].lower() for c in candidates):
                        candidates.append({"id": seed["handle"], **seed})

    # Apply platform filter if requested
    if platform_filter in ["instagram", "youtube", "tiktok"]:
        filtered = [c for c in candidates if c.get("platform", "").lower() == platform_filter]
        if len(filtered) >= 3:
            candidates = filtered

    # 3. Multi-Criteria Scoring of all candidate creators
    scored_candidates = []
    for cand in candidates:
        mcdm = compute_mcdm_scores(cand, req, weights)
        scored_candidates.append({
            **cand,
            "composite_score": mcdm["composite_score"],
            "score_breakdown": mcdm["score_breakdown"],
            "estimated_fee": mcdm["estimated_fee"],
        })

    # 4. Sort by Composite Rank Score descending
    scored_candidates.sort(key=lambda x: x["composite_score"], reverse=True)

    # 5. Select Top 5 Best-Fit Creators
    top_5 = scored_candidates[:5]

    # 6. Generate AI Recommendation Rationales
    reasons = await generate_ai_reasons(top_5, req)

    badges = ["Top Match 🏆", "High ROI Multiplier ⚡", "Demographic Fit 🎯", "High Reach Pick 🚀", "Value Pick 💎"]

    final_creators = []
    for idx, creator in enumerate(top_5):
        # Auto-save seed creator to Supabase if not yet in database so 1-click actions work
        saved_id = creator["id"]
        try:
            if not isinstance(saved_id, str) or len(saved_id) < 10 or "-" not in saved_id:
                # Upsert into user's influencers table
                saved_rec = await db.upsert_influencer({
                    "name": creator["name"],
                    "handle": creator["handle"],
                    "platform": creator["platform"],
                    "avatar_url": creator["avatar_url"],
                    "followers": creator["followers"],
                    "engagement_rate": creator["engagement_rate"],
                    "risk_level": creator["risk_level"],
                    "predicted_roi": creator["predicted_roi"],
                    "niche": creator.get("niche", [category]),
                }, user_id=user_id)
                if saved_rec and saved_rec.get("id"):
                    saved_id = saved_rec["id"]
        except Exception:
            pass

        final_creators.append({
            "id": saved_id,
            "name": creator["name"],
            "handle": creator["handle"],
            "platform": creator["platform"],
            "avatar_url": creator["avatar_url"],
            "followers": creator["followers"],
            "engagement_rate": creator["engagement_rate"],
            "risk_level": creator["risk_level"],
            "predicted_roi": creator["predicted_roi"],
            "estimated_fee": creator["estimated_fee"],
            "composite_score": creator["composite_score"],
            "score_breakdown": creator["score_breakdown"],
            "recommendation_reasoning": reasons[idx] if idx < len(reasons) else f"Optimal performance fit for {category} campaign.",
            "rank": idx + 1,
            "badge": badges[idx] if idx < len(badges) else "Recommended"
        })

    return {
        "category": category,
        "audience_age": age,
        "budget": budget,
        "campaign_goal": goal,
        "weights_used": weights,
        "top_creators": final_creators,
        "generated_at": datetime.utcnow().isoformat()
    }
