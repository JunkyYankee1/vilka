import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

export function getRedis(): RedisClientType | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = createClient({ url });
  client.on("error", (err) => {
    console.error("[redis] error", err);
  });
  client.connect().catch((err) => {
    console.error("[redis] connect error", err);
    client = null;
  });
  return client;
}

