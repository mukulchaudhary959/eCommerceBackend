import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
const services = { users: 'http://user-service:3001', products: 'http://product-service:3002', orders: 'http://order-service:8080', inventory: 'http://inventory-service:3004', payments: 'http://payment-service:3005', notifications: 'http://notification-service:3006' };
export async function gatewayRoutes(app) {
  app.use(rateLimit({ windowMs: 60_000, limit: 200 }));
  for (const [path, target] of Object.entries(services)) app.use(`/api/${path}`, createProxyMiddleware({ target, changeOrigin: true, pathRewrite: { [`^/api/${path}`]: `/${path}` } }));
}

