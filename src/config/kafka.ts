import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();

export const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER as string],
});