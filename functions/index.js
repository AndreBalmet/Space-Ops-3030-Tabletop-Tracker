// Space-Ops 3030 — MailerLite promo relay (Phase 7 of the accounts plan).
//
// When a new account profile is created at /users/<uid> with
// promoConsent: true, push the email to the MailerLite subscriber list.
// One-way, fire-once: unsubscribes are handled entirely by MailerLite's
// own links + suppression list (decided 2026-07-08), so nothing here ever
// removes or re-adds anyone.
//
// The MailerLite API token lives in Cloud Secret Manager (MAILERLITE_TOKEN),
// set by Andre via `firebase functions:secrets:set` — never in the repo.

const { onValueCreated } = require('firebase-functions/v2/database');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

const MAILERLITE_TOKEN = defineSecret('MAILERLITE_TOKEN');

exports.promoRelay = onValueCreated(
  {
    ref: '/users/{uid}',
    instance: 'space-ops-3030-default-rtdb',
    secrets: [MAILERLITE_TOKEN],
    retry: false,
  },
  async (event) => {
    const user = event.data.val();
    if (!user || user.promoConsent !== true || !user.email) {
      logger.info('promoRelay: no consent or no email — skipping', { uid: event.params.uid });
      return;
    }
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${MAILERLITE_TOKEN.value()}`,
      },
      body: JSON.stringify({
        email: user.email,
        fields: { name: user.username || '' },
        // Idempotent on MailerLite's side: posting an existing email updates
        // it rather than duplicating, and suppressed (unsubscribed) addresses
        // stay unsubscribed.
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('promoRelay: MailerLite rejected subscriber', {
        uid: event.params.uid,
        status: res.status,
        body: body.slice(0, 300),
      });
      return;
    }
    logger.info('promoRelay: subscribed', { uid: event.params.uid });
  }
);
