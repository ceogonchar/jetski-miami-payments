# JetSki Miami Payment Server

Express.js сервер для обработки Square платежей.

## Установка

```bash
cd /Users/dmytro/clawd/jetski/payment-server
npm install
```

## Настройка

Скопируй `.env.example` в `.env` и заполни:

```env
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_LOCATION_ID=your_location_id
SQUARE_APP_ID=your_app_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
PORT=3001
```

## Запуск

```bash
# Production
npm start

# Development (с hot-reload)
npm run dev
```

## API Endpoints

### GET /health
Health check. Возвращает:
```json
{ "status": "ok", "timestamp": "2024-..." }
```

### GET /square-config
Возвращает Square app credentials для фронтенда:
```json
{
  "applicationId": "sq0idp-...",
  "locationId": "L5466..."
}
```

### POST /square-payment
Обрабатывает платёж. Body:
```json
{
  "sourceId": "cnon:card-nonce-...",
  "amount": 29900,  // в центах!
  "currency": "USD",
  "bookingId": "uuid",
  "customerEmail": "test@example.com",
  "customerName": "John Doe",
  "paymentType": "full",
  "idempotencyKey": "unique-key-123"
}
```

Response:
```json
{
  "success": true,
  "paymentId": "...",
  "status": "COMPLETED",
  "receiptUrl": "https://..."
}
```

## Деплой

Для production рекомендуется:
1. Railway.app
2. Render.com
3. Fly.io
4. AWS Lambda + API Gateway
5. Supabase Edge Functions (когда будет CLI)

## Связь с фронтендом

В `.env` фронтенда добавь:
```
VITE_PAYMENT_API_URL=http://localhost:3001
```

Для production замени на URL деплоя.
