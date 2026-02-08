import { config } from 'dotenv';
import { Resend } from 'resend';

config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  RESEND_API_KEY,
  RESEND_FROM,
  ADMIN_EMAIL,
  WAIVER_SIGNING_URL,
  REMINDER_INTERVAL_MS,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
} = process.env;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const DEFAULT_FROM = RESEND_FROM || 'JetSki Miami <onboarding@resend.dev>';
const DEFAULT_ADMIN_EMAIL = ADMIN_EMAIL || 'goncharboats@gmail.com';
const DEFAULT_WAIVER_URL = WAIVER_SIGNING_URL || 'https://jetskimiami.com/waiver';

const currency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr, dateStr) => {
  if (!timeStr) return 'TBD';
  try {
    const iso = dateStr ? `${dateStr}T${timeStr}` : timeStr;
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  } catch {
    return timeStr;
  }
};

const buildEmailTemplate = ({
  customerName,
  bookingNumber,
  rentalDate,
  startTime,
  durationHours,
  jetskiCount,
  subtotal,
  taxAmount,
  creditCardFee,
  discountAmount,
  totalAmount,
  damageWaiverPrice,
  hasBoaterCertificate,
}) => {
  const waiverLine = damageWaiverPrice && Number(damageWaiverPrice) > 0
    ? `Included (${currency(damageWaiverPrice)})`
    : 'Not added';

  const certificateNote = hasBoaterCertificate === false
    ? 'Boater Certificate required if born on/after Jan 1, 1988.'
    : 'Bring your Boater Certificate if required.';

  const breakdownRows = [
    { label: 'Subtotal', value: currency(subtotal) },
    { label: 'Tax', value: currency(taxAmount) },
    { label: 'Credit Card Fee', value: currency(creditCardFee) },
    { label: 'Discount', value: discountAmount ? `- ${currency(discountAmount)}` : currency(0) },
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation - JetSki Miami</title>
  <style>
    body { margin:0; padding:0; background:#081a2b; font-family: 'Arial', sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#0c2238; color:#f5f8ff; }
    .header { padding:24px; text-align:center; background:linear-gradient(135deg,#041221,#0f2d4a); }
    .logo { font-size:24px; font-weight:700; color:#f2c56b; letter-spacing:1px; }
    .content { padding:24px; }
    .card { background:#112b44; border-radius:12px; padding:20px; margin-bottom:16px; }
    .title { font-size:20px; font-weight:700; margin-bottom:8px; color:#f2c56b; }
    .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
    .row:last-child { border-bottom:none; }
    .label { color:#b6c6d9; }
    .value { font-weight:600; }
    .highlight { color:#f2c56b; font-weight:700; }
    .cta { display:inline-block; background:#f2c56b; color:#081a2b; padding:12px 18px; border-radius:999px; text-decoration:none; font-weight:700; }
    .footer { padding:20px; font-size:12px; color:#9fb1c6; text-align:center; }
    @media (max-width: 480px) {
      .row { flex-direction:column; align-items:flex-start; }
      .value { margin-top:4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">JetSki Miami</div>
      <div>Booking Confirmation</div>
    </div>
    <div class="content">
      <div class="card">
        <div class="title">Reservation Details</div>
        <div class="row"><div class="label">Guest</div><div class="value">${customerName || 'Guest'}</div></div>
        <div class="row"><div class="label">Booking #</div><div class="value">${bookingNumber || '—'}</div></div>
        <div class="row"><div class="label">Date</div><div class="value">${formatDate(rentalDate)}</div></div>
        <div class="row"><div class="label">Start Time</div><div class="value">${formatTime(startTime, rentalDate)}</div></div>
        <div class="row"><div class="label">Duration</div><div class="value">${durationHours} hour(s)</div></div>
        <div class="row"><div class="label">JetSkis</div><div class="value">${jetskiCount}</div></div>
        <div class="row"><div class="label">Damage Waiver</div><div class="value">${waiverLine}</div></div>
      </div>

      <div class="card">
        <div class="title">Payment Summary</div>
        ${breakdownRows.map(row => `<div class=\"row\"><div class=\"label\">${row.label}</div><div class=\"value\">${row.value}</div></div>`).join('')}
        <div class="row"><div class="label">Total</div><div class="value highlight">${currency(totalAmount)}</div></div>
      </div>

      <div class="card">
        <div class="title">What to Bring</div>
        <div>• Government issued ID</div>
        <div>• ${certificateNote}</div>
        <div>• Sunscreen, sunglasses, and water</div>
      </div>

      <div class="card">
        <div class="title">Location</div>
        <div>Miami Beach Marina</div>
        <div>300 Alton Rd, Miami Beach, FL</div>
      </div>

      <div class="card">
        <div class="title">Waiver Signing</div>
        <div>Complete your waiver before arrival to save time.</div>
        <div style="margin-top:12px;"><a class="cta" href="${DEFAULT_WAIVER_URL}">Sign Waiver</a></div>
      </div>

      <div class="card">
        <div class="title">Cancellation Policy</div>
        <div>Free cancellation up to 24 hours before your scheduled start time. Within 24 hours, deposits are non-refundable.</div>
      </div>

      <div class="card">
        <div class="title">Need Help?</div>
        <div>Call or text us anytime: <strong>+1 786-863-1721</strong></div>
      </div>
    </div>
    <div class="footer">
      © JetSki Miami · Ocean-Deep Adventures Await
    </div>
  </div>
</body>
</html>`;
};

const supabaseFetch = async (path, options = {}) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers || {}),
    },
  });
  return res;
};

export const getBookingDetails = async (bookingId) => {
  if (!bookingId) return null;
  const res = await supabaseFetch(`/rest/v1/bookings?select=*,customers(full_name,email,phone,has_boater_certificate),booking_vehicles(id)&id=eq.${bookingId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch booking ${bookingId}: ${await res.text()}`);
  }
  const data = await res.json();
  return data?.[0] || null;
};

export const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn('Resend not configured. Skipping email send.');
    return null;
  }
  return resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });
};

export const sendConfirmationEmail = async (booking, customer) => {
  if (!booking || !customer?.email) return null;
  const jetskiCount = booking.booking_vehicles?.length || 1;
  const html = buildEmailTemplate({
    customerName: customer.full_name,
    bookingNumber: booking.booking_number,
    rentalDate: booking.rental_date,
    startTime: booking.start_time,
    durationHours: booking.duration_hours,
    jetskiCount,
    subtotal: booking.subtotal,
    taxAmount: booking.tax_amount,
    creditCardFee: booking.credit_card_fee,
    discountAmount: booking.discount_amount,
    totalAmount: booking.total_amount,
    damageWaiverPrice: booking.addons_price,
    hasBoaterCertificate: customer.has_boater_certificate,
  });

  return sendEmail({
    to: customer.email,
    subject: `JetSki Miami Booking Confirmation #${booking.booking_number || ''}`,
    html,
  });
};

export const sendAdminNotification = async (booking, customer) => {
  if (!booking) return null;
  const jetskiCount = booking.booking_vehicles?.length || 1;
  const html = `
    <h2>New JetSki Miami Booking</h2>
    <p><strong>Booking #:</strong> ${booking.booking_number}</p>
    <p><strong>Customer:</strong> ${customer?.full_name || 'N/A'} (${customer?.email || 'N/A'})</p>
    <p><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
    <p><strong>Date:</strong> ${formatDate(booking.rental_date)}</p>
    <p><strong>Start:</strong> ${formatTime(booking.start_time, booking.rental_date)}</p>
    <p><strong>Duration:</strong> ${booking.duration_hours} hour(s)</p>
    <p><strong>JetSkis:</strong> ${jetskiCount}</p>
    <p><strong>Total:</strong> ${currency(booking.total_amount)}</p>
  `;

  return sendEmail({
    to: DEFAULT_ADMIN_EMAIL,
    subject: `New Booking #${booking.booking_number}`,
    html,
  });
};

export const sendSmsConfirmation = async ({ to, rentalDate, startTime }) => {
  if (!to) return null;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn('Twilio not configured. Skipping SMS send.');
    return null;
  }

  const body = `Your JetSki Miami booking is confirmed! Date: ${formatDate(rentalDate)}, Time: ${formatTime(startTime, rentalDate)}. See you at Miami Beach Marina! 🌊`;
  const params = new URLSearchParams({
    From: TWILIO_FROM_NUMBER,
    To: to,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    console.error('Twilio SMS error:', await res.text());
  }

  return res.json();
};

export const sendBookingNotifications = async ({ bookingId }) => {
  try {
    const booking = await getBookingDetails(bookingId);
    if (!booking) return null;
    const customer = booking.customers;

    await Promise.allSettled([
      sendConfirmationEmail(booking, customer),
      sendAdminNotification(booking, customer),
      sendSmsConfirmation({
        to: customer?.phone,
        rentalDate: booking.rental_date,
        startTime: booking.start_time,
      }),
    ]);

    return booking;
  } catch (error) {
    console.error('Notification error:', error);
    return null;
  }
};

const markReminderSent = async (bookingId, existingNotes) => {
  const noteLine = `Reminder sent at ${new Date().toISOString()}`;
  const updatedNotes = existingNotes ? `${existingNotes}\n${noteLine}` : noteLine;
  const res = await supabaseFetch(`/rest/v1/bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ internal_notes: updatedNotes }),
  });
  if (!res.ok) {
    console.error('Failed to mark reminder sent:', await res.text());
  }
};

export const sendRemindersForTomorrow = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const res = await supabaseFetch(`/rest/v1/bookings?select=*,customers(full_name,email,phone,has_boater_certificate),booking_vehicles(id)&rental_date=eq.${dateStr}&status=eq.confirmed&payment_status=eq.paid`);
  if (!res.ok) {
    console.error('Failed to fetch reminders:', await res.text());
    return;
  }

  const bookings = await res.json();
  for (const booking of bookings) {
    const alreadySent = booking.internal_notes?.includes('Reminder sent at');
    if (alreadySent) continue;

    const customer = booking.customers;
    await Promise.allSettled([
      sendConfirmationEmail(booking, customer),
      sendSmsConfirmation({
        to: customer?.phone,
        rentalDate: booking.rental_date,
        startTime: booking.start_time,
      }),
    ]);

    await markReminderSent(booking.id, booking.internal_notes);
  }
};

export const startReminderScheduler = () => {
  const intervalMs = Number(REMINDER_INTERVAL_MS) || 60 * 60 * 1000;
  setInterval(() => {
    sendRemindersForTomorrow().catch((err) => console.error('Reminder scheduler error:', err));
  }, intervalMs);
};
