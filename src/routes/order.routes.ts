import express from 'express';
import { placeOrder, getBalance, getOrders } from '../controllers/order.controller';

const router = express.Router();

router.post('/orders', placeOrder);
router.get('/balances/:userId', getBalance);
router.get('/orders', getOrders);

export default router;