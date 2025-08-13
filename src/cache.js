import Redis from "ioredis";

let client = null;
export function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    client.on('error', (e)=>console.error('[redis]', e.message));
    client.connect().catch(()=>{});
  }
  return client;
}

const mem = new Map(); // fallback in-memory cache

export async function cacheGet(key) {
  const r = getRedis();
  if (r) {
    try { const v = await r.get(key); if (v) return JSON.parse(v); } catch {}
  }
  if (mem.has(key)) return mem.get(key);
  return null;
}

export async function cacheSetEx(key, ttlSec, value) {
  const str = JSON.stringify(value);
  const r = getRedis();
  if (r) {
    try { await r.setex(key, ttlSec, str); return; } catch {}
  }
  mem.set(key, value);
  setTimeout(()=>mem.delete(key), ttlSec*1000).unref?.();
}
