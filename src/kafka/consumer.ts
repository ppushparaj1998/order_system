import { kafka } from '../config/kafka';
import { connectDB } from '../utils/db';
import { Order } from '../models/order.model';

const consumer = kafka.consumer({ groupId: 'order-consumer-group' });

export async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const order: Order = JSON.parse(value);
      const db = await connectDB();
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        if (order.order_type === 'sell') {
          let remaining = order.quantity;

          const [buyOrders] = await connection.execute<any[]>(
            `SELECT * FROM orders WHERE order_type = 'buy' AND currency_symbol = ? AND status = 'pending' ORDER BY timestamp ASC FOR UPDATE`,
            [order.currency_symbol]
          );
          for (const buyOrder of buyOrders) {
            const unsoldQty = parseFloat(buyOrder.quantity) - parseFloat(buyOrder.sell_quantity);
            if (unsoldQty <= 0) continue;

            const matchQty = Math.min(remaining, unsoldQty);
            remaining -= matchQty;

            const updatedSellQty = parseFloat(buyOrder.sell_quantity) + matchQty;
            const updatedStatus = updatedSellQty >= parseFloat(buyOrder.quantity) ? 'completed' : 'pending';

            await connection.execute(
              `UPDATE orders SET sell_quantity = ?, status = ? WHERE id = ?`,
              [updatedSellQty, updatedStatus, buyOrder.id]
            );

            if (remaining <= 0) break;
          }

        } else if (order.order_type === 'buy') {
          const [balances] = await connection.execute<any[]>(
            `SELECT * FROM balances WHERE user_id = ? AND currency_symbol = ? FOR UPDATE`,
            [order.userId, order.currency_symbol]
          );
          const balance = balances[0];

          if (balance) {
            await connection.execute(
              `UPDATE balances SET balance = balance + ? WHERE user_id = ? AND currency_symbol = ?`,
              [order.quantity, order.userId, order.currency_symbol]
            );
          } else {
            await connection.execute(
              `INSERT INTO balances (user_id, currency_symbol, balance) VALUES (?, ?, ?)`,
              [order.userId, order.currency_symbol, order.quantity]
            );
          }
        }

        await connection.commit();
      } catch (err) {
        console.error('Kafka Consumer Error:', err);
        await connection.rollback();
      } finally {
        connection.release();
      }
    }
  });
}
