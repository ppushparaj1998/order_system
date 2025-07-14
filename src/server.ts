import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './utils/db';
import { startConsumer } from './kafka/consumer';
import { initProducer } from './kafka/producer';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const db = await connectDB();
    await db.getConnection().then((conn) => conn.release());

    // Initialize Kafka producer once at startup
    await initProducer();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    await startConsumer();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
