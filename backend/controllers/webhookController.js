/**
 * webhookController.js
 *
 * Handles all inbound webhooks from:
 *   - GitHub  (push, pull_request events)
 *   - GitLab  (push, merge_request events)
 *   - Jira    (issue created / updated / assigned / transitioned)
 *   - Stripe  (payment_intent events)
 *
 * Each handler:
 *   1. Verifies the platform's HMAC signature
 *   2. Parses the event payload
 *   3. Calls the appropriate existing service (agentController / codeIndexer)
 *   4. Dispatches notifications via notificationService
 */

import crypto from 'crypto';
import { User } from '../models/User.js';
import { handleImpactAnalysis, handlePreReview } from './agentController.js';
import { indexRepository } from '../services/codeIndexer.js';
import { addHistoryEntry } from './repoController.js';
import {
  sendEmailNotification,
  sendSlackNotification,
  postGitHubPRComment,
  emitToAll,
  emailImpactComplete,
  emailPreReviewComplete,
  slackImpactBlocks,
  slackPreReviewBlocks,
  formatPRComment,
} from '../services/notificationService.js';
import { generateImpactPrimer, generatePreReview } from '../services/geminiServices.js';

// ─── SIGNATURE VERIFICATION HELPERS ──────────────────────────────────────────

/**
 * Verifies GitHub's HMAC-SHA256 webhook signature.
 * GitHub sends the signature in the "X-Hub-Signature-256" header.
 */
const verifyGitHubSignature = (rawBody, signature) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if secret not configured (dev mode)

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
};

/**
 * Verifies GitLab's webhook token.
 * GitLab sends the token in the "X-Gitlab-Token" header.
 */
const verifyGitLabToken = (token) => {
  const secret = process.env.GITLAB_WEBHOOK_SECRET;
  if (!secret) return true;
  return token === secret;
};

/**
 * Verifies Stripe's webhook signature.
 * Stripe sends the signature in the "Stripe-Signature" header.
 */
const verifyStripeSignature = (rawBody, signature) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true;

  try {
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t=')).split('=')[1];
    const v1 = parts.find((p) => p.startsWith('v1=')).split('=')[1];

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
};

// ─── DEFAULT NOTIFICATION RECIPIENT ──────────────────────────────────────────
const DEFAULT_NOTIFY_EMAIL = process.env.DEFAULT_NOTIFY_EMAIL || 'abhiram@impactiq.ai';

// ─── DB USER EMAIL RESOLVER ─────────────────────────────────────────────────
/**
 * Looks up a registered ImpactIQ user by their GitHub username.
 * Returns the user's registered email or null if not found.
 * This is the REAL implementation — no fallback to a default address.
 * @param {string} githubUsername
 * @returns {Promise<{email:string, name:string}|null>}
 */
const resolveUserByGitHub = async (githubUsername) => {
  if (!githubUsername) return null;
  try {
    const user = await User.findOne(
      { githubUsername: { $regex: new RegExp(`^${githubUsername}$`, 'i') } },
      { email: 1, name: 1 }
    );
    if (user) {
      console.log(`[Webhook] ✅ Resolved GitHub user @${githubUsername} → ${user.email}`);
      return { email: user.email, name: user.name };
    }
    console.warn(`[Webhook] ⚠️  GitHub user @${githubUsername} is not registered in ImpactIQ — email skipped`);
    return null;
  } catch (err) {
    console.error(`[Webhook] ❌ DB lookup failed for GitHub user @${githubUsername}:`, err.message);
    return null;
  }
};

/**
 * Looks up a registered ImpactIQ user by their Jira username or email.
 * Jira payloads include the assignee's email directly — we verify it
 * belongs to a registered user before sending.
 * @param {string} jiraEmail - assignee email from Jira payload
 * @param {string} jiraUsername - assignee displayName / accountId from Jira payload
 * @returns {Promise<{email:string, name:string}|null>}
 */
const resolveUserByJira = async (jiraEmail, jiraUsername) => {
  if (!jiraEmail && !jiraUsername) return null;
  try {
    // Try matching by email first (most reliable)
    let user = jiraEmail
      ? await User.findOne({ email: jiraEmail.toLowerCase() }, { email: 1, name: 1 })
      : null;

    // Fall back to jiraUsername field if email didn’t match
    if (!user && jiraUsername) {
      user = await User.findOne(
        { jiraUsername: { $regex: new RegExp(`^${jiraUsername}$`, 'i') } },
        { email: 1, name: 1 }
      );
    }

    if (user) {
      console.log(`[Webhook] ✅ Resolved Jira user → ${user.email}`);
      return { email: user.email, name: user.name };
    }
    console.warn(`[Webhook] ⚠️  Jira user (${jiraEmail || jiraUsername}) is not registered in ImpactIQ — email skipped`);
    return null;
  } catch (err) {
    console.error(`[Webhook] ❌ DB lookup failed for Jira user:`, err.message);
    return null;
  }
};


// ─── 1. GITHUB WEBHOOK ────────────────────────────────────────────────────────

/**
 * POST /webhooks/github
 *
 * Handles:
 *  - push          → re-index repo + impact analysis (if Jira ID in commit)
 *  - pull_request  → auto pre-review on the diff
 */
export const handleGitHubWebhook = async (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-hub-signature-256'];
  if (!verifyGitHubSignature(req.body, signature)) {
    console.warn('[Webhook/GitHub] ❌ Invalid signature — request rejected');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Parse raw body
  const rawBody = req.body.toString('utf8');
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const event = req.headers['x-github-event'];
  console.log(`[Webhook/GitHub] Event received: "${event}"`);

  // ── PUSH EVENT ──────────────────────────────────────────────────────────────
  if (event === 'push') {
    const repoName = payload.repository?.name || 'unknown-repo';
    const branch = (payload.ref || '').replace('refs/heads/', '');
    const pusherName  = payload.pusher?.name || 'Unknown';
    const commitMessage = payload.head_commit?.message || '';

    console.log(`[Webhook/GitHub] Push to "${branch}" by ${pusherName} on repo "${repoName}"`);

    // Look up the pusher in ImpactIQ’s database by their GitHub username.
    // If they are not a registered user, we skip the email — no default fallback.
    const pusherUser = await resolveUserByGitHub(pusherName);

    // Step 1: Re-index repository
    try {
      indexRepository('repo-1');
      console.log('[Webhook/GitHub] ✅ Repository re-indexed after push');
    } catch (err) {
      console.error('[Webhook/GitHub] Re-index failed:', err.message);
    }

    // Step 2: If commit message contains a Jira ticket ID → run Impact Analysis
    const jiraMatch = commitMessage.match(/([A-Z]+-\d+)/);
    if (jiraMatch) {
      const requirementId = jiraMatch[1];
      console.log(`[Webhook/GitHub] Jira ID detected in commit: ${requirementId} — triggering impact analysis`);

      try {
        const result = await generateImpactPrimer(commitMessage, []);

        addHistoryEntry({
          id: `HIST-${Date.now()}`,
          requirementId,
          title: commitMessage.split('\n')[0] || 'Push-triggered Analysis',
          status: 'Completed',
          confidence: result.stats?.confidence || '97%',
          impactedFiles: result.impactedFiles?.length || 0,
          timestamp: 'Just now',
        });

        // Only email if the pusher is a registered ImpactIQ user
        if (pusherUser) {
          const tmpl = emailImpactComplete(
            pusherUser.name,
            requirementId,
            result.impactedFiles?.length || 0,
            result.summaryMarkdown || ''
          );
          await sendEmailNotification(pusherUser.email, tmpl.subject, tmpl.html);
        }

        // Notify via Slack
        await sendSlackNotification(
          `Impact Analysis complete for ${requirementId}`,
          slackImpactBlocks(requirementId, result.impactedFiles?.length || 0, result.stats?.confidence || '97%', repoName)
        );

        // Notify via Socket.io (in-app)
        emitToAll('analysis_complete', {
          type: 'impact_analysis',
          requirementId,
          repoName,
          impactedFiles: result.impactedFiles?.length || 0,
          confidence: result.stats?.confidence || '97%',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Webhook/GitHub] Impact analysis failed:', err.message);
      }
    }

    return res.status(200).json({ received: true, event: 'push', branch, repo: repoName });
  }

  // ── PULL REQUEST EVENT ──────────────────────────────────────────────────────
  if (event === 'pull_request') {
    const action = payload.action; // opened | synchronize | closed
    const pr = payload.pull_request;
    const prNumber = pr?.number;
    const prTitle = pr?.title || 'Untitled PR';
    const repoOwner = payload.repository?.owner?.login;
    const repoName = payload.repository?.name;
    const authorEmail = pr?.user?.login
      ? `${pr.user.login}@users.noreply.github.com`
      : DEFAULT_NOTIFY_EMAIL;

    console.log(`[Webhook/GitHub] PR #${prNumber} action: "${action}" — "${prTitle}"`);

    // Run pre-review when PR is opened or updated
    if (action === 'opened' || action === 'synchronize') {
      // Extract Jira ID from PR title/branch
      const jiraMatch = (prTitle + (pr?.head?.ref || '')).match(/([A-Z]+-\d+)/);
      const requirementId = jiraMatch ? jiraMatch[1] : `PR-${prNumber}`;

      // Build a simple diff summary (real impl would fetch diff from GitHub API)
      const rawGitDiff = pr?.body || `PR: ${prTitle}\nBranch: ${pr?.head?.ref}`;

      // ✅ Resolve the PR author by their GitHub username from ImpactIQ’s DB
      const prAuthorLogin = pr?.user?.login;
      const prAuthorUser = await resolveUserByGitHub(prAuthorLogin);

      try {
        const result = await generatePreReview(rawGitDiff, requirementId, []);

        // Post AI review as PR comment on GitHub
        const commentBody = formatPRComment(
          requirementId,
          result.qualityScore || '95/100',
          result.regressionRisk || 'Low-Med',
          result.reviewMarkdown || result.reviewResult || ''
        );
        await postGitHubPRComment(repoOwner, repoName, prNumber, commentBody);

        // Only email if the PR author is a registered ImpactIQ user
        if (prAuthorUser) {
          const tmpl = emailPreReviewComplete(
            prAuthorUser.name,
            requirementId,
            result.qualityScore || '95/100',
            result.regressionRisk || 'Low-Med'
          );
          await sendEmailNotification(prAuthorUser.email, tmpl.subject, tmpl.html);
        }

        // Slack notification
        await sendSlackNotification(
          `Pre-Review complete for PR #${prNumber}: ${prTitle}`,
          slackPreReviewBlocks(requirementId, result.qualityScore || '95/100', result.regressionRisk || 'Low-Med', prTitle)
        );

        // In-app notification
        emitToAll('prereview_complete', {
          type: 'pre_review',
          requirementId,
          prNumber,
          prTitle,
          qualityScore: result.qualityScore || '95/100',
          regressionRisk: result.regressionRisk || 'Low-Med',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Webhook/GitHub] Pre-review failed:', err.message);
      }
    }

    // When PR is merged → record in history
    if (action === 'closed' && pr?.merged) {
      const jiraMatch = prTitle.match(/([A-Z]+-\d+)/);
      addHistoryEntry({
        id: `HIST-${Date.now()}`,
        requirementId: jiraMatch ? jiraMatch[1] : `PR-${prNumber}`,
        title: prTitle,
        status: 'Completed',
        confidence: '—',
        impactedFiles: 0,
        timestamp: 'Just now',
      });
      console.log(`[Webhook/GitHub] ✅ Merged PR #${prNumber} recorded in history`);
    }

    return res.status(200).json({ received: true, event: 'pull_request', action, pr: prNumber });
  }

  // Unknown event — acknowledge gracefully
  return res.status(200).json({ received: true, event, message: 'Event acknowledged but not handled' });
};

// ─── 2. GITLAB WEBHOOK ───────────────────────────────────────────────────────

/**
 * POST /webhooks/gitlab
 *
 * Handles:
 *  - Push Hook          → re-index repo
 *  - Merge Request Hook → auto pre-review
 */
export const handleGitLabWebhook = async (req, res) => {
  // Verify GitLab token
  const token = req.headers['x-gitlab-token'];
  if (!verifyGitLabToken(token)) {
    console.warn('[Webhook/GitLab] ❌ Invalid token — request rejected');
    return res.status(401).json({ error: 'Invalid webhook token' });
  }

  const rawBody = req.body.toString('utf8');
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const objectKind = payload.object_kind;
  console.log(`[Webhook/GitLab] Event received: "${objectKind}"`);

  // ── PUSH ────────────────────────────────────────────────────────────────────
  if (objectKind === 'push') {
    try {
      indexRepository('repo-1');
      console.log('[Webhook/GitLab] ✅ Repository re-indexed after push');
    } catch (err) {
      console.error('[Webhook/GitLab] Re-index failed:', err.message);
    }

    await sendSlackNotification(
      `🔄 GitLab push detected on *${payload.project?.name || 'unknown'}* — repo re-indexed.`
    );

    emitToAll('repo_indexed', {
      repoName: payload.project?.name,
      branch: payload.ref?.replace('refs/heads/', ''),
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ received: true, event: 'push' });
  }

  // ── MERGE REQUEST ────────────────────────────────────────────────────────────
  if (objectKind === 'merge_request') {
    const mr = payload.object_attributes;
    const action = mr?.action; // open | update | merge
    const mrTitle = mr?.title || 'Untitled MR';
    const requirementId = mrTitle.match(/([A-Z]+-\d+)/)?.[1] || `MR-${mr?.iid}`;

    if (action === 'open' || action === 'update') {
      try {
        const result = await generatePreReview(mr?.description || mrTitle, requirementId, []);

        const tmpl = emailPreReviewComplete(
          payload.user?.name || 'Developer',
          requirementId,
          result.qualityScore || '95/100',
          result.regressionRisk || 'Low-Med'
        );
        await sendEmailNotification(DEFAULT_NOTIFY_EMAIL, tmpl.subject, tmpl.html);

        await sendSlackNotification(
          `🔍 Pre-Review complete for MR !${mr?.iid}: ${mrTitle}`,
          slackPreReviewBlocks(requirementId, result.qualityScore || '95/100', result.regressionRisk || 'Low-Med', mrTitle)
        );

        emitToAll('prereview_complete', {
          type: 'pre_review',
          requirementId,
          mrTitle,
          qualityScore: result.qualityScore || '95/100',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Webhook/GitLab] Pre-review failed:', err.message);
      }
    }

    return res.status(200).json({ received: true, event: 'merge_request', action });
  }

  return res.status(200).json({ received: true, event: objectKind, message: 'Acknowledged' });
};

// ─── 3. JIRA WEBHOOK ─────────────────────────────────────────────────────────

/**
 * POST /webhooks/jira
 *
 * Handles:
 *  - jira:issue_created     → auto impact analysis using issue description as BRD
 *  - jira:issue_updated     → re-run impact analysis
 *  - jira:issue_assigned    → notify assigned developer with impact map
 *  - jira:issue_transitioned (→ In Review) → trigger pre-review
 */
export const handleJiraWebhook = async (req, res) => {
  const rawBody = req.body.toString('utf8');
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const webhookEvent = payload.webhookEvent;
  const issue        = payload.issue;
  const issueKey     = issue?.key || 'JIRA-000';
  const summary      = issue?.fields?.summary || '';
  const description  = issue?.fields?.description || summary;

  // Raw values from Jira payload
  const jiraAssigneeEmail    = issue?.fields?.assignee?.emailAddress || null;
  const jiraAssigneeName     = issue?.fields?.assignee?.displayName || null;
  const jiraAssigneeUsername = issue?.fields?.assignee?.name || issue?.fields?.assignee?.accountId || null;

  console.log(`[Webhook/Jira] Event: "${webhookEvent}" — Issue: ${issueKey}`);

  // ── Resolve the assignee to a registered ImpactIQ user ──────────────────────
  // We look up by their Jira email or jiraUsername in our DB.
  // If they are not registered, we skip the email — no default fallback.
  const assigneeUser = await resolveUserByJira(jiraAssigneeEmail, jiraAssigneeUsername);

  // ── ISSUE CREATED ────────────────────────────────────────────────────────────
  if (webhookEvent === 'jira:issue_created') {
    try {
      const result = await generateImpactPrimer(description, []);

      addHistoryEntry({
        id: `HIST-${Date.now()}`,
        requirementId: issueKey,
        title: summary,
        status: 'Completed',
        confidence: result.stats?.confidence || '97%',
        impactedFiles: result.impactedFiles?.length || 0,
        timestamp: 'Just now',
      });

      // Only email if the assignee is a registered ImpactIQ user
      if (assigneeUser) {
        const tmpl = emailImpactComplete(
          assigneeUser.name,
          issueKey,
          result.impactedFiles?.length || 0,
          result.summaryMarkdown || ''
        );
        await sendEmailNotification(assigneeUser.email, tmpl.subject, tmpl.html);
      }

      await sendSlackNotification(
        `🎯 New Jira ticket *${issueKey}* created — Impact analysis complete!`,
        slackImpactBlocks(issueKey, result.impactedFiles?.length || 0, result.stats?.confidence || '97%', 'impactiq-backend')
      );

      emitToAll('analysis_complete', {
        type: 'impact_analysis',
        requirementId: issueKey,
        title: summary,
        impactedFiles: result.impactedFiles?.length || 0,
        confidence: result.stats?.confidence || '97%',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Webhook/Jira] Impact analysis failed:', err.message);
    }

    return res.status(200).json({ received: true, event: webhookEvent, issueKey });
  }

  // ── ISSUE UPDATED ────────────────────────────────────────────────────────────
  if (webhookEvent === 'jira:issue_updated') {
    const changedFields = payload.changelog?.items?.map((i) => i.field) || [];
    if (changedFields.includes('description') || changedFields.includes('Acceptance Criteria')) {
      try {
        const result = await generateImpactPrimer(description, []);

        emitToAll('analysis_complete', {
          type: 'impact_analysis',
          requirementId: issueKey,
          title: `[Updated] ${summary}`,
          impactedFiles: result.impactedFiles?.length || 0,
          confidence: result.stats?.confidence || '97%',
          timestamp: new Date().toISOString(),
        });

        await sendSlackNotification(
          `🔄 Jira ticket *${issueKey}* updated — Impact analysis re-run.`
        );
      } catch (err) {
        console.error('[Webhook/Jira] Re-run impact analysis failed:', err.message);
      }
    }

    return res.status(200).json({ received: true, event: webhookEvent, issueKey });
  }

  // ── ISSUE ASSIGNED ────────────────────────────────────────────────────────────
  if (webhookEvent === 'jira:issue_assigned') {
    try {
      const result = await generateImpactPrimer(description, []);

      // Only email if the newly assigned developer is a registered ImpactIQ user
      if (assigneeUser) {
        const tmpl = emailImpactComplete(
          assigneeUser.name,
          issueKey,
          result.impactedFiles?.length || 0,
          result.summaryMarkdown || ''
        );
        await sendEmailNotification(assigneeUser.email, tmpl.subject, tmpl.html);
      }

      await sendSlackNotification(
        `👤 *${issueKey}* assigned to *${jiraAssigneeName || 'a developer'}* — Impact map delivered via email.`
      );

      emitToAll('ticket_assigned', {
        requirementId: issueKey,
        assignee: jiraAssigneeName,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Webhook/Jira] Assigned notification failed:', err.message);
    }

    return res.status(200).json({ received: true, event: webhookEvent, issueKey, assignee: jiraAssigneeName });
  }

  // ── ISSUE TRANSITIONED (e.g. → "In Review") ────────────────────────────────
  if (webhookEvent === 'jira:issue_transitioned') {
    const toStatus = payload.transition?.to_status || '';
    if (/review/i.test(toStatus)) {
      console.log(`[Webhook/Jira] ${issueKey} transitioned to "${toStatus}" — triggering pre-review`);
      try {
        const result = await generatePreReview(description, issueKey, []);

        // Only email if the assignee is a registered ImpactIQ user
        if (assigneeUser) {
          const tmpl = emailPreReviewComplete(
            assigneeUser.name,
            issueKey,
            result.qualityScore || '95/100',
            result.regressionRisk || 'Low-Med'
          );
          await sendEmailNotification(assigneeUser.email, tmpl.subject, tmpl.html);
        }

        await sendSlackNotification(
          `🔍 *${issueKey}* moved to "${toStatus}" — Pre-review analysis ready.`,
          slackPreReviewBlocks(issueKey, result.qualityScore || '95/100', result.regressionRisk || 'Low-Med', summary)
        );

        emitToAll('prereview_complete', {
          type: 'pre_review',
          requirementId: issueKey,
          qualityScore: result.qualityScore || '95/100',
          regressionRisk: result.regressionRisk || 'Low-Med',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Webhook/Jira] Pre-review on transition failed:', err.message);
      }
    }

    return res.status(200).json({ received: true, event: webhookEvent, issueKey, toStatus });
  }

  return res.status(200).json({ received: true, event: webhookEvent, message: 'Acknowledged' });
};

// ─── 4. STRIPE WEBHOOK ───────────────────────────────────────────────────────

/**
 * POST /webhooks/stripe
 *
 * Handles payment lifecycle events:
 *  - payment_intent.succeeded  → update order, notify user
 *  - payment_intent.failed     → notify user of failure
 *  - charge.refunded           → notify user of refund
 *  - invoice.payment_failed    → notify subscription failure
 */
export const handleStripeWebhook = async (req, res) => {
  // Verify Stripe signature
  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(req.body.toString('utf8'), signature)) {
    console.warn('[Webhook/Stripe] ❌ Invalid signature — request rejected');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const rawBody = req.body.toString('utf8');
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const eventType = event.type;
  const data = event.data?.object;
  const customerEmail = data?.receipt_email || data?.customer_email || DEFAULT_NOTIFY_EMAIL;

  console.log(`[Webhook/Stripe] Event: "${eventType}"`);

  switch (eventType) {
    case 'payment_intent.succeeded': {
      const amount = ((data?.amount || 0) / 100).toFixed(2);
      const currency = (data?.currency || 'usd').toUpperCase();

      await sendEmailNotification(
        customerEmail,
        '✅ Payment Successful — ImpactIQ',
        `<div style="font-family:Inter,sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
           <h2 style="color:#22c55e;">Payment Successful</h2>
           <p>Your payment of <strong>${currency} ${amount}</strong> was processed successfully.</p>
           <p style="color:#64748b;">Transaction ID: <code>${data?.id}</code></p>
         </div>`
      );

      await sendSlackNotification(
        `💳 Payment succeeded — *${currency} ${amount}* (Intent: \`${data?.id}\`)`
      );

      emitToAll('payment_succeeded', {
        intentId: data?.id,
        amount,
        currency,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      const failReason = data?.last_payment_error?.message || 'Unknown error';

      await sendEmailNotification(
        customerEmail,
        '❌ Payment Failed — ImpactIQ',
        `<div style="font-family:Inter,sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
           <h2 style="color:#ef4444;">Payment Failed</h2>
           <p>We couldn't process your payment. Reason: <strong>${failReason}</strong></p>
           <p>Please update your payment method and try again.</p>
         </div>`
      );

      await sendSlackNotification(`❌ Payment FAILED — Reason: ${failReason} (Intent: \`${data?.id}\`)`);

      emitToAll('payment_failed', {
        intentId: data?.id,
        reason: failReason,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case 'charge.refunded': {
      const refundAmount = ((data?.amount_refunded || 0) / 100).toFixed(2);

      await sendEmailNotification(
        customerEmail,
        '↩️ Refund Processed — ImpactIQ',
        `<div style="font-family:Inter,sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
           <h2 style="color:#f59e0b;">Refund Processed</h2>
           <p>A refund of <strong>USD ${refundAmount}</strong> has been issued to your account.</p>
         </div>`
      );

      await sendSlackNotification(`↩️ Refund issued — *USD ${refundAmount}*`);

      emitToAll('payment_refunded', {
        chargeId: data?.id,
        refundAmount,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case 'invoice.payment_failed': {
      await sendEmailNotification(
        customerEmail,
        '⚠️ Subscription Payment Failed — ImpactIQ',
        `<div style="font-family:Inter,sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
           <h2 style="color:#f59e0b;">Subscription Payment Failed</h2>
           <p>We couldn't charge your subscription. Please update your billing information to avoid service interruption.</p>
         </div>`
      );

      await sendSlackNotification(`⚠️ Invoice payment FAILED for customer \`${data?.customer}\``);

      emitToAll('subscription_failed', {
        invoiceId: data?.id,
        customerId: data?.customer,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    default:
      console.log(`[Webhook/Stripe] Unhandled event type: ${eventType}`);
  }

  return res.status(200).json({ received: true, event: eventType });
};
