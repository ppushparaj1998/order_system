import { Request, Response } from 'express';
import { connectDB } from '../utils/db';
import { producer } from '../kafka/producer';
import { RowDataPacket } from 'mysql2/promise';

interface Balance extends RowDataPacket {
  id: number;
  user_id: number;
  currency_symbol: string;
  balance: string;
}

function isValidOrder(order: any): string | null {
  const { userId, order_type, currency_symbol, price, quantity } = order;
  if (!userId || typeof userId !== 'number' || userId < 1 || userId > 10)
    return 'Invalid userId (1–10)';
  if (!['buy', 'sell'].includes(order_type))
    return 'Invalid order_type';
  if (!['BTC', 'ETH'].includes(currency_symbol))
    return 'Invalid currency_symbol';
  if (typeof price !== 'number' || price < 1.123456 || price > 9.123456)
    return 'Invalid price';
  if (typeof quantity !== 'number' || quantity <= 0)
    return 'Invalid quantity';
  return null;
}

export async function placeOrder(req: Request, res: Response) {
  const error = isValidOrder(req.body);
  if (error) return res.status(400).json({ error });

  const { userId, order_type, currency_symbol, price, quantity } = req.body;
  const timestamp = new Date();

  const db = await connectDB();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [balances] = await connection.execute<Balance[]>(
      `SELECT * FROM balances WHERE user_id = ? AND currency_symbol = ? FOR UPDATE`,
      [userId, currency_symbol]
    );

    const balanceRow = balances[0];

    if (order_type === 'sell') {
      if (!balanceRow || parseFloat(balanceRow.balance) < quantity) {
        await connection.rollback();
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      await connection.execute(
        `UPDATE balances SET balance = balance - ? WHERE user_id = ? AND currency_symbol = ?`,
        [quantity, userId, currency_symbol]
      );
    }

    if (order_type === 'buy') {
      const [existingOrders] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE user_id = ? AND order_type = 'buy' AND currency_symbol = ? AND price = ? AND status = 'pending' FOR UPDATE`,
        [userId, currency_symbol, price]
      );

      if (existingOrders.length > 0) {
        await connection.execute(
          `UPDATE orders SET quantity = quantity + ? WHERE id = ?`,
          [quantity, existingOrders[0].id]
        );
      } else {
        await connection.execute(
          `INSERT INTO orders (user_id, order_type, currency_symbol, price, quantity, sell_quantity, timestamp, status)
          VALUES (?, ?, ?, ?, ?, 0.0, ?, 'pending')`,
          [userId, order_type, currency_symbol, price, quantity, timestamp]
        );
      }
    }

    await connection.commit();

    await producer.send({
      topic: 'order-events',
      messages: [
        {
          key: String(userId),
          value: JSON.stringify({
            userId,
            order_type,
            currency_symbol,
            price,
            quantity,
            timestamp
          })
        }
      ]
    });

    res.status(201).json({ message: 'Order placed and sent to Kafka' });
  } catch (err) {
    console.error('Error placing order:', err);
    await connection.rollback();
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    connection.release();
  }
}



export async function getBalance(req: Request, res: Response) {
  const userId = parseInt(req.params.userId);
  const symbol = req.query.symbol as string;

  if (!userId || userId < 1 || userId > 10)
    return res.status(400).json({ error: 'Invalid userId (1–10)' });

  if (symbol && !['BTC', 'ETH'].includes(symbol)) {
    return res.status(400).json({ error: 'Invalid currency symbol (BTC or ETH)' });
  }

  try {
    const db = await connectDB();
    let query = 'SELECT * FROM balances WHERE user_id = ?';
    const params: (string | number)[] = [userId];

    if (symbol) {
      query += ' AND currency_symbol = ?';
      params.push(symbol);
    }

    const [rows] = await db.execute(query, params);
    res.status(200).json({ balances: rows });
  } catch (err) {
    console.error('Failed to fetch balance:', err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

export async function getOrders(req: Request, res: Response) {
  const { userId, symbol } = req.query;

  try {
    const db = await connectDB();

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(Number(userId));
    }

    if (symbol) {
      if (!['BTC', 'ETH'].includes(symbol.toString())) {
        return res.status(400).json({ error: 'Invalid currency symbol (BTC or ETH)' });
      }
      query += ' AND currency_symbol = ?';
      params.push(symbol);
    }

    query += ' ORDER BY timestamp DESC';

    const [rows] = await db.execute(query, params);
    res.status(200).json({ orders: rows });
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

