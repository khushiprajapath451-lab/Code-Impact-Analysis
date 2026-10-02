/**
 * webhookRoutes.js
 *
 * All inbound webhook endpoints.
 *
 * ⚠️  IMPORTANT: These routes MUST be mounted in server.js with
 *     express.raw({ type: 'application/json' }) middleware BEFORE express.json().
 *     This is required for HMAC signature verification (GitHub, Stripe).
 *
 *  Endpoints:
 *   POST /webhooks/github    — GitHub push & pull_request events
 *   POST /webhooks/gitlab    — GitLab push & merge_request events
 *   POST /webhooks/jira      — Jira issue lifecycle events
 *   POST /webhooks/stripe    — Stripe payment events
 *   POST /webhooks/simulate  — Simulate GitHub push / PR webhook for testing
 *   POST /webhooks/test      — Alias for /webhooks/simulate
 *   GET  /webhooks/health    — Health check endpoint
 */

import express from 'express';
import {
  handleGitHubWebhook,
  handleSimulateWebhook,
  handleGitLabWebhook,
  handleJiraWebhook,
  handleStripeWebhook,
} from '../controllers/webhookController.js';

const router = express.Router();

// ── GitHub ────────────────────────────────────────────────────────────────────
// Configure in GitHub repo → Settings → Webhooks
// Events: Push, Pull Request
router.post('/github', handleGitHubWebhook);

// ── Simulation & Test Endpoints ───────────────────────────────────────────────
router.post('/simulate', handleSimulateWebhook);
router.post('/test', handleSimulateWebhook);

// ── GitLab ────────────────────────────────────────────────────────────────────
// Configure in GitLab project → Settings → Webhooks
// Events: Push events, Merge request events
router.post('/gitlab', handleGitLabWebhook);

// ── Jira ──────────────────────────────────────────────────────────────────────
// Configure in Jira → Project Settings → Webhooks
// Events: Issue Created, Issue Updated, Issue Transitioned
router.post('/jira', handleJiraWebhook);

// ── Stripe ────────────────────────────────────────────────────────────────────
// Configure in Stripe Dashboard → Developers → Webhooks
// Events: payment_intent.succeeded, payment_intent.payment_failed,
//         charge.refunded, invoice.payment_failed
router.post('/stripe', handleStripeWebhook);

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'Webhook listener is active',
    endpoints: {
      github: 'POST /webhooks/github',
      simulate: 'POST /webhooks/simulate',
      test: 'POST /webhooks/test',
      gitlab: 'POST /webhooks/gitlab',
      jira:   'POST /webhooks/jira',
      stripe: 'POST /webhooks/stripe',
    },
  });
});

export default router;
