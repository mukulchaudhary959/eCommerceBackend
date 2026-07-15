import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate, allow } from "./auth.js";
import { connectMongo, connectRedis, redis } from "./connections.js";

const Product = mongoose.model(
  "Product",
  new mongoose.Schema(
    {
      name: String,
      description: String,
      price: Number,
      sku: { type: String, unique: true },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);
const schema = z.object({
  name: z.string().min(2),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  sku: z.string().min(2),
});
export async function productRoutes(app) {
  await Promise.all([connectMongo(), connectRedis()]);
  const router = express.Router();
  router.get("/", async (_req, res) => {
    const cached = await redis.get("products:all");
    if (cached) return res.json(JSON.parse(cached));
    const data = await Product.find({ active: true });
    await redis.set("products:all", JSON.stringify(data), { EX: 60 });
    res.json(data);
  });
  router.get("/:id", async (req, res) => {
    const item = await Product.findById(req.params.id);
    item
      ? res.json(item)
      : res.status(404).json({ error: "Product not found" });
  });
  router.post("/", authenticate, allow("ADMIN"), async (req, res) => {
    const item = await Product.create(schema.parse(req.body));
    await redis.del("products:all");
    res.status(201).json(item);
  });
  router.put("/:id", authenticate, allow("ADMIN"), async (req, res) => {
    const item = await Product.findByIdAndUpdate(
      req.params.id,
      schema.parse(req.body),
      { new: true },
    );
    await redis.del("products:all");
    res.json(item);
  });
  app.use("/products", router);
}
