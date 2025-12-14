import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

export function getRedis(): RedisClientType | null {
  if (client) {
    return client;
  }
  
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[redis] REDIS_URL not set, Redis will not be available");
    return null;
  }
  
  console.log("[redis] Creating Redis client with URL:", url.replace(/:[^:@]+@/, ":****@"));
  client = createClient({ url });
  
  client.on("error", (err) => {
    console.error("[redis] error", err);
    client = null;
  });
  
  client.on("connect", () => {
    console.log("[redis] Client connecting...");
  });
  
  client.on("ready", () => {
    console.log("[redis] Client ready");
  });
  
  client.connect().catch((err) => {
    console.error("[redis] connect error", err);
    client = null;
  });
  
  return client;
}

