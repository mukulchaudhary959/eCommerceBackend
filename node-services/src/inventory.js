import express from 'express';
import { authenticate, allow } from './auth.js';
import { sql, connectRabbit } from './connections.js';

export async function inventoryRoutes(app) {
  await sql.query('CREATE TABLE IF NOT EXISTS inventory (sku TEXT PRIMARY KEY, available INT NOT NULL CHECK (available >= 0), reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0))');
  const channel = await connectRabbit(); const router = express.Router();
  router.get('/:sku', async (req, res) => { const { rows } = await sql.query('SELECT * FROM inventory WHERE sku=$1', [req.params.sku]); rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'SKU not found' }); });
  router.put('/:sku', authenticate, allow('ADMIN'), async (req, res) => { const { rows } = await sql.query('INSERT INTO inventory(sku,available) VALUES($1,$2) ON CONFLICT(sku) DO UPDATE SET available=$2 RETURNING *', [req.params.sku, req.body.available]); res.json(rows[0]); });
  router.post('/reserve', authenticate, async (req, res) => { const client = await sql.connect(); try { await client.query('BEGIN'); for (const item of req.body.items) { const result = await client.query('UPDATE inventory SET available=available-$1,reserved=reserved+$1 WHERE sku=$2 AND available >= $1 RETURNING *', [item.quantity, item.sku]); if (!result.rowCount) throw new Error(`Insufficient inventory: ${item.sku}`); } await client.query('COMMIT'); channel.publish('commerce.events', 'inventory.reserved', Buffer.from(JSON.stringify({ orderId: req.body.orderId })), { persistent: true }); res.json({ status: 'RESERVED' }); } catch (e) { await client.query('ROLLBACK'); res.status(409).json({ error: e.message }); } finally { client.release(); } });
  app.use('/inventory', router);
}

