import mongoose from "mongoose";
import pg from "pg";
import { createClient } from "redis";
import amqp from "amqplib";
import { config } from "./config.js";

export const sql = new pg.Pool({ connectionString: config.postgresUrl });
export let redis;
export let rabbit;

export async function connectMongo() {
  await mongoose.connect(config.mongoUrl);
}
export async function connectRedis() {
  redis = createClient({ url: config.redisUrl });
  redis.on("error", console.error);
  await redis.connect();
}
export async function connectRabbit() {
  const connection = await amqp.connect(config.rabbitUrl);
  rabbit = await connection.createChannel();
  await rabbit.assertExchange("commerce.events", "topic", { durable: true });
  await rabbit.assertExchange("commerce.dlx", "direct", { durable: true });
  return rabbit;
}
