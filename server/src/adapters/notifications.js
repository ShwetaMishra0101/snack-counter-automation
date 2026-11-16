import twilio from 'twilio';
import { Notification } from '../models/index.js';

// WhatsApp notification adapter. Three providers, chosen via WHATSAPP_PROVIDER:
//
//   console   (default) — simulation: messages are persisted + logged only.
//   callmebot — FREE real WhatsApp delivery to one registered phone.
//               Setup (once, ~1 minute):
//                 1. Save +34 644 59 71 67 in your phone contacts.
//                 2. WhatsApp it the text: "I allow callmebot to send me messages"
//                 3. It replies with your personal API key.
//                 4. In .env set WHATSAPP_PROVIDER=callmebot,
//                    CALLMEBOT_PHONE=+91XXXXXXXXXX (your number, with country code)
//                    CALLMEBOT_APIKEY=<the key it sent you>
//               Every notification is delivered to that one phone, prefixed with
//               the intended recipient, which is ideal for demos. (CallMeBot is
//               free for personal use only — one key per phone number.)
//   twilio    — Twilio WhatsApp Business API (per-recipient delivery; recipients
//               must join the sandbox on a free trial account).
//
// All providers persist the message to MongoDB so the dashboard feed always works.
export function createNotifier() {
  const provider = process.env.WHATSAPP_PROVIDER || 'console';
  const twilioClient = provider === 'twilio'
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  async function deliver(to, message, meta) {
    if (provider === 'twilio') {
      if (!to) throw new Error('Employee phone number is required for WhatsApp');
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        body: message
      });
      return;
    }
    if (provider === 'callmebot') {
      const phone = process.env.CALLMEBOT_PHONE;
      const apikey = process.env.CALLMEBOT_APIKEY;
      if (!phone || !apikey) throw new Error('Set CALLMEBOT_PHONE and CALLMEBOT_APIKEY in .env');
      // Free personal API: everything goes to the one registered phone,
      // prefixed with who the message was meant for.
      const text = meta.recipientName ? `[for ${meta.recipientName}] ${message}` : message;
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const body = await response.text();
      if (!response.ok || /ERROR/i.test(body)) throw new Error(`CallMeBot: ${body.slice(0, 120)}`);
      return;
    }
    console.log(`[WhatsApp simulation] to=${to || 'not-configured'} :: ${message}`);
  }

  return {
    async send(to, message, meta = {}) {
      let delivered = true;
      try {
        await deliver(to, message, meta);
      } catch (error) {
        delivered = false;
        console.error('[WhatsApp] delivery failed:', error.message);
      }
      await Notification.create({
        channel: 'whatsapp', to: to || '', body: message, delivered,
        recipientName: meta.recipientName || '', refillId: meta.refillId || null,
        kind: meta.kind || 'INFO'
      });
    }
  };
}
