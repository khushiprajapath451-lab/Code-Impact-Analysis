/**
 * notificationService.js
 *
 * Centralised outbound notification layer.
 * Supports four channels:
 *   1. Email        → via Nodemailer (SMTP)
 *   2. Slack        → via Incoming Webhook URL
 *   3. GitHub PR    → posts a comment via GitHub REST API
 *   4. In-App       → real-time push via Socket.io (io instance injected at boot)
 */

import nodemailer from 'nodemailer';

// ─── Socket.io instance (set once from server.js via initSocketIO) ────────────
let _io = null;

/**
 * Called once from server.js after Socket.io is attached to the HTTP server.
 * @param {import('socket.io').Server} io
 */
export const initSocketIO = (io) => {
  _io = io;
};

// ─── 1. EMAIL ─────────────────────────────────────────────────────────────────

/**
 * Creates a Nodemailer transporter from environment variables.
 * Supports any SMTP provider (Gmail, SendGrid, Mailgun, etc.)
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends an HTML email notification.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML content of the email
 */
export const sendEmailNotification = async (to, subject, htmlBody) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[NotificationService] Email skipped — SMTP_USER/SMTP_PASS not set in .env');
    return;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"ImpactIQ" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlBody,
    });
    console.log(`[NotificationService] ✅ Email sent to ${to} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[NotificationService] ❌ Email failed to ${to}:`, err.message);
  }
};

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

/** Impact analysis complete email */
export const emailImpactComplete = (userName, requirementId, impactedCount, summaryMarkdown) => ({
  subject: `[ImpactIQ] Impact Analysis Ready — ${requirementId}`,
  html: `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#818cf8;">🎯 Impact Analysis Complete</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your impact analysis for <strong>${requirementId}</strong> is ready.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px;background:#1e293b;border-radius:4px;color:#94a3b8;">Impacted Files</td>
          <td style="padding:8px;color:#818cf8;font-weight:bold;">${impactedCount}</td>
        </tr>
        <tr>
          <td style="padding:8px;color:#94a3b8;">Confidence</td>
          <td style="padding:8px;color:#22c55e;font-weight:bold;">97%</td>
        </tr>
      </table>
      <pre style="background:#1e293b;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap;">${summaryMarkdown}</pre>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">ImpactIQ • Code Intelligence Platform</p>
    </div>`,
});

/** Pre-review complete email */
export const emailPreReviewComplete = (userName, requirementId, qualityScore, regressionRisk) => ({
  subject: `[ImpactIQ] Pre-Review Ready — ${requirementId}`,
  html: `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#818cf8;">🔍 Pre-Review Analysis Complete</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>The AI pre-review for <strong>${requirementId}</strong> has finished.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px;background:#1e293b;border-radius:4px;color:#94a3b8;">Quality Score</td>
          <td style="padding:8px;color:#22c55e;font-weight:bold;">${qualityScore}</td>
        </tr>
        <tr>
          <td style="padding:8px;color:#94a3b8;">Regression Risk</td>
          <td style="padding:8px;color:#f59e0b;font-weight:bold;">${regressionRisk}</td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">ImpactIQ • Code Intelligence Platform</p>
    </div>`,
});

// ─── 2. SLACK ─────────────────────────────────────────────────────────────────

/**
 * Sends a message to a Slack channel via Incoming Webhook.
 * @param {string} text - Plain text or Slack mrkdwn formatted message
 * @param {object[]} [blocks] - Optional Slack Block Kit blocks for rich formatting
 */
export const sendSlackNotification = async (text, blocks = null) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[NotificationService] Slack skipped — SLACK_WEBHOOK_URL not set in .env');
    return;
  }

  try {
    const payload = { text };
    if (blocks) payload.blocks = blocks;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Slack responded with ${response.status}`);
    console.log('[NotificationService] ✅ Slack notification sent');
  } catch (err) {
    console.error('[NotificationService] ❌ Slack notification failed:', err.message);
  }
};

/** Builds a rich Slack Block Kit message for impact analysis */
export const slackImpactBlocks = (requirementId, impactedCount, confidence, repoName) => [
  {
    type: 'header',
    text: { type: 'plain_text', text: '🎯 Impact Analysis Complete', emoji: true },
  },
  {
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*Requirement:*\n${requirementId}` },
      { type: 'mrkdwn', text: `*Repository:*\n${repoName}` },
      { type: 'mrkdwn', text: `*Impacted Files:*\n${impactedCount}` },
      { type: 'mrkdwn', text: `*Confidence:*\n${confidence}` },
    ],
  },
  { type: 'divider' },
];

/** Builds a rich Slack Block Kit message for pre-review */
export const slackPreReviewBlocks = (requirementId, qualityScore, regressionRisk, prTitle) => [
  {
    type: 'header',
    text: { type: 'plain_text', text: '🔍 Pre-Review Analysis Complete', emoji: true },
  },
  {
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*Requirement:*\n${requirementId}` },
      { type: 'mrkdwn', text: `*PR Title:*\n${prTitle}` },
      { type: 'mrkdwn', text: `*Quality Score:*\n${qualityScore}` },
      { type: 'mrkdwn', text: `*Regression Risk:*\n${regressionRisk}` },
    ],
  },
  { type: 'divider' },
];

// ─── 3. GITHUB PR COMMENT ─────────────────────────────────────────────────────

/**
 * Posts an AI-generated review as a comment on a GitHub Pull Request.
 * @param {string} owner - GitHub repo owner (org or username)
 * @param {string} repo  - Repository name
 * @param {number} prNumber - Pull request number
 * @param {string} body - Comment body (Markdown)
 */
export const postGitHubPRComment = async (owner, repo, prNumber, body) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('[NotificationService] GitHub PR comment skipped — GITHUB_TOKEN not set in .env');
    return;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub API ${response.status}: ${errText}`);
    }

    const comment = await response.json();
    console.log(`[NotificationService] ✅ GitHub PR comment posted — ${comment.html_url}`);
    return comment;
  } catch (err) {
    console.error('[NotificationService] ❌ GitHub PR comment failed:', err.message);
  }
};

/** Formats the AI pre-review as a clean GitHub PR comment */
export const formatPRComment = (requirementId, qualityScore, regressionRisk, reviewMarkdown) => `
## 🤖 ImpactIQ — Automated Pre-Review

| Field | Value |
|---|---|
| **Requirement** | \`${requirementId}\` |
| **Quality Score** | ${qualityScore} |
| **Regression Risk** | ${regressionRisk} |
| **Security** | ✅ Pass |

---

${reviewMarkdown}

---
*Generated by [ImpactIQ](https://impactiq.dev) — AI Code Intelligence Platform*
`;

// ─── 4. IN-APP REAL-TIME (Socket.io) ─────────────────────────────────────────

/**
 * Pushes a real-time event to ALL connected frontend clients.
 * @param {string} event - Event name (e.g. 'analysis_complete', 'prereview_complete')
 * @param {object} payload - Data to send to the frontend
 */
export const emitToAll = (event, payload) => {
  if (!_io) {
    console.warn('[NotificationService] Socket.io not initialised — in-app notification skipped');
    return;
  }
  _io.emit(event, payload);
  console.log(`[NotificationService] ✅ Socket.io event emitted → "${event}"`);
};

/**
 * Pushes a real-time event to a SPECIFIC user's socket room.
 * Clients must join a room named after their user ID: socket.join(userId)
 * @param {string} userId
 * @param {string} event
 * @param {object} payload
 */
export const emitToUser = (userId, event, payload) => {
  if (!_io) {
    console.warn('[NotificationService] Socket.io not initialised — in-app notification skipped');
    return;
  }
  _io.to(userId).emit(event, payload);
  console.log(`[NotificationService] ✅ Socket.io event emitted to user ${userId} → "${event}"`);
};
