
# Order System (Node.js + TypeScript)

This project implements an order placement and balance management system using Kafka, MySQL, Node.js, and TypeScript.

It provides a REST API to place cryptocurrency buy/sell orders, stores them in a MySQL database, and produces/consumes messages with Kafka to update user balances accordingly.

---

## Features

* Place buy/sell orders via REST API
* Kafka producer sends order to topic (`order-events`)
* Kafka consumer listens and performs price matching
* Order data is persisted to MySQL (`orders` table)
* Balance is updated or deducted in `balances` table
* Transaction-safe balance handling with `SELECT ... FOR UPDATE`
* Enforces validation (user ID, price, currency symbol, etc.)

---

## Tech Stack

* Node.js + TypeScript
* Express.js
* MySQL (native driver)
* KafkaJS (Confluent Kafka compatible)
* dotenv

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd order-system-ts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update `.env` with your local MySQL and Kafka config:

```
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=order_system

KAFKA_BROKER=localhost:9092
```

---

### 4. Create MySQL Database

```sql
CREATE DATABASE order_system;
```

The application will auto-create the `orders` and `balances` tables on startup.

---

### 5. Run Kafka

Start a Kafka broker locally (e.g., via Docker or Confluent Platform) and ensure it matches the `.env` configuration.

---

## Run the Application

### Development (with TypeScript runtime)

```bash
npm run dev
```

### Production (compiled)

```bash
npm run build
npm start
```

---

## API Endpoints

### POST `/api/orders`

Place a buy/sell order:

```json
{
  "userId": 1,
  "order_type": "buy",
  "currency_symbol": "BTC",
  "price": 5.123456,
  "quantity": 2.0
}
```

### GET `/api/balances/:userId?symbol=BTC`

Get the balances of a user with optional currency filter.

---

### GET `/api/orders`

Get all orders placed.

**Optional Query Parameters:**

| Parameter         | Type   | Description                               |
| ----------------- | ------ | ----------------------------------------- |
| `userId`          | number | Filter by user ID                         |
| `currency_symbol` | string | Filter by currency (BTC or ETH)           |
| `order_type`      | string | Filter by order type (`buy` or `sell`)    |
| `status`          | string | Filter by status (`pending`, `completed`) |

**Response Example:**

```json
{
  "orders": [
    {
      "id": 1,
      "user_id": 1,
      "order_type": "buy",
      "currency_symbol": "BTC",
      "price": 5.123456,
      "quantity": 2.0,
      "sell_quantity": 1.0,
      "status": "pending",
      "timestamp": "2025-07-14T16:53:01.077Z"
    }
  ]
}
```

## Kafka Details

* **Topic:** `order-events`
* **Producer:** Sends order after successful DB commit
* **Consumer:** Reads and updates user balances, matches orders, updates statuses

---

## Notes

* The system uses **transactions** and **row-level locking** to ensure consistency
* Sell orders deduct quantity from existing buy orders using earliest FIFO matching
* If a buy order with same price and status "pending" exists, the new quantity is merged
* Ensure Kafka and MySQL are up before making API calls
