import { connectRabbit } from './connections.js';
export async function notificationRoutes(app) {
  const channel = await connectRabbit(); await channel.assertQueue('notifications.email', { durable: true, deadLetterExchange: 'commerce.dlx' }); await channel.bindQueue('notifications.email', 'commerce.events', 'order.#');
  channel.consume('notifications.email', async msg => { if (!msg) return; try { const event = JSON.parse(msg.content.toString()); console.log(`[email] order event for ${event.customerEmail || event.orderId}`); channel.ack(msg); } catch { channel.nack(msg, false, false); } });
  app.get('/notifications/health', (_req, res) => res.json({ status: 'UP', consumer: 'notifications.email' }));
}

