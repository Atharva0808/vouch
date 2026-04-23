"""
Social Media data fetching — pulls REAL data from social media platforms
Uses RapidAPI endpoints for Instagram and YouTube

Set RAPIDAPI_KEY in your .env to enable real data fetching.
"""
import os
import httpx
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random
import asyncio

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
print(f"DEBUG: Social Service loaded with RapidAPI Key: {RAPIDAPI_KEY[:4]}...{RAPIDAPI_KEY[-4:] if len(RAPIDAPI_KEY) > 8 else ''}")


HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": "",
}

# Hostnames for the APIs
INSTAGRAM_HOST = "instagram120.p.rapidapi.com"
YOUTUBE_HOST = "youtube138.p.rapidapi.com"


# ======== Instagram (via instagram120) ========

async def fetch_instagram_profile(handle: str) -> dict:
    """Fetch real Instagram profile data via instagram120 (Provider: 9527)"""
    headers = {
        **HEADERS, 
        "x-rapidapi-host": INSTAGRAM_HOST,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        clean_handle = handle.replace("@", "").replace(" ", "").lower().strip()
        
        # 1 & 2. Fetch Profile and Posts concurrently
        profile_resp, posts_resp = await asyncio.gather(
            client.post(
                f"https://{INSTAGRAM_HOST}/api/instagram/profile",
                json={"username": clean_handle},
                headers=headers,
            ),
            client.post(
                f"https://{INSTAGRAM_HOST}/api/instagram/posts",
                json={"username": clean_handle},
                headers=headers,
            )
        )
        
        if profile_resp.status_code != 200:
            error_msg = f"Instagram Profile API error: {profile_resp.status_code}"
            try:
                error_data = profile_resp.json()
                error_msg += f" - {error_data.get('message', error_data)}"
            except:
                error_msg += f" - {profile_resp.text[:100]}"
            raise Exception(error_msg)
        
        p_data = profile_resp.json().get("result", {})
        
        if not p_data:
            raise Exception(f"No profile data found for @{clean_handle}")
        
        avg_likes = 0
        avg_comments = 0
        recent_posts = []
        
        if posts_resp.status_code == 200:
            posts_data = posts_resp.json().get("result", {}).get("edges", [])
            if posts_data:
                total_likes = 0
                total_comments = 0
                total_posts = 0
                
                for edge in posts_data[:12]:  # last 12 posts
                    node = edge.get("node", {})
                    
                    # The API returns like_count and comment_count as direct keys
                    # NOT under edge_media_preview_like
                    likes = (
                        node.get("like_count")
                        or node.get("edge_media_preview_like", {}).get("count", 0)
                        or 0
                    )
                    comments = (
                        node.get("comment_count")
                        or node.get("edge_media_to_comment", {}).get("count", 0)
                        or 0
                    )
                    
                    # Caption can be a dict with 'text' key, a string, or nested in edges
                    raw_caption = node.get("caption")
                    if isinstance(raw_caption, dict):
                        caption_text = raw_caption.get("text", "")
                    elif isinstance(raw_caption, str):
                        caption_text = raw_caption
                    else:
                        # Fallback: try edge format
                        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
                        caption_text = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""
                    
                    total_likes += likes
                    total_comments += comments
                    total_posts += 1
                    
                    recent_posts.append({
                        "id": node.get("id") or node.get("pk"),
                        "thumbnail": node.get("display_url") or node.get("thumbnail_url"),
                        "likes": likes,
                        "comments": comments,
                        "caption": caption_text,
                        "posted_at": node.get("taken_at_timestamp") or node.get("taken_at")
                    })
                
                if total_posts > 0:
                    avg_likes = total_likes // total_posts
                    avg_comments = total_comments // total_posts

        # Parse profile fields
        followers = p_data.get("edge_followed_by", {}).get("count", 0) or p_data.get("follower_count", 0)
        posts_count = p_data.get("edge_owner_to_timeline_media", {}).get("count", 0) or p_data.get("media_count", 0)
        full_name = p_data.get("full_name", handle)
        bio = p_data.get("biography", "")
        
        # Calculate real engagement rate
        er = 0.0
        if followers > 0 and avg_likes > 0:
            er = round(((avg_likes + avg_comments) / followers) * 100, 2)
        
        # Collect captions for niche detection
        caption_texts = [p.get("caption", "") for p in recent_posts if p.get("caption")]
        
        res = {
            "name": full_name,
            "handle": f"@{clean_handle}",
            "platform": "instagram",
            "avatar_url": p_data.get("profile_pic_url_hd", p_data.get("profile_pic_url", "")),
            "followers": followers,
            "following": p_data.get("edge_follow", {}).get("count", 0) or p_data.get("following_count", 0),
            "posts": posts_count,
            "engagement_rate": er,
            "avg_likes": avg_likes,
            "avg_comments": avg_comments,
            "verified": p_data.get("is_verified", False),
            "bio": bio,
            "location": "",
            "niche": _detect_niche_from_bio(bio, full_name, caption_texts),
            "recent_posts": recent_posts,
        }

        return res


async def fetch_instagram_comments(handle: str, profile: dict = None) -> list[str]:
    """Fetch real post captions for sentiment analysis"""
    # Optimization: If we already have the profile with recent_posts, use them
    if profile and profile.get("recent_posts"):
        return [p.get("caption", "") for p in profile.get("recent_posts", []) if isinstance(p, dict) and p.get("caption")]

    headers = {
        **HEADERS,
        "x-rapidapi-host": INSTAGRAM_HOST,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            clean_handle = handle.replace("@", "").replace(" ", "").lower().strip()
            resp = await client.post(
                f"https://{INSTAGRAM_HOST}/api/instagram/posts",
                json={"username": clean_handle},
                headers=headers,
            )
            
            if resp.status_code != 200:
                return []
            
            posts_data = resp.json().get("result", {}).get("edges", [])
            captions = []
            
            for edge in posts_data[:12]:
                node = edge.get("node", {})
                
                # Handle multiple caption formats
                raw_caption = node.get("caption")
                if isinstance(raw_caption, dict):
                    text = raw_caption.get("text", "")
                elif isinstance(raw_caption, str):
                    text = raw_caption
                else:
                    caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
                    text = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""
                
                if text:
                    captions.append(text)
            
            return captions
    except Exception:
        return []


# ======== YouTube (via youtube138) ========

async def fetch_youtube_channel(handle: str) -> dict:
    """Fetch real YouTube channel data via youtube138 (Provider: Glavier)"""
    headers = {**HEADERS, "x-rapidapi-host": YOUTUBE_HOST}
    
    async with httpx.AsyncClient(timeout=30) as client:
        clean_handle = handle.replace("@", "").strip()
        
        # Step 1: Search for the channel
        search_resp = await client.get(
            f"https://{YOUTUBE_HOST}/search/",
            params={"q": clean_handle, "hl": "en", "gl": "US"},
            headers=headers,
        )
        
        if search_resp.status_code != 200:
            raise Exception(f"YouTube Search error: {search_resp.status_code}")
        
        search_data = search_resp.json()
        # youtube138 returns results in "contents" array, not "data"
        items = search_data.get("contents", search_data.get("data", []))
        
        channel_id = None
        channel_search_data = {}
        
        # Find first channel-type result
        for item in items:
            if item.get("type") == "channel":
                chan = item.get("channel", item)
                channel_id = chan.get("channelId")
                channel_search_data = chan
                break
        
        # Fallback: extract channelId from a video result
        if not channel_id:
            for item in items:
                if item.get("type") == "video":
                    vid = item.get("video", item)
                    channel_id = vid.get("channelId") or vid.get("author", {}).get("channelId", "")
                    if channel_id:
                        break
        
        if not channel_id:
            # Last resort: try using the handle as the ID
            channel_id = clean_handle

        # Step 2: Get full channel details
        resp = await client.get(
            f"https://{YOUTUBE_HOST}/channel/details/",
            params={"id": channel_id},
            headers=headers,
        )
        
        if resp.status_code != 200:
            raise Exception(f"YouTube Details error: {resp.status_code}. Channel ID: {channel_id}")
        
        data = resp.json()
        
        # Parse stats (subscribers, videos, views are inside "stats" object)
        stats = data.get("stats", {})
        subscriber_count = stats.get("subscribers", 0) or 0
        video_count = stats.get("videos", 0) or 0
        view_count = stats.get("views", 0) or 0
        
        # Parse avatar — it's an array of {height, url, width}
        avatar_url = ""
        avatar_data = data.get("avatar")
        if isinstance(avatar_data, list) and avatar_data:
            # Get the highest resolution
            avatar_url = avatar_data[-1].get("url", avatar_data[0].get("url", ""))
        elif isinstance(avatar_data, dict):
            avatar_url = avatar_data.get("url", "")
        elif isinstance(avatar_data, str):
            avatar_url = avatar_data
        
        description = data.get("description", "")
        title = data.get("title", handle)

        # Step 3: Fetch recent videos to get REAL avg likes/comments
        avg_likes = 0
        avg_comments = 0
        recent_posts = []
        
        try:
            videos_resp = await client.get(
                f"https://{YOUTUBE_HOST}/channel/videos/",
                params={"id": channel_id, "filter": "videos_latest", "hl": "en", "gl": "US"},
                headers=headers,
            )
            
            if videos_resp.status_code == 200:
                videos_data = videos_resp.json()
                video_items = videos_data.get("contents", videos_data.get("data", []))
                
                # Collect video IDs from recent videos
                video_ids = []
                for v_item in video_items[:10]:
                    vid = v_item.get("video", v_item)
                    vid_id = vid.get("videoId") or vid.get("id", "")
                    if vid_id:
                        video_ids.append(vid_id)
                        # Also collect basic info for recent_posts
                        recent_posts.append({
                            "id": vid_id,
                            "thumbnail": "",
                            "likes": 0,
                            "comments": 0,
                            "caption": vid.get("title", ""),
                            "views": vid.get("stats", {}).get("views", 0) if isinstance(vid.get("stats"), dict) else 0,
                        })
                
                # Step 4: Get real like/comment stats from video details concurrently
                total_likes = 0
                total_comments = 0
                videos_with_data = 0
                
                async def fetch_vid(vid_id):
                    try:
                        resp = await client.get(
                            f"https://{YOUTUBE_HOST}/video/details/",
                            params={"id": vid_id, "hl": "en", "gl": "US"},
                            headers=headers,
                        )
                        return vid_id, resp
                    except Exception:
                        return vid_id, None
                
                vid_results = await asyncio.gather(*[fetch_vid(v_id) for v_id in video_ids[:5]])
                
                for vid_id, vid_resp in vid_results:
                    if vid_resp and vid_resp.status_code == 200:
                        try:
                            vid_data = vid_resp.json()
                            vid_stats = vid_data.get("stats", {})
                            
                            # likes can be in different formats
                            likes = vid_stats.get("likes", 0) or 0
                            comments = vid_stats.get("comments", 0) or 0
                            
                            # Handle string numbers like "12.3K"
                            if isinstance(likes, str):
                                likes = _parse_yt_number(likes)
                            if isinstance(comments, str):
                                comments = _parse_yt_number(comments)
                            
                            total_likes += int(likes)
                            total_comments += int(comments)
                            videos_with_data += 1
                            
                            # Update recent_posts with real data
                            for rp in recent_posts:
                                if rp["id"] == vid_id:
                                    rp["likes"] = int(likes)
                                    rp["comments"] = int(comments)
                                    # Get thumbnail
                                    thumbs = vid_data.get("thumbnails", [])
                                    if isinstance(thumbs, list) and thumbs:
                                        rp["thumbnail"] = thumbs[-1].get("url", "")
                                    break
                        except Exception:
                            continue
                
                if videos_with_data > 0:
                    avg_likes = total_likes // videos_with_data
                    avg_comments = total_comments // videos_with_data
                    
        except Exception:
            pass  # If video fetching fails, we'll fall back to estimates below
        
        # Calculate engagement rate from REAL data when available
        yt_eng = 0.0
        if subscriber_count > 0:
            if avg_likes > 0:
                # Real engagement: (avg_likes + avg_comments) / subscribers * 100
                yt_eng = round(((avg_likes + avg_comments) / subscriber_count) * 100, 2)
                yt_eng = min(yt_eng, 100.0)
            elif video_count > 0:
                # Fallback: view-based engagement
                avg_views = view_count / video_count
                yt_eng = round((avg_views / subscriber_count) * 100, 2)
                yt_eng = min(yt_eng, 100.0)
        
        res = {
            "name": title,
            "handle": f"@{clean_handle}",
            "platform": "youtube",
            "avatar_url": avatar_url,
            "followers": subscriber_count,
            "following": 0,
            "posts": video_count,
            "engagement_rate": yt_eng,
            "avg_likes": avg_likes,
            "avg_comments": avg_comments,
            "verified": data.get("isVerified", False),
            "bio": description[:500] if description else "",
            "location": data.get("country", ""),
            "niche": _detect_niche_from_bio(f"{title} {description}", title, []),
            "recent_posts": recent_posts[:5],
        }

        return res


def _parse_yt_number(s: str) -> int:
    """Parse YouTube formatted numbers like '12.3K', '1.5M', '523' into integers"""
    s = s.strip().replace(",", "")
    try:
        if s.upper().endswith("K"):
            return int(float(s[:-1]) * 1000)
        elif s.upper().endswith("M"):
            return int(float(s[:-1]) * 1_000_000)
        elif s.upper().endswith("B"):
            return int(float(s[:-1]) * 1_000_000_000)
        return int(float(s))
    except (ValueError, TypeError):
        return 0


# ======== Unified fetch ========

async def fetch_social_profile(handle: str, platform: str) -> dict:
    """Unified social media profile fetcher"""
    if platform == "instagram":
        return await fetch_instagram_profile(handle)
    elif platform == "youtube":
        return await fetch_youtube_channel(handle)
    else:
        raise ValueError(f"Unsupported platform: {platform}. Use 'instagram' or 'youtube'.")


async def fetch_comments(handle: str, platform: str, profile: dict = None) -> list[str]:
    """Fetch comments/captions for sentiment analysis"""
    if platform == "instagram":
        return await fetch_instagram_comments(handle, profile)
    elif platform == "youtube" and profile:
        captions = []
        for post in profile.get("recent_posts", []):
            if isinstance(post, dict) and post.get("caption"):
                captions.append(post["caption"])
            elif isinstance(post, str):
                captions.append(post)
        return captions
    return []


# ======== Helpers ========

def _detect_niche_from_bio(bio: str, name: str = "", captions: list[str] = None) -> list[str]:
    """Comprehensive niche detection from bio, name, and captions.
    Uses word-boundary matching to avoid false positives (e.g. 'art' in 'partner')."""
    import re
    all_text = f"{bio} {name} {' '.join(captions[:5]) if captions else ''}".lower()
    niches = []
    
    niche_keywords = {
        "Fitness": ["fitness", "gym", "workout", "training", "exercise", "bodybuilding", "crossfit", "athlete", "muscle", "lifting", "gains"],
        "Fashion": ["fashion", "style", "outfit", "clothing", "designer", "vogue", "runway", "couture", "ootd", "wardrobe"],
        "Beauty": ["beauty", "makeup", "skincare", "cosmetics", "glam", "foundation", "lipstick", "contour"],
        "Food": ["food", "recipe", "cooking", "chef", "restaurant", "foodie", "baking", "cuisine", "kitchen", "meal"],
        "Travel": ["travel", "adventure", "explore", "wanderlust", "backpack", "destination", "journey", "passport"],
        "Tech": ["tech", "coding", "developer", "software", "startup", "gadget", "innovation", "programming", "crypto", "web3", "saas"],
        "Gaming": ["gaming", "gamer", "esports", "twitch", "playstation", "xbox", "gameplay", "gaming channel", "valorant", "minecraft", "fortnite", "pubg", "bgmi", "game stream", "live stream"],
        "Music": ["music", "musician", "singer", "producer", "dj", "band", "album", "song", "concert", "rap", "hip hop"],
        "Photography": ["photography", "photographer", "camera", "lightroom", "portrait", "lens"],
        "Education": ["education", "teacher", "learn", "tutorial", "course", "mentor", "professor", "university"],
        "Wellness": ["wellness", "health", "mental health", "meditation", "yoga", "mindfulness", "nutrition", "holistic"],
        "Entertainment": ["actor", "actress", "movie", "movies", "film", "tv", "comedy", "comedian", "entertainment", "hollywood", "bollywood",
                          "podcast", "podcaster", "review", "reviews", "reaction", "react", "reacting",
                          "anime", "manga", "web series", "netflix", "cinema", "roast", "funny", "meme", "memes",
                          "culture", "pop culture", "tharak"],
        "Sports": ["cricket", "football", "soccer", "basketball", "tennis", "boxing", "ufc", "mma", "wrestling", "nfl", "nba", "wwe", "champion"],
        "Business": ["entrepreneur", "ceo", "founder", "investor", "marketing", "ecommerce"],
        "Art": ["artist", "painting", "illustration", "digital art", "sketch", "artwork", "calligraphy", "sculpt"],
        "Parenting": ["mom", "dad", "parent", "family", "kids", "children", "baby", "motherhood", "fatherhood"],
    }
    
    for niche, keywords in niche_keywords.items():
        for kw in keywords:
            # Use word boundary matching to avoid false positives
            # e.g. "art" should NOT match "partner" or "start"
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, all_text):
                niches.append(niche)
                break  # One match per niche is enough
    
    if not niches:
        if any(re.search(r'\b' + re.escape(kw) + r'\b', all_text) for kw in ["official", "public figure", "personal"]):
            return ["Entertainment"]
        return ["General"]
    
    return niches[:3]


def generate_engagement_timeline(profile: dict, days: int = 30) -> list[dict]:
    """Generate engagement timeline from REAL post data.
    Uses actual post likes, comments, and timestamps from the API.
    Spike detection checks if a post's engagement is 3x+ the average."""
    recent_posts = profile.get("recent_posts", [])
    base_followers = profile.get("followers", 0)

    # If we have real post data, use it
    if recent_posts:
        # Calculate average engagement for spike detection
        all_likes = [p.get("likes", 0) for p in recent_posts if isinstance(p, dict)]
        avg_likes = sum(all_likes) / len(all_likes) if all_likes else 0
        spike_threshold = avg_likes * 3 if avg_likes > 0 else float("inf")

        raw_timeline = []
        for post in recent_posts:
            if not isinstance(post, dict):
                continue

            # Parse real timestamp
            ts = post.get("posted_at")
            if ts:
                try:
                    date_str = datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
                except (ValueError, TypeError, OSError):
                    date_str = datetime.now().strftime("%Y-%m-%d")
            else:
                date_str = datetime.now().strftime("%Y-%m-%d")

            likes = post.get("likes", 0)
            comments = post.get("comments", 0)
            is_spike = likes > spike_threshold and avg_likes > 0

            raw_timeline.append({
                "date": date_str,
                "likes": likes,
                "comments": comments,
                "is_spike": is_spike
            })

        # AGGREGATE BY DATE to avoid "duplicate constrained values" in ON CONFLICT upsert
        aggregated = {}
        for entry in raw_timeline:
            d = entry["date"]
            if d not in aggregated:
                aggregated[d] = {
                    "date": d,
                    "followers": base_followers,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0,
                    "organic": True
                }
            
            aggregated[d]["likes"] += entry["likes"]
            aggregated[d]["comments"] += entry["comments"]
            aggregated[d]["shares"] += int(entry["likes"] * 0.05) if entry["likes"] else 0
            if entry["is_spike"]:
                aggregated[d]["organic"] = False

        timeline = list(aggregated.values())
        # Sort by date ascending
        timeline.sort(key=lambda x: x["date"])
        return timeline

    # Fallback: no post data available (private/inactive accounts)
    # Show a flat line with the profile's current numbers
    timeline = []
    base_likes = profile.get("avg_likes", 0)
    base_comments = profile.get("avg_comments", 0)

    for i in range(min(days, 7)):
        date = (datetime.now() - timedelta(days=min(days, 7) - i)).strftime("%Y-%m-%d")
        timeline.append({
            "date": date,
            "followers": base_followers,
            "likes": base_likes,
            "comments": base_comments,
            "shares": int(base_likes * 0.05) if base_likes else 0,
            "organic": True,
        })

    return timeline

