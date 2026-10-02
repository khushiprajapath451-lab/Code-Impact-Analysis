/**
 * githubService.js
 *
 * Programmatic GitHub API Integration:
 *  - Listing user repositories
 *  - Automatic 1-click webhook registration & verification
 *  - Checking webhook health & status on repositories
 */

const getHeaders = (customToken) => {
  const token = customToken || process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ImpactIQ-Code-Intelligence',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Lists repositories directly from GitHub for the authenticated account.
 * @param {string} [customToken]
 * @returns {Promise<{ok: boolean, repos?: Array, error?: string, status?: number}>}
 */
export const listUserRepositories = async (customToken) => {
  const token = customToken || process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: 'GITHUB_TOKEN is not configured in backend environment or request.',
      status: 400,
    };
  }

  try {
    const url = 'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member';
    const response = await fetch(url, { headers: getHeaders(token) });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        error: `GitHub API error ${response.status}: ${errText}`,
        status: response.status,
      };
    }

    const rawRepos = await response.json();
    const repos = rawRepos.map((r) => ({
      id: String(r.id),
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login || '',
      ownerAvatar: r.owner?.avatar_url || '',
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      private: Boolean(r.private),
      description: r.description || '',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      updatedAt: r.updated_at,
    }));

    return { ok: true, repos };
  } catch (err) {
    return { ok: false, error: err.message, status: 500 };
  }
};

/**
 * Programmatically creates or verifies a webhook on GitHub for the specified repository.
 * @param {object} params
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {string} params.webhookUrl
 * @param {string} [params.token]
 * @param {string} [params.secret]
 * @returns {Promise<{ok: boolean, alreadyInstalled?: boolean, hook?: object, message?: string, error?: string, status?: number}>}
 */
export const autoInstallWebhook = async ({ owner, repo, webhookUrl, token, secret }) => {
  const activeToken = token || process.env.GITHUB_TOKEN;
  if (!activeToken) {
    return {
      ok: false,
      error: 'GITHUB_TOKEN is required to automatically install webhooks on GitHub.',
      status: 400,
    };
  }

  const webhookSecret = secret || process.env.GITHUB_WEBHOOK_SECRET || '';
  const headers = getHeaders(activeToken);

  try {
    // 1. Fetch existing webhooks to check for duplicates
    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, { headers });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return {
        ok: false,
        error: `Failed to fetch repo hooks (${listRes.status}): ${errText}`,
        status: listRes.status,
      };
    }

    const hooks = await listRes.json();
    const normalizedTarget = webhookUrl.replace(/\/+$/, '').toLowerCase();

    const existing = Array.isArray(hooks)
      ? hooks.find((h) => (h.config?.url || '').replace(/\/+$/, '').toLowerCase() === normalizedTarget)
      : null;

    if (existing) {
      // If hook already exists, ensure it is active and listening to required events
      const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks/${existing.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: true,
          events: ['push', 'pull_request', 'issues', 'issue_comment'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: webhookSecret || undefined,
            insecure_ssl: '0',
          },
        }),
      });

      const updatedHook = updateRes.ok ? await updateRes.json() : existing;

      return {
        ok: true,
        alreadyInstalled: true,
        hook: updatedHook,
        message: `Webhook is already installed and verified active on ${owner}/${repo}`,
      };
    }

    // 2. Create new webhook on GitHub repository
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'issues', 'issue_comment'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret || undefined,
          insecure_ssl: '0',
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return {
        ok: false,
        error: `Failed to create webhook on GitHub (${createRes.status}): ${errText}`,
        status: createRes.status,
      };
    }

    const newHook = await createRes.json();
    console.log(`[GitHubService] ✅ Successfully created webhook ID #${newHook.id} for ${owner}/${repo}`);

    return {
      ok: true,
      alreadyInstalled: false,
      hook: newHook,
      message: `Webhook successfully registered and activated on ${owner}/${repo}`,
    };
  } catch (err) {
    return { ok: false, error: err.message, status: 500 };
  }
};

/**
 * Checks if target webhook URL is currently registered on a GitHub repository.
 * @param {string} owner
 * @param {string} repo
 * @param {string} targetWebhookUrl
 * @param {string} [customToken]
 * @returns {Promise<{installed: boolean, hook?: object, totalHooks?: number, error?: string}>}
 */
export const getRepositoryWebhookStatus = async (owner, repo, targetWebhookUrl, customToken) => {
  const token = customToken || process.env.GITHUB_TOKEN;
  if (!token) {
    return { installed: false, error: 'GITHUB_TOKEN not configured' };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      headers: getHeaders(token),
    });

    if (!res.ok) {
      return { installed: false, error: `GitHub API status ${res.status}` };
    }

    const hooks = await res.json();
    const normalizedTarget = (targetWebhookUrl || '').replace(/\/+$/, '').toLowerCase();

    const matchedHook = Array.isArray(hooks)
      ? hooks.find((h) => (h.config?.url || '').replace(/\/+$/, '').toLowerCase() === normalizedTarget)
      : null;

    return {
      installed: Boolean(matchedHook && matchedHook.active),
      hook: matchedHook || null,
      totalHooks: Array.isArray(hooks) ? hooks.length : 0,
    };
  } catch (err) {
    return { installed: false, error: err.message };
  }
};
