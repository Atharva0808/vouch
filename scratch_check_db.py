import asyncio, sys
sys.stdout.reconfigure(encoding='utf-8')
from backend.services.supabase_service import get_supabase

sb = get_supabase()
res = sb.table('influencers').select('id,name,handle,platform,user_id,created_at').execute()
items = res.data or []
print('Total in DB:', len(items))

by_user = {}
for i in items:
    u = str(i.get('user_id') or 'null')
    by_user[u] = by_user.get(u, 0) + 1
print('By user_id:', by_user)

print('\nRecent 15 created:')
for i in sorted(items, key=lambda x: str(x.get('created_at', '')), reverse=True)[:15]:
    c = i.get('created_at')
    n = i.get('name')
    h = i.get('handle')
    u = i.get('user_id')
    print(f"{c}: {n} (@{h}) - user_id: {u}")
