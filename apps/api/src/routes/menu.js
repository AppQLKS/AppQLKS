import { Router } from 'express';
import { db } from '../data/store.js';

const router = Router();
router.get('/', (req, res) => {
  const { category } = req.query;
  res.json(category ? db.menu.filter((m) => m.category === category) : db.menu);
});
export default router;
