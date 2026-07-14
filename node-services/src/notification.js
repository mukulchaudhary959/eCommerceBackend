import { connectRabbit } from "./connections.js";
export async function notificationRoutes(app) {
  const channel = await connectRabbit();
  await channel.assertExchange("commerce.retry", "direct", { durable: true });
  await channel.assertQueue("notifications.dlq", { durable: true });
  await channel.bindQueue(
    "notifications.dlq",
    "commerce.dlx",
    "notifications.failed",
  );
  await channel.assertQueue("notifications.retry", {
    durable: true,
    messageTtl: 5000,
    deadLetterExchange: "commerce.events",
    deadLetterRoutingKey: "order.retry",
  });
  await channel.bindQueue(
    "notifications.retry",
    "commerce.retry",
    "notifications",
  );
  await channel.assertQueue("notifications.email", {
    durable: true,
    deadLetterExchange: "commerce.dlx",
    deadLetterRoutingKey: "notifications.failed",
  });
  await channel.bindQueue("notifications.email", "commerce.events", "order.#");
  channel.consume("notifications.email", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      console.log(
        `[email] order event for ${event.customerEmail || event.orderId}`,
      );
      channel.ack(msg);
    } catch {
      const retries = Number(msg.properties.headers?.["retry-count"] || 0);
      if (retries < 3) {
        channel.publish("commerce.retry", "notifications", msg.content, {
          persistent: true,
          headers: { ...msg.properties.headers, "retry-count": retries + 1 },
        });
        channel.ack(msg);
      } else channel.nack(msg, false, false);
    }
  });
  app.get("/notifications/health", (_req, res) =>
    res.json({ status: "UP", consumer: "notifications.email" }),
  );
}
