"""
Groq AI service — handles all AI/ML tasks using Groq's ultra-fast LLM API:
- Sentiment analysis on real comments
- Fake engagement detection
- Brand-influencer match scoring
- Risk assessment
- AI Brief generation
- ROI prediction
- Report generation
"""
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client: Groq | None = None
MODEL = "llama-3.3-70b-versatile"


def get_groq() -> Groq:
    global client
    if client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY must be set")
        client = Groq(api_key=api_key)
    return client


# ======== Sentiment Analysis ========

async def analyze_sentiment(comments: list[str], influencer_name: str = "") -> dict:
    """Analyze sentiment of real comments using Groq"""
    ai = get_groq()

    comments_text = "\n".join([f"- {c}" for c in comments[:100]])

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are an expert social media sentiment analyst for brand safety.
Analyze the provided comments and return a JSON object with:
{
  "positive": <percentage 0-100>,
  "negative": <percentage 0-100>,
  "neutral": <percentage 0-100>,
  "themes": [
    {"label": "<theme>", "count": <number>, "sentiment": "positive|negative|neutral"},
    ...
  ],
  "raw_comments_analyzed": <number>,
  "red_flags": ["<any concerning content>", ...],
  "brand_safety_score": <0-100>
}
Be accurate and honest. Identify bot-like patterns (repetitive, generic comments).
Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"Analyze these comments from {influencer_name}'s posts:\n\n{comments_text}"
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== Fake Engagement Detection ========

async def detect_fake_engagement(engagement_data: list[dict], profile: dict) -> dict:
    """Use AI to detect engagement anomalies and bot activity"""
    ai = get_groq()

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are a social media fraud detection expert.
Analyze the engagement data and profile to detect fake engagement patterns.
Return JSON:
{
  "bot_percentage": <estimated 0-100>,
  "fake_engagement_detected": true|false,
  "spike_dates": ["<dates with suspicious spikes>"],
  "patterns": ["<description of suspicious patterns>"],
  "overall_risk": "low|medium|high",
  "confidence": <0-100>,
  "explanation": "<brief explanation>"
}
Look for:
- Sudden follower spikes followed by drops
- Comment-to-like ratio anomalies
- Engagement rate inconsistencies
- Bot-like patterns
Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"""Profile: {json.dumps(profile)}
Engagement Timeline: {json.dumps(engagement_data[-30:])}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== Match Score ========

async def calculate_match_score(influencer: dict, brand_info: dict = {}) -> dict:
    """AI-powered brand-influencer match scoring"""
    ai = get_groq()

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are a brand partnership strategist.
Score how well this influencer matches for brand collaborations.
Return JSON:
{
  "match_score": <0-100>,
  "strengths": ["<strength1>", ...],
  "weaknesses": ["<weakness1>", ...],
  "ideal_brands": ["<brand type1>", ...],
  "audience_quality": <0-100>,
  "content_quality": <0-100>,
  "authenticity": <0-100>,
  "recommendation": "hire|consider|avoid",
  "reasoning": "<brief explanation>"
}
Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"""Influencer data:
{json.dumps(influencer)}

Brand info: {json.dumps(brand_info) if brand_info else "General brand assessment"}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== Risk Assessment ========

async def assess_risk(influencer: dict, comments_sample: list[str] = []) -> dict:
    """Comprehensive AI risk assessment using ONLY real, verifiable data points"""
    ai = get_groq()

    # Extract only the real, verifiable metrics for analysis
    followers = influencer.get("followers", 0)
    following = influencer.get("following", 0)
    posts = influencer.get("posts", 0)
    engagement_rate = influencer.get("engagement_rate", 0)
    avg_likes = influencer.get("avg_likes", 0)
    avg_comments = influencer.get("avg_comments", 0)
    verified = influencer.get("verified", False)
    bio = influencer.get("bio", "")
    niche = influencer.get("niche", [])
    platform = influencer.get("platform", "unknown")
    name = influencer.get("name", "Unknown")

    # Calculate verifiable ratios
    follow_ratio = round(following / followers, 3) if followers > 0 else 0
    likes_to_followers = round((avg_likes / followers) * 100, 2) if followers > 0 else 0
    comments_to_likes = round((avg_comments / avg_likes) * 100, 2) if avg_likes > 0 else 0
    posts_per_follower = round(posts / followers * 1000, 2) if followers > 0 else 0

    real_metrics = {
        "name": name,
        "platform": platform,
        "followers": followers,
        "following": following,
        "posts": posts,
        "engagement_rate": engagement_rate,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "verified": verified,
        "bio": bio,
        "niche": niche,
        "calculated_ratios": {
            "following_to_followers_ratio": follow_ratio,
            "likes_to_followers_pct": likes_to_followers,
            "comments_to_likes_pct": comments_to_likes,
        }
    }

    has_comments = len(comments_sample) > 0

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are a brand safety and influencer risk assessment expert.

IMPORTANT RULES:
1. You are given ONLY real, verified profile metrics from social media APIs. Analyze ONLY what you can see.
2. You do NOT have historical engagement timeline data. Do NOT flag "engagement spikes" or "sudden follower jumps" — you have no timeline to prove that.
3. Every flag MUST be based on a REAL data point you can reference (e.g. "following/follower ratio is 0.95 which is suspiciously high", "engagement rate of 657% is abnormally high for this follower count").
4. Each flag must include a "source" field indicating whether it's based on verifiable metrics or AI inference:
   - "verified_metric" = based on hard numbers you can point to (ratios, engagement rate, follower counts)
   - "ai_inference" = based on AI analysis of comments/bio content (educated guess, not a hard number)
5. Do NOT make up risks that aren't supported by the data. If the metrics look normal, say so.
6. Be honest — if you can't determine something from the data, don't flag it.

Return JSON:
{
  "overall_risk": "low|medium|high",
  "bot_percentage": <estimated 0-100, based ONLY on engagement rate vs follower count analysis>,
  "flags": [
    {
      "type": "<flag type: audience_authenticity|engagement_quality|content_safety|follower_ratio|bot_activity|low_engagement>",
      "severity": "low|medium|high|critical",
      "description": "<specific description referencing ACTUAL numbers from the data>",
      "detected_at": "<current date>",
      "source": "verified_metric|ai_inference",
      "evidence": "<the specific metric or data point this is based on>"
    }
  ],
  "brand_safety_score": <0-100>,
  "recommendations": ["<recommendation1>", ...]
}

VERIFIED METRIC examples (flag these):
- Following/follower ratio > 0.8 for large accounts → suspicious
- Engagement rate abnormally high (>20% for accounts with >10K followers) or abnormally low (<0.5%) → flag it
- Very low avg likes/comments relative to follower count → possible fake followers
- 0 posts but many followers → suspicious

AI INFERENCE examples (flag these only if comments are provided):
- Bot-like comment patterns (generic, repetitive)
- Inappropriate content in bio or captions
- Content inconsistency with claimed niche

Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"""Analyze this influencer using ONLY verified metrics:

VERIFIED PROFILE DATA:
{json.dumps(real_metrics, indent=2)}

REAL COMMENTS ({"available" if has_comments else "NOT available — skip comment analysis"}):
{json.dumps(comments_sample[:20]) if has_comments else "[]"}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== AI Brief Generation ========

async def generate_brief(
    influencer: dict,
    brand_name: str,
    campaign_objective: str,
    brand_niche: str = "",
    budget: float | None = None,
) -> str:
    """Generate a comprehensive marketing brief using AI"""
    ai = get_groq()

    try:
        response = ai.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """You are a world-class influencer marketing strategist.
Generate a comprehensive, professional marketing brief in Markdown format.

RULES - follow exactly:
- Spell all words correctly: "Campaign" (not Compaign), "promote", "Platform" (full word), "showcasing", "style", "tag", "code", "Number", "Offer", "suggest", "influencer's".
- Use the brand name EXACTLY as the user provided it (e.g. if they wrote H&M use H&M, not Hill, Hatt, HEI, or HBM).
- Use Indian Rupees for all monetary amounts: write "₹" followed by the number (e.g. ₹50,000) or "INR" (e.g. 50,000 INR). Do not use dollars ($) or any other currency.
- Engagement rate must be a reasonable percentage (e.g. 6.5% not 657%). Use the influencer's actual engagement_rate from the data.
- Write complete words and sentences; no truncation (e.g. "Platform" not "Platf"). Use correct punctuation and "the" where needed (e.g. "with the following", "on Instagram").
- Use standard Markdown: ## for main headings, ### for subheadings, **bold** for labels, - or * for list items. Do not use four asterisks for titles.

Include these sections:
1. Campaign Overview (brand, influencer, platform, reach with correct follower count and engagement %)
2. Campaign Objective
3. Content Strategy (3 specific posts with format, hook, CTA each)
4. Brand Safety Notes (based on influencer risk data)
5. Budget & ROI predictions
6. Timeline (week-by-week)
7. KPIs & Success Metrics
8. Match Score assessment
Make it actionable and data-driven. Use real numbers from the influencer data provided."""
                },
                {
                    "role": "user",
                    "content": f"""Create a marketing brief:

    Influencer: {json.dumps(influencer)}
    Brand: {brand_name}
    Brand Niche: {brand_niche or "General"}
    Campaign Objective: {campaign_objective}
    Budget: {f"₹{budget} (INR)" if budget is not None else "Not specified"}"""
                }
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        if "rate_limit_exceeded" in str(e).lower():
            return "ERROR: AI Rate Limit reached. Please try again in a few minutes or upgrade your plan."
        return f"ERROR: Failed to generate brief. {str(e)}"


# ======== ROI Prediction ========

async def predict_roi(influencer: dict, campaign_budget: float = 0) -> dict:
    """AI-powered ROI prediction"""
    ai = get_groq()

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are a data-driven marketing ROI analyst.
Predict the ROI for a campaign with this influencer.
Return JSON:
{
  "predicted_roi": <multiplier e.g. 3.2>,
  "estimated_reach": <number>,
  "estimated_impressions": <number>,
  "estimated_engagement": <number>,
  "cost_per_engagement": <dollar amount>,
  "cost_per_follower_reached": <dollar amount>,
  "single_post_value": <dollar amount>,
  "campaign_value": <dollar amount>,
  "confidence": <0-100>,
  "factors": ["<factor1>", ...]
}
Base predictions on real engagement rates and follower counts.
Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"""Influencer data: {json.dumps(influencer)}
Campaign budget: ${campaign_budget if campaign_budget > 0 else "TBD based on market rates"}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== Report Generation ========

async def generate_report(influencer: dict, report_type: str = "full_analysis") -> dict:
    """Generate a comprehensive influencer analysis report"""
    ai = get_groq()

    report_types = {
        "full_analysis": "Complete influencer analysis including engagement, audience quality, content review, and brand safety",
        "brand_safety": "Focused brand safety audit with risk assessment and red flags",
        "comparison": "Competitive benchmarking and comparison analysis",
        "risk_assessment": "Deep-dive risk assessment with mitigation recommendations",
    }

    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert influencer marketing analyst. Generate a detailed {report_types.get(report_type, report_types['full_analysis'])} report.
Return JSON:
{{
  "title": "<report title>",
  "summary": "<executive summary paragraph>",
  "sections": [
    {{
      "heading": "<section heading>",
      "content": "<detailed markdown content for the section>"
    }},
    ...
  ],
  "score": <overall score 0-100>,
  "recommendation": "HIRE|CONSIDER|AVOID",
  "key_insights": ["<insight1>", "<insight2>", ...],
  "pages": <estimated page count if printed>
}}
Be thorough and data-driven. Use real numbers from the data provided.
Return ONLY valid JSON, no extra text."""
            },
            {
                "role": "user",
                "content": f"""Generate a {report_type.replace('_', ' ')} report for:
{json.dumps(influencer)}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
        max_tokens=4000,
    )

    return json.loads(response.choices[0].message.content or "{}")


# ======== Market Rate Estimation (Feature 4) ========

async def estimate_market_rates(influencer: dict) -> dict:
    """Calculate fair market rates based on Indian influencer marketing benchmarks (INR)"""
    followers = influencer.get("followers", 0)
    er = influencer.get("engagement_rate", 0)
    platform = influencer.get("platform", "instagram")
    niches = influencer.get("niche", [])
    
    # Base rates per 1K followers (INR) — Realistic Indian market benchmarks
    # Instagram: ~₹150/1K followers for a standard post (1M followers = ~₹1.5 Lakhs)
    # YouTube: ~₹250/1K subscribers for a dedicated video (1M subs = ~₹2.5 Lakhs)
    base_rate = 150.0 if platform == "instagram" else 250.0
    
    # 1. Niche Multiplier (Different industries pay differently)
    niche_multiplier = 1.0
    # High Premium (B2B, Tech, Crypto, Finance)
    if any(n.lower() in ["tech", "business", "finance", "crypto", "education"] for n in niches):
        niche_multiplier = 1.5
    # Medium Premium (Gaming, Beauty, Fitness, Travel)
    elif any(n.lower() in ["gaming", "beauty", "fitness", "travel"] for n in niches):
        niche_multiplier = 1.2
    # Standard / Broad (Entertainment, Comedy, Lifestyle)
    elif any(n.lower() in ["entertainment", "comedy", "lifestyle", "music"] for n in niches):
        niche_multiplier = 0.8
    
    # 2. Engagement multiplier (higher ER = higher value)
    er_multiplier = 1.0 + (er / 5.0)  # Bonus: +20% for every 5% ER
    
    # Core calculation
    fair_price = (followers / 1000) * base_rate * er_multiplier * niche_multiplier
    
    # Add variance for range
    low_end = fair_price * 0.85
    high_end = fair_price * 1.25
    
    return {
        "suggested_price": round(fair_price, 0),
        "range_low": round(low_end, 0),
        "range_high": round(high_end, 0),
        "cpm": round((fair_price / followers) * 1000, 2) if followers > 0 else 0,
        "platform_benchmark": platform,
        "confidence": "high" if er > 0 else "medium",
        "currency": "INR",
    }


# ======== AI Outreach Hook (Feature 5) ========

async def generate_outreach_hook(influencer: dict, brand_name: str = "Our Brand") -> dict:
    """Generate a personalized outreach hook using AI"""
    ai = get_groq()
    
    recent_posts = influencer.get("recent_posts", [])
    post_context = ""
    if recent_posts:
        # Get caption from first post if it's a dict, or first element if it's a string
        first_post = recent_posts[0]
        if isinstance(first_post, dict):
            post_context = f"Recent post: {first_post.get('caption', 'Visual content')}"
        else:
            post_context = f"Recent post content: {str(first_post)}"
    
    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are an expert talent scout. Generate 3 personalized, high-conversion outreach subject lines and 1 short message hook.
Keep it professional, non-spammy, and reference their specific niche/style.
Return JSON:
{
  "subject_lines": ["<subject1>", "<subject2>", "<subject3>"],
  "message_hook": "<1-2 sentence opening hook>",
  "personalization_point": "<what specific detail was used to personalize this>"
}"""
            },
            {
                "role": "user",
                "content": f"""Influencer: {influencer.get('name')} (@{influencer.get('handle')})
Niche: {', '.join(influencer.get('niche', [])) if isinstance(influencer.get('niche'), list) else influencer.get('niche', 'General')}
Context: {post_context}
Brand: {brand_name}"""
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    
    return json.loads(response.choices[0].message.content or "{}")


# ======== Red Flag Content Audit (Feature 6) ========

async def audit_content_safety(captions: list[str]) -> dict:
    """Perform a deep scan of captions for brand safety red flags"""
    if not captions:
        return {"risk_level": "low", "flags": [], "summary": "No content available for audit.", "risk_score": 0, "safe_for_brands": True}
        
    ai = get_groq()
    text_to_scan = "\n---\n".join([str(c) for c in captions[:30]])
    
    response = ai.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are a brand safety auditor. Scan the provided social media captions for red flags:
1. Profanity/Vulgarity
2. Political controversy
3. Hate speech/Discrimination
4. Competitor brand mentions
5. Negative sentiment towards brands

Return JSON:
{
  "risk_score": <0-100>,
  "risk_level": "low|medium|high",
  "detected_flags": [
     {"category": "<category>", "details": "<details>", "severity": "low|medium|high"}
  ],
  "summary": "<brief audit summary>",
  "safe_for_brands": true|false
}"""
            },
            {
                "role": "user",
                "content": f"Scan these captions:\n\n{text_to_scan}"
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    
    return json.loads(response.choices[0].message.content or "{}")
