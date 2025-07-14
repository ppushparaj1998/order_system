import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
  try {
    const connection = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: Number(process.env.DB_PORT),
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });


    // Ensure balances table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        currency_symbol VARCHAR(10) NOT NULL,
        balance DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_currency (user_id, currency_symbol)
      )
    `);

    // Ensure orders table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_type ENUM('buy', 'sell') NOT NULL,
        currency_symbol VARCHAR(10) NOT NULL,
        price DECIMAL(20, 6) NOT NULL,
        quantity DECIMAL(20, 8) NOT NULL,
        sell_quantity DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
        status ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_symbol_price (currency_symbol, price),
        INDEX idx_status (status)
      )
    `);

    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    process.exit(1);
  }
}
