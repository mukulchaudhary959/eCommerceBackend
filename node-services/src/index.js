import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config.js';
import { gatewayRoutes } from './gateway.js'; import { userRoutes } from './user.js'; import { productRoutes } from './product.js'; import { inventoryRoutes } from './inventory.js'; import { paymentRoutes } from './payment.js'; import { notificationRoutes } from './notification.js';
const app = express(); app.use(cors()); app.use(express.json({ limit: '1mb' })); app.get('/health', (_req, res) => res.json({ status: 'UP', service: config.service }));
const starters = { gateway: gatewayRoutes, user: userRoutes, product: productRoutes, inventory: inventoryRoutes, payment: paymentRoutes, notification: notificationRoutes };
if (!starters[config.service]) throw new Error(`Unknown SERVICE_NAME ${config.service}`);
await starters[config.service](app);
app.use((err, _req, res, _next) => { console.error(err); if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues }); res.status(500).json({ error: 'Internal server error' }); });
app.listen(config.port, () => console.log(`${config.service} listening on ${config.port}`));

