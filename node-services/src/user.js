import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { issueToken, authenticate, allow } from "./auth.js";
import { connectMongo, connectRedis, redis } from "./connections.js";

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      email: { type: String, unique: true, lowercase: true, required: true },
      passwordHash: { type: String, required: true },
      roles: { type: [String], default: ["CUSTOMER"] },
    },
    { timestamps: true },
  ),
);
const credentials = z.object({ email: z.email(), password: z.string().min(8) });

export async function userRoutes(app) {
  await Promise.all([connectMongo(), connectRedis()]);
  const router = express.Router();
  router.post("/register", async (req, res, next) => {
    try {
      const body = credentials.parse(req.body);
      const user = await User.create({
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 12),
      });
      res
        .status(201)
        .json({
          token: issueToken(user),
          user: { id: user.id, email: user.email, roles: user.roles },
        });
    } catch (e) {
      if (e?.code === 11000)
        return res.status(409).json({ error: "Email already registered" });
      next(e);
    }
  });
  router.post("/login", async (req, res, next) => {
    try {
      const body = credentials.parse(req.body);
      const user = await User.findOne({ email: body.email });
      if (!user || !(await bcrypt.compare(body.password, user.passwordHash)))
        return res.status(401).json({ error: "Invalid credentials" });
      res.json({
        token: issueToken(user),
        user: { id: user.id, email: user.email, roles: user.roles },
      });
    } catch (e) {
      next(e);
    }
  });
  router.get("/me", authenticate, async (req, res) =>
    res.json(await User.findById(req.user.sub).select("-passwordHash")),
  );
  router.get("/me/cart", authenticate, async (req, res) =>
    res.json(JSON.parse((await redis.get(`cart:${req.user.sub}`)) || "[]")),
  );
  router.put("/me/cart", authenticate, async (req, res) => {
    await redis.set(
      `cart:${req.user.sub}`,
      JSON.stringify(req.body.items || []),
      { EX: 604800 },
    );
    res.json({ items: req.body.items || [] });
  });
  router.delete("/me/cart", authenticate, async (req, res) => {
    await redis.del(`cart:${req.user.sub}`);
    res.status(204).end();
  });
  router.patch("/:id/roles", authenticate, allow("ADMIN"), async (req, res) =>
    res.json(
      await User.findByIdAndUpdate(
        req.params.id,
        { roles: req.body.roles },
        { new: true },
      ).select("-passwordHash"),
    ),
  );
  app.use("/users", router);
}
