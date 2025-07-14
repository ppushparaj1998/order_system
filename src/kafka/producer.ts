// src/kafka/producer.ts
import { kafka } from '../config/kafka';

export const producer = kafka.producer();
let isConnected = false;

export async function initProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('Kafka producer connected');
  }
}
