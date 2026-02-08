import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { sendBookingNotifications, startReminderScheduler } from './notifications.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
}));
app.use(express.json());

// Square credentials
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_APP_ID = process.env.SQUARE_APP_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /square-config - Return Square app credentials for frontend
app.get('/square-config', (req, res) => {
  if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ error: 'Square configuration not found' });
  }
  
  res.json({
    applicationId: SQUARE_APP_ID,
    locationId: SQUARE_LOCATION_ID,
  });
});

// POST /square-payment - Process a payment
app.post('/square-payment', async (req, res) => {
  try {
    const {
      sourceId,
      amount, // in cents
      currency = 'USD',
      bookingId,
      customerEmail,
      customerName,
      paymentType = 'full',
      idempotencyKey,
    } = req.body;

    // Validate required fields
    if (!sourceId) {
      return res.status(400).json({ success: false, error: 'Missing sourceId (payment token)' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    if (!idempotencyKey) {
      return res.status(400).json({ success: false, error: 'Missing idempotencyKey' });
    }

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      console.error('Square credentials not configured');
      return res.status(500).json({ success: false, error: 'Payment system not configured' });
    }

    // Call Square Payments API
    const squareResponse = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: amount,
          currency: currency,
        },
        location_id: SQUARE_LOCATION_ID,
        buyer_email_address: customerEmail,
        note: bookingId ? `JetSki Miami Booking #${bookingId}` : 'JetSki Miami Payment',
        reference_id: bookingId,
      }),
    });

    const squareData = await squareResponse.json();

    if (!squareResponse.ok || squareData.errors) {
      console.error('Square API error:', squareData);
      const errorMessage = squareData.errors?.[0]?.detail || 'Payment processing failed';
      return res.status(400).json({ success: false, error: errorMessage });
    }

    const payment = squareData.payment;
    const paymentId = payment.id;

    // Save transaction to Supabase
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const transactionData = {
          booking_id: bookingId,
          square_payment_id: paymentId,
          amount: amount / 100, // Convert cents to dollars
          currency: currency,
          status: payment.status,
          payment_type: paymentType,
          customer_email: customerEmail,
          customer_name: customerName,
          receipt_url: payment.receipt_url,
          created_at: new Date().toISOString(),
        };

        // Insert transaction
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(transactionData),
        });

        if (!insertRes.ok) {
          console.error('Failed to save transaction:', await insertRes.text());
        }

        // Update booking status if bookingId provided
        if (bookingId) {
          const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'confirmed',
              payment_status: 'paid',
              payment_id: paymentId,
              updated_at: new Date().toISOString(),
            }),
          });

          if (!updateRes.ok) {
            console.error('Failed to update booking:', await updateRes.text());
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Payment succeeded but DB failed - continue
      }
    }

    try {
      if (bookingId) {
        await sendBookingNotifications({ bookingId });
      }
    } catch (notifyError) {
      console.error('Failed to send booking notifications:', notifyError);
    }

    res.json({
      success: true,
      paymentId: paymentId,
      status: payment.status,
      receiptUrl: payment.receipt_url,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment server running on http://localhost:${PORT}`);
  console.log(`   GET  /health        - Health check`);
  console.log(`   GET  /square-config - Get Square app config`);
  console.log(`   POST /square-payment - Process payment`);
});

// Reminder scheduler (hourly by default)
startReminderScheduler();
