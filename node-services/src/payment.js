import express from "express";
import { randomUUID } from "node:crypto";
import { authenticate } from "./auth.js";
import { sql, connectRabbit } from "./connections.js";

export async function paymentRoutes(app) {
  await sql.query(
    "CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY, order_id UUID UNIQUE, amount NUMERIC(12,2), status TEXT, idempotency_key TEXT UNIQUE)",
  );
  const channel = await connectRabbit();
  const router = express.Router();
  router.post("/", authenticate, async (req, res) => {
    const key = req.headers["idempotency-key"];
    if (!key)
      return res.status(400).json({ error: "Idempotency-Key header required" });
    const id = randomUUID();
    const { rows } = await sql.query(
      "INSERT INTO payments(id,order_id,amount,status,idempotency_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *",
      [id, req.body.orderId, req.body.amount, "CAPTURED", key],
    );
    channel.publish(
      "commerce.events",
      "payment.captured",
      Buffer.from(JSON.stringify(rows[0])),
      { persistent: true },
    );
    res.status(201).json(rows[0]);
  });
  router.get("/:orderId", authenticate, async (req, res) => {
    const { rows } = await sql.query(
      "SELECT * FROM payments WHERE order_id=$1",
      [req.params.orderId],
    );
    rows[0]
      ? res.json(rows[0])
      : res.status(404).json({ error: "Payment not found" });
  });
  app.use("/payments", router);
}
