from backend.services.supabase_service import get_supabase
sb = get_supabase()
res = sb.table('influencers').select('name,handle,platform,user_id,created_at').neq('user_id', '00000000-0000-0000-0000-000000000000').execute()
items = res.data or []
print('Total real fetched influencers:', len(items))
for i in sorted(items, key=lambda x: str(x.get('created_at', '')), reverse=True)[:30]:
    dt = str(i.get('created_at', ''))[:19]
    n = i.get('name')
    h = i.get('handle')
    p = i.get('platform')
    u = i.get('user_id')
    print(f"{dt}: {n} (@{h}, {p}) - user: {u}")
