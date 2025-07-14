import express from 'express';
import dotenv from 'dotenv';
import orderRoutes from './routes/order.routes';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', orderRoutes);

export default app;
