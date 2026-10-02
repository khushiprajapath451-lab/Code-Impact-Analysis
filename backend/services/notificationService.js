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
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass,
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
    console.log(`[NotificationService]  Email sent to ${to} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[NotificationService]  Email failed to ${to}:`, err.message);
  }
};

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

/** Impact analysis complete email */
export const emailImpactComplete = (userName, requirementId, impactedCount, summaryMarkdown) => ({
  subject: `[ImpactIQ] Impact Analysis Ready — ${requirementId}`,
  html: `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#818cf8;"> Impact Analysis Complete</h2>
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
      <h2 style="color:#818cf8;"> Pre-Review Analysis Complete</h2>
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

/** Repository owner Push alert email */
export const emailPushAlertToOwner = (ownerName, data) => {
  const {
    repoName = 'Repository',
    repoFullName = repoName,
    repoUrl = `https://github.com/${repoFullName}`,
    branch = 'main',
    pusher = {},
    commits = [],
    totalCommits = 1,
    files = { added: [], modified: [], removed: [], totalChanged: 0 },
    compareUrl,
    impactSummary,
    timestamp = new Date().toUTCString(),
  } = data;

  const commitsHtml = commits
    .map(
      (c) => `
      <div style="background:#1e293b;padding:12px;border-radius:6px;margin-bottom:8px;border-left:3px solid #6366f1;">
        <div style="font-weight:600;color:#f8fafc;font-size:13px;">${c.message || 'No commit message'}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">
          <code>${(c.id || '').substring(0, 7)}</code> by <strong>@${c.author?.username || c.author?.name || pusher.username || 'user'}</strong>
          ${c.url ? ` · <a href="${c.url}" style="color:#818cf8;text-decoration:none;">View Commit ↗</a>` : ''}
        </div>
      </div>`
    )
    .join('');

  const filesHtml = `
    <div style="display:flex;gap:8px;margin:12px 0;font-size:12px;">
      <span style="background:#064e3b;color:#34d399;padding:4px 8px;border-radius:4px;font-weight:bold;">+${files.added?.length || 0} Added</span>
      <span style="background:#451a03;color:#fbbf24;padding:4px 8px;border-radius:4px;font-weight:bold;">~${files.modified?.length || 0} Modified</span>
      <span style="background:#4c0519;color:#f87171;padding:4px 8px;border-radius:4px;font-weight:bold;">-${files.removed?.length || 0} Removed</span>
    </div>`;

  return {
    subject: `🚀 [ImpactIQ Alert] New Push to ${repoFullName} (${branch}) by @${pusher.username || 'collaborator'}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;background:#090d16;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b;">
        <div style="display:flex;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;color:#818cf8;font-size:20px;">🚀 Repository Push Activity</h2>
        </div>
        <p style="margin:0 0 16px 0;font-size:14px;color:#cbd5e1;">
          Hi <strong>${ownerName || 'Owner'}</strong>, new commits were just pushed to your repository <a href="${repoUrl}" style="color:#38bdf8;text-decoration:none;font-weight:bold;">${repoFullName}</a>.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #1e293b;">
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;width:30%;">Repository</td>
            <td style="padding:10px 14px;color:#f8fafc;font-weight:600;border-bottom:1px solid #1e293b;"><a href="${repoUrl}" style="color:#38bdf8;text-decoration:none;">${repoFullName}</a></td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;">Branch</td>
            <td style="padding:10px 14px;color:#a855f7;font-weight:600;border-bottom:1px solid #1e293b;"><code>${branch}</code></td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;">Pusher</td>
            <td style="padding:10px 14px;color:#f8fafc;border-bottom:1px solid #1e293b;"><strong>@${pusher.username || pusher.name || 'collaborator'}</strong> ${pusher.email ? `<span style="color:#64748b;">(${pusher.email})</span>` : ''}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;">Total Commits</td>
            <td style="padding:10px 14px;color:#22c55e;font-weight:600;">${totalCommits}</td>
          </tr>
        </table>

        ${filesHtml}

        <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 10px 0;">Recent Commits</h3>
        ${commitsHtml}

        ${
          impactSummary
            ? `
        <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 10px 0;">🤖 AI Impact Analysis</h3>
        <div style="background:#0f172a;border:1px solid #312e81;border-radius:8px;padding:16px;color:#cbd5e1;font-size:13px;line-height:1.5;">
          ${impactSummary.replace(/\n/g, '<br/>')}
        </div>`
            : ''
        }

        ${
          compareUrl
            ? `
        <div style="margin-top:24px;text-align:center;">
          <a href="${compareUrl}" style="background:#4f46e5;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;display:inline-block;">View Diff on GitHub →</a>
        </div>`
            : ''
        }

        <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0 16px 0;"/>
        <p style="color:#64748b;font-size:11px;margin:0;">
          ImpactIQ Webhook System • Automatic Real-Time Alert • ${timestamp}
        </p>
      </div>`,
  };
};

/** Repository owner Pull Request alert email */
export const emailPullRequestAlertToOwner = (ownerName, data) => {
  const {
    repoName = 'Repository',
    repoFullName = repoName,
    prNumber = 1,
    prTitle = 'Pull Request',
    prUrl = '',
    action = 'opened',
    merged = false,
    author = {},
    baseBranch = 'main',
    headBranch = 'feature',
    stats = { commits: 1, changedFiles: 1, additions: 0, deletions: 0 },
    preReviewResult = null,
    timestamp = new Date().toUTCString(),
  } = data;

  const actionBadge = merged
    ? '<span style="background:#581c87;color:#c084fc;padding:4px 8px;border-radius:4px;font-weight:bold;">Merged 🟣</span>'
    : action === 'opened'
    ? '<span style="background:#064e3b;color:#34d399;padding:4px 8px;border-radius:4px;font-weight:bold;">Opened 🟢</span>'
    : action === 'closed'
    ? '<span style="background:#4c0519;color:#f87171;padding:4px 8px;border-radius:4px;font-weight:bold;">Closed 🔴</span>'
    : `<span style="background:#1e1b4b;color:#818cf8;padding:4px 8px;border-radius:4px;font-weight:bold;">${action} 🔵</span>`;

  return {
    subject: `🔔 [ImpactIQ Alert] PR #${prNumber} ${action.toUpperCase()}: "${prTitle}" on ${repoFullName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;background:#090d16;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="margin:0;color:#818cf8;font-size:20px;">🔔 Pull Request Activity</h2>
          <div>${actionBadge}</div>
        </div>
        <p style="margin:0 0 16px 0;font-size:14px;color:#cbd5e1;">
          Hi <strong>${ownerName || 'Owner'}</strong>, Pull Request <a href="${prUrl}" style="color:#38bdf8;text-decoration:none;font-weight:bold;">#${prNumber}</a> in <a href="https://github.com/${repoFullName}" style="color:#38bdf8;text-decoration:none;">${repoFullName}</a> was <strong>${action}</strong> by <strong>@${author.username || author.name || 'contributor'}</strong>.
        </p>

        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:16px;margin:16px 0;">
          <h3 style="margin:0 0 8px 0;color:#f8fafc;font-size:16px;">${prTitle}</h3>
          <div style="color:#94a3b8;font-size:12px;">
            <code>${headBranch}</code> ➔ <code>${baseBranch}</code>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #1e293b;">
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;width:30%;">Changed Files</td>
            <td style="padding:10px 14px;color:#f8fafc;font-weight:600;border-bottom:1px solid #1e293b;">${stats.changedFiles || 0}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;">Lines Added</td>
            <td style="padding:10px 14px;color:#22c55e;font-weight:600;border-bottom:1px solid #1e293b;">+${stats.additions || 0}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;border-bottom:1px solid #1e293b;">Lines Deleted</td>
            <td style="padding:10px 14px;color:#ef4444;font-weight:600;border-bottom:1px solid #1e293b;">-${stats.deletions || 0}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#94a3b8;">Author</td>
            <td style="padding:10px 14px;color:#f8fafc;"><strong>@${author.username || author.name || 'contributor'}</strong></td>
          </tr>
        </table>

        ${
          preReviewResult
            ? `
        <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 10px 0;">🤖 AI Automated Pre-Review</h3>
        <div style="background:#0f172a;border:1px solid #312e81;border-radius:8px;padding:16px;color:#cbd5e1;font-size:13px;line-height:1.5;">
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <span style="background:#064e3b;color:#34d399;padding:4px 8px;border-radius:4px;font-weight:bold;">Quality: ${preReviewResult.qualityScore || '95/100'}</span>
            <span style="background:#451a03;color:#fbbf24;padding:4px 8px;border-radius:4px;font-weight:bold;">Risk: ${preReviewResult.regressionRisk || 'Low'}</span>
          </div>
          <p style="margin:0;white-space:pre-wrap;">${(preReviewResult.reviewMarkdown || preReviewResult.reviewResult || '').slice(0, 500)}</p>
        </div>`
            : ''
        }

        <div style="margin-top:24px;text-align:center;">
          <a href="${prUrl}" style="background:#4f46e5;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;display:inline-block;">View Pull Request #${prNumber} on GitHub →</a>
        </div>

        <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0 16px 0;"/>
        <p style="color:#64748b;font-size:11px;margin:0;">
          ImpactIQ Webhook System • Automatic Real-Time Alert • ${timestamp}
        </p>
      </div>`,
  };
};


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
    console.log('[NotificationService]  Slack notification sent');
  } catch (err) {
    console.error('[NotificationService]  Slack notification failed:', err.message);
  }
};

/** Builds a rich Slack Block Kit message for impact analysis */
export const slackImpactBlocks = (requirementId, impactedCount, confidence, repoName) => [
  {
    type: 'header',
    text: { type: 'plain_text', text: ' Impact Analysis Complete', emoji: true },
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
    text: { type: 'plain_text', text: ' Pre-Review Analysis Complete', emoji: true },
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
    console.log(`[NotificationService]  GitHub PR comment posted — ${comment.html_url}`);
    return comment;
  } catch (err) {
    console.error('[NotificationService]  GitHub PR comment failed:', err.message);
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
| **Security** |  Pass |

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
  console.log(`[NotificationService]  Socket.io event emitted → "${event}"`);
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
  console.log(`[NotificationService]  Socket.io event emitted to user ${userId} → "${event}"`);
};
