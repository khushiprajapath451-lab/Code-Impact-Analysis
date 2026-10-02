/**
 * githubController.js
 *
 * Handles automated GitHub integration requests:
 *  - Listing user repositories directly from GitHub
 *  - 1-Click programmatic Webhook installation (zero manual entry on GitHub)
 *  - Bulk auto-syncing webhooks across all repositories
 */

import {
  listUserRepositories,
  autoInstallWebhook,
  getRepositoryWebhookStatus,
} from '../services/githubService.js';
import { getRepositories, registerConnectedRepository } from '../services/codeIndexer.js';

const resolveWebhookBaseUrl = (req, explicitUrl) => {
  if (explicitUrl && explicitUrl.startsWith('http')) {
    return explicitUrl;
  }
  if (process.env.WEBHOOK_BASE_URL && process.env.WEBHOOK_BASE_URL.startsWith('http')) {
    return process.env.WEBHOOK_BASE_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
};

/**
 * GET /api/github/repos
 * Lists repositories directly from GitHub for the authenticated account.
 */
export const handleListGitHubRepos = async (req, res) => {
  try {
    const result = await listUserRepositories();
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.status(200).json({ repos: result.repos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/github/auto-setup-webhook
 * Programmatically creates/verifies the webhook on GitHub for the chosen repository.
 * Zero manual entry needed on GitHub!
 */
export const handleAutoSetupWebhook = async (req, res) => {
  try {
    const { owner: rawOwner, repo: rawRepo, fullName, webhookUrl: rawUrl, token, secret } = req.body || {};

    let owner = rawOwner;
    let repo = rawRepo;

    if (fullName && fullName.includes('/')) {
      const parts = fullName.split('/');
      owner = owner || parts[0];
      repo = repo || parts[1];
    }

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Repository owner and name are required (e.g. owner/repo).' });
    }

    const webhookBaseUrl = resolveWebhookBaseUrl(req, rawUrl);
    const targetWebhookUrl = webhookBaseUrl.endsWith('/webhooks/github')
      ? webhookBaseUrl
      : `${webhookBaseUrl.replace(/\/+$/, '')}/webhooks/github`;

    console.log(`[Controller/GitHub] 🚀 Initiating auto-setup webhook for ${owner}/${repo} ➔ ${targetWebhookUrl}`);

    const result = await autoInstallWebhook({
      owner,
      repo,
      webhookUrl: targetWebhookUrl,
      token,
      secret,
    });

    if (result.ok) {
      // Connect repo in platform index registry
      registerConnectedRepository({
        name: repo,
        owner,
        branch: 'main',
        htmlUrl: `https://github.com/${owner}/${repo}`,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        webhookUrl: targetWebhookUrl,
        alreadyInstalled: Boolean(result.alreadyInstalled),
        hook: result.hook,
      });
    }

    return res.status(result.status || 400).json({
      success: false,
      error: result.error,
      needsPermissions: result.status === 403,
    });
  } catch (err) {
    console.error('[Controller/GitHub] Webhook auto-setup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/github/sync-all-webhooks
 * Automatically creates/updates webhooks on ALL connected repositories in 1 click.
 */
export const handleAutoSyncAllWebhooks = async (req, res) => {
  try {
    const { webhookUrl: rawUrl, token, secret, repos: customRepos } = req.body || {};
    const webhookBaseUrl = resolveWebhookBaseUrl(req, rawUrl);
    const targetWebhookUrl = `${webhookBaseUrl.replace(/\/+$/, '')}/webhooks/github`;

    // Fetch user repos directly from GitHub API if no custom list supplied
    let targetRepos = Array.isArray(customRepos) && customRepos.length > 0 ? customRepos : null;
    if (!targetRepos) {
      const ghResult = await listUserRepositories(token);
      if (ghResult.ok && Array.isArray(ghResult.repos) && ghResult.repos.length > 0) {
        targetRepos = ghResult.repos;
      } else {
        targetRepos = getRepositories();
      }
    }

    const results = [];

    for (const repo of targetRepos) {
      let owner = repo.owner;
      let repoName = repo.name;

      if (typeof owner === 'object' && owner !== null) {
        owner = owner.login || '';
      }

      if ((!owner || !repoName) && repo.fullName && repo.fullName.includes('/')) {
        const parts = repo.fullName.split('/');
        owner = owner || parts[0];
        repoName = repoName || parts[1];
      }

      owner = owner || process.env.GITHUB_DEFAULT_OWNER || 'abhiramsadgun94';

      if (!owner || !repoName) continue;

      const installRes = await autoInstallWebhook({
        owner,
        repo: repoName,
        webhookUrl: targetWebhookUrl,
        token,
        secret,
      });

      if (installRes.ok) {
        registerConnectedRepository({
          name: repoName,
          owner,
          branch: repo.defaultBranch || repo.branch || 'main',
          htmlUrl: repo.htmlUrl || `https://github.com/${owner}/${repoName}`,
        });
      }

      results.push({
        repo: `${owner}/${repoName}`,
        success: installRes.ok,
        message: installRes.message || installRes.error,
        alreadyInstalled: Boolean(installRes.alreadyInstalled),
      });
    }

    return res.status(200).json({
      message: `Automated sync complete for ${results.length} repositories with zero manual entry!`,
      webhookUrl: targetWebhookUrl,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/github/webhook-status
 * Checks if the webhook is currently installed on GitHub for a specific repo.
 */
export const handleGetWebhookStatus = async (req, res) => {
  try {
    const { owner, repo, webhookUrl: rawUrl } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo query params required' });
    }

    const webhookBaseUrl = resolveWebhookBaseUrl(req, rawUrl);
    const targetWebhookUrl = `${webhookBaseUrl.replace(/\/+$/, '')}/webhooks/github`;

    const status = await getRepositoryWebhookStatus(owner, repo, targetWebhookUrl);
    return res.status(200).json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
