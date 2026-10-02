/**
 * test_webhooks.js
 *
 * Automated Webhook & Integration Test Suite.
 * Tests:
 *  1. Webhook health check
 *  2. Push webhook simulation
 *  3. Pull Request webhook simulation
 *  4. Real HMAC-SHA256 Signed GitHub Push event
 *  5. Real HMAC-SHA256 Signed GitHub PR event
 *  6. GitLab push webhook event
 *  7. Jira issue created webhook event
 *  8. Stripe payment webhook event
 *  9. GitHub Repos API endpoint
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5000';
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'ec7f91ede1f8a3ef8e38581c9303d0df95a228663739cfe7df4a22a137970e49';
const GITLAB_SECRET = process.env.GITLAB_WEBHOOK_SECRET || 'your_gitlab_webhook_secret';
const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_stripe_signing_secret';

const signGitHubPayload = (rawBody, secret) => {
  return `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
};

const signStripePayload = (rawBody, secret) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
};

let passed = 0;
let failed = 0;

const logTest = (name, ok, details = '') => {
  if (ok) {
    passed++;
    console.log(`\x1b[32m✔ PASS\x1b[0m [${name}] ${details}`);
  } else {
    failed++;
    console.log(`\x1b[31m✖ FAIL\x1b[0m [${name}] ${details}`);
  }
};

async function runTests() {
  console.log(`\n========================================`);
  console.log(`🚀 RUNNING WEBHOOK & INTEGRATION TEST SUITE`);
  console.log(`🎯 Target Server: ${BASE_URL}`);
  console.log(`========================================\n`);

  // ── TEST 1: Health Check ──────────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/webhooks/health`);
    const data = await res.json();
    logTest('1. Webhook Health Check', res.ok && data.status === 'online', `Status: ${res.status}`);
  } catch (err) {
    logTest('1. Webhook Health Check', false, `Error: ${err.message}`);
  }

  // ── TEST 2: Push Webhook Simulation ───────────────────────────────────────
  try {
    const payload = {
      event: 'push',
      repo: 'Code-Impact-Analysis-webhook',
      branch: 'main',
      pusher: 'abhiramsadgun94',
      owner: 'abhiramsadgun94',
    };
    const res = await fetch(`${BASE_URL}/webhooks/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    logTest('2. Simulated Push Webhook', res.ok && data.received === true && data.event === 'push', `Repo: ${data.repo}`);
  } catch (err) {
    logTest('2. Simulated Push Webhook', false, `Error: ${err.message}`);
  }

  // ── TEST 3: PR Webhook Simulation ─────────────────────────────────────────
  try {
    const payload = {
      event: 'pull_request',
      repo: 'Code-Impact-Analysis-webhook',
      action: 'opened',
      title: 'feat: add AI webhook integration and real-time alert notifications',
    };
    const res = await fetch(`${BASE_URL}/webhooks/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    logTest('3. Simulated Pull Request Webhook', res.ok && data.received === true && data.event === 'pull_request', `PR #${data.pr}`);
  } catch (err) {
    logTest('3. Simulated Pull Request Webhook', false, `Error: ${err.message}`);
  }

  // ── TEST 4: Real HMAC Signed GitHub Push Webhook ──────────────────────────
  try {
    const pushPayload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: {
        name: 'Code-Impact-Analysis-webhook',
        full_name: 'abhiramsadgun94/Code-Impact-Analysis-webhook',
        html_url: 'https://github.com/abhiramsadgun94/Code-Impact-Analysis-webhook',
        owner: {
          login: 'abhiramsadgun94',
          name: 'Abhiram Sadgun',
        },
      },
      pusher: {
        name: 'abhiramsadgun94',
        email: 'abhiramsadgun94@gmail.com',
      },
      head_commit: {
        id: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        message: 'feat(impact): integrate AI code analyzer with email alerts',
        timestamp: new Date().toISOString(),
        url: 'https://github.com/abhiramsadgun94/Code-Impact-Analysis-webhook/commit/1a2b3c4d',
        author: { name: 'Abhiram Sadgun', email: 'abhiramsadgun94@gmail.com' },
        added: ['backend/services/githubService.js'],
        modified: ['backend/controllers/webhookController.js'],
        removed: [],
      },
      commits: [
        {
          id: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
          message: 'feat(impact): integrate AI code analyzer with email alerts',
          timestamp: new Date().toISOString(),
          url: 'https://github.com/abhiramsadgun94/Code-Impact-Analysis-webhook/commit/1a2b3c4d',
          author: { name: 'Abhiram Sadgun', email: 'abhiramsadgun94@gmail.com' },
          added: ['backend/services/githubService.js'],
          modified: ['backend/controllers/webhookController.js'],
          removed: [],
        },
      ],
    });

    const signature = signGitHubPayload(pushPayload, GITHUB_SECRET);

    const res = await fetch(`${BASE_URL}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': signature,
      },
      body: pushPayload,
    });
    const data = await res.json();
    logTest('4. Signed GitHub Push Webhook (HMAC-SHA256)', res.ok && data.received === true, `Files Changed: ${data.filesChanged}`);
  } catch (err) {
    logTest('4. Signed GitHub Push Webhook (HMAC-SHA256)', false, `Error: ${err.message}`);
  }

  // ── TEST 5: Real HMAC Signed GitHub PR Webhook ────────────────────────────
  try {
    const prPayload = JSON.stringify({
      action: 'opened',
      number: 42,
      repository: {
        name: 'Code-Impact-Analysis-webhook',
        full_name: 'abhiramsadgun94/Code-Impact-Analysis-webhook',
        html_url: 'https://github.com/abhiramsadgun94/Code-Impact-Analysis-webhook',
        owner: {
          login: 'abhiramsadgun94',
          name: 'Abhiram Sadgun',
        },
      },
      pull_request: {
        number: 42,
        title: 'PROJ-101: Implement Automated AI Pre-Review & Webhooks',
        html_url: 'https://github.com/abhiramsadgun94/Code-Impact-Analysis-webhook/pull/42',
        body: 'Pull request adding complete webhook listeners for GitHub, GitLab, Jira, Stripe with owner alerting.',
        user: { login: 'abhiramsadgun94', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' },
        head: { ref: 'feat/webhook-ai-integration' },
        base: { ref: 'main' },
        commits: 3,
        changed_files: 4,
        additions: 150,
        deletions: 20,
      },
      sender: { login: 'abhiramsadgun94' },
    });

    const signature = signGitHubPayload(prPayload, GITHUB_SECRET);

    const res = await fetch(`${BASE_URL}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': signature,
      },
      body: prPayload,
    });
    const data = await res.json();
    logTest('5. Signed GitHub PR Webhook (HMAC-SHA256)', res.ok && data.received === true, `PR #${data.pr}`);
  } catch (err) {
    logTest('5. Signed GitHub PR Webhook (HMAC-SHA256)', false, `Error: ${err.message}`);
  }

  // ── TEST 6: GitLab Webhook ────────────────────────────────────────────────
  try {
    const gitlabPayload = JSON.stringify({
      object_kind: 'push',
      ref: 'refs/heads/main',
      project: { name: 'GitLab-Impact-Analysis' },
      total_commits_count: 2,
    });

    const res = await fetch(`${BASE_URL}/webhooks/gitlab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gitlab-Token': GITLAB_SECRET,
      },
      body: gitlabPayload,
    });
    const data = await res.json();
    logTest('6. GitLab Push Webhook', res.ok && data.received === true, `Project: ${data.project}`);
  } catch (err) {
    logTest('6. GitLab Push Webhook', false, `Error: ${err.message}`);
  }

  // ── TEST 7: Jira Webhook ──────────────────────────────────────────────────
  try {
    const jiraPayload = JSON.stringify({
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'PROJ-204',
        fields: {
          summary: 'Upgrade Payment Flow with Multi-Currency Support',
          description: 'Refactor checkout controller and payment gateway to support EUR and GBP.',
          assignee: {
            displayName: 'Abhiram Sadgun',
            emailAddress: 'abhiramsadgun94@gmail.com',
          },
        },
      },
    });

    const res = await fetch(`${BASE_URL}/webhooks/jira`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jiraPayload,
    });
    const data = await res.json();
    logTest('7. Jira Issue Created Webhook', res.ok && data.received === true, `Key: ${data.issueKey}`);
  } catch (err) {
    logTest('7. Jira Issue Created Webhook', false, `Error: ${err.message}`);
  }

  // ── TEST 8: Stripe Webhook ────────────────────────────────────────────────
  try {
    const stripePayload = JSON.stringify({
      id: `evt_test_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_1234567890',
          amount: 4900,
          currency: 'usd',
          customer: 'cus_test_9876543210',
          receipt_email: 'abhiramsadgun94@gmail.com',
        },
      },
    });

    const signature = signStripePayload(stripePayload, STRIPE_SECRET);

    const res = await fetch(`${BASE_URL}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
      },
      body: stripePayload,
    });
    const data = await res.json();
    logTest('8. Stripe Payment Webhook', res.ok && data.received === true, `Type: ${data.type}`);
  } catch (err) {
    logTest('8. Stripe Payment Webhook', false, `Error: ${err.message}`);
  }

  // ── TEST 9: GitHub Repos API ──────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/github/repos`);
    const data = await res.json();
    logTest('9. GitHub Repos API Integration', res.ok && Array.isArray(data.repos), `Found ${data.repos?.length || 0} repos`);
  } catch (err) {
    logTest('9. GitHub Repos API Integration', false, `Error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
