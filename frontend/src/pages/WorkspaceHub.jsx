import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MetricCard from "../components/MetricCard";
import AIStatus from "../components/AIStatus";
import DependencyGraph from "../components/DependencyGraph";
import ImpactTable from "../components/ImpactTable";
import MarkdownView from "../components/MarkdownView";
import Loader from "../components/Loader";
import ReviewCard from "../components/ReviewCard";
import { useAnalysis } from "../context/AnalysisContext";
import {
  Sparkles,
  ArrowRight,
  FolderGit2,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  FolderTree,
  Plus,
  Layers,
  Bot,
  Zap,
  Cpu,
  ShieldCheck,
  Activity,
  Key,
  Database,
  Save,
  User,
  Copy,
  Download,
  Send,
  Check,
  AlertCircle,
  X,
  Search,
  Trash2,
  Eye,
  Code2,
  Terminal,
  FileCode,
  FileText,
} from "lucide-react";

// Requirement presets
const REQUIREMENT_PRESETS = [
  {
    id: "JIRA-241",
    title: "Multi-Factor Authentication on High-Value Orders",
    text: `Requirement: Multi-Factor Authentication & Discount Rate Limit
1. Implement 2FA TOTP verification on checkout for high-value orders (> $500).
2. Validate discount percentage in discountService: Max 40% threshold for non-admin accounts.
3. Update Order model to record 'requires2FA' boolean flag.
4. Add comprehensive unit tests in checkout.test.js for edge cases.`,
  },
  {
    id: "JIRA-182",
    title: "OAuth2 & JWT Token Refresh Pipeline",
    text: `Requirement: JWT Silent Refresh & Revocation
1. Add rotating refresh tokens with 7-day expiration in authController.
2. Maintain blacklisted revoked tokens in in-memory / Redis cache.
3. Update SecurityConfig and user middleware to enforce token expiration checks.`,
  },
  {
    id: "JIRA-305",
    title: "Stripe Webhook Signature Verification & Idempotency",
    text: `Requirement: Webhook Security & Idempotency Key Tracking
1. Verify Stripe-Signature header before processing payment_intent.succeeded.
2. Record processed event IDs in Order database to prevent duplicate fulfillment.
3. Handle replay attacks and network retry scenarios.`,
  },
];

// Preset file templates for codebase files
const PRESET_SNIPPETS = [
  {
    title: "Auth Middleware & Token Guard",
    filePath: "src/middlewares/authGuard.js",
    module: "Middlewares",
    content: `import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token is invalid or expired' });
  }
};`,
  },
  {
    title: "Stripe Webhook Handler",
    filePath: "src/controllers/webhookController.js",
    module: "Controllers",
    content: `import stripe from '../config/stripe.js';
import Order from '../models/Order.js';

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    await Order.findOneAndUpdate({ paymentIntentId: paymentIntent.id }, { status: 'PAID' });
  }

  res.json({ received: true });
};`,
  },
  {
    title: "Inventory & Stock Service",
    filePath: "src/services/inventoryService.js",
    module: "Services",
    content: `import Inventory from '../models/Inventory.js';

export const reserveStock = async (items) => {
  for (const item of items) {
    const stock = await Inventory.findOne({ productId: item.productId });
    if (!stock || stock.available < item.quantity) {
      throw new Error(\`Insufficient stock for product \${item.productId}\`);
    }
    stock.available -= item.quantity;
    stock.reserved += item.quantity;
    await stock.save();
  }
  return true;
};

export const releaseStock = async (items) => {
  for (const item of items) {
    await Inventory.updateOne(
      { productId: item.productId },
      { $inc: { available: item.quantity, reserved: -item.quantity } }
    );
  }
};`,
  },
  {
    title: "Checkout Integration Test",
    filePath: "tests/checkoutIntegration.test.js",
    module: "Tests",
    content: `import { describe, it, expect, vi } from 'vitest';
import { processCheckout } from '../src/controllers/orderController.js';

describe('Checkout TOTP & Discount Enforcement', () => {
  it('rejects transaction > $500 if TOTP code is omitted', async () => {
    const req = {
      body: {
        cart: { total: 750, items: [{ productId: 'p1', quantity: 2 }] },
        user: { id: 'u123', isAdmin: false },
        discountCode: 'SUMMER20',
      },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await processCheckout(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});`,
  },
];

// Agents List
const AGENTS_LIST = [
  {
    id: "coord-agent",
    name: "Coordinator Agent",
    role: "Orchestration & Workflow Management",
    model: "gemini-2.5-flash",
    status: "Active",
    tasksCompleted: 142,
    accuracy: "99.2%",
  },
  {
    id: "req-agent",
    name: "Requirement Analysis Agent",
    role: "BRD / Jira parsing and semantic classification",
    model: "gemini-2.5-flash",
    status: "Active",
    tasksCompleted: 98,
    accuracy: "97.8%",
  },
  {
    id: "impact-agent",
    name: "Code Impact Agent",
    role: "AST parsing, dependency mapping, change tracing",
    model: "gemini-2.5-flash",
    status: "Active",
    tasksCompleted: 85,
    accuracy: "96.4%",
  },
  {
    id: "review-agent",
    name: "Senior Pre-Review Agent",
    role: "Automated code inspection, linting, regression risk",
    model: "gemini-2.5-flash",
    status: "Active",
    tasksCompleted: 110,
    accuracy: "98.1%",
  },
  {
    id: "pr-agent",
    name: "PR Generator Agent",
    role: "Automated PR drafting and release documentation",
    model: "gemini-2.5-flash",
    status: "Active",
    tasksCompleted: 76,
    accuracy: "99.0%",
  },
];

// Settings Helpers
const INPUT_STYLE = {
  width: "100%",
  padding: "12px 16px",
  background: "#1F2937",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "white",
  fontSize: "14px",
  outline: "none",
};

const LABEL_STYLE = {
  display: "block",
  color: "#D1D5DB",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: 500,
};

const HINT_STYLE = {
  fontSize: "12px",
  color: "#6B7280",
  marginTop: "5px",
};

const WorkspaceHub = ({ activeTab = "overview" }) => {
  const navigate = useNavigate();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    history,
    dashboardStats,
    requirementId,
    setRequirementId,
    brdText,
    setBrdText,
    gitDiff,
    setGitDiff,
    repoFiles,
    isLoadingFiles,
    addCustomFile,
    batchAddCustomFiles,
    removeCustomFile,
    isAnalyzing,
    analysisResult,
    analysisData,
    analysisError,
    isReviewing,
    reviewResult,
    reviewData,
    reviewError,
    workflow,
    lastUpdated,
    isLiveSyncing,
    runRepoScan,
    runImpactAnalysis,
    runCodeReview,
  } = useAnalysis();

  // Local Sync and action states
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // File Manager states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [fileActionMsg, setFileActionMsg] = useState("");
  const [copiedPath, setCopiedPath] = useState(null);

  // File Add form state
  const [filePathInput, setFilePathInput] = useState("");
  const [moduleInput, setModuleInput] = useState("Controllers");
  const [codeInput, setCodeInput] = useState("");
  const [fileFormError, setFileFormError] = useState("");

  // Batch add files state
  const [batchRawText, setBatchRawText] = useState("");
  const [batchFilesPreview, setBatchFilesPreview] = useState([]);

  // Settings states
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [githubUsername, setGithubUsername] = useState("");
  const [jiraUsername, setJiraUsername] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Populate settings form from backend profile
  useEffect(() => {
    const token = localStorage.getItem("impactiq_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch("/api/me", { headers })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data.user) {
          setGithubUsername(data.user.githubUsername || "");
          setJiraUsername(data.user.jiraUsername || "");
        }
      })
      .catch(() => {});
  }, [activeTab]);

  // Sync AST trigger
  const handleSyncRepo = async () => {
    setSyncing(true);
    try {
      await runRepoScan(selectedRepo?.id);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  // Requirement preset selection
  const handleSelectPreset = (preset) => {
    setRequirementId(preset.id);
    setBrdText(preset.text);
  };

  // Run impact analysis
  const handleAnalyze = async () => {
    try {
      await runImpactAnalysis(brdText, selectedRepo?.id, requirementId);
      navigate("/impact-analysis");
    } catch (err) {
      console.error(err);
    }
  };

  // Run code review
  const handleReview = async () => {
    try {
      await runCodeReview(gitDiff, requirementId);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy PR details
  const handleCopyPR = () => {
    const defaultTitle = reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Impact & Pre-Review: Multi-Factor Authentication & Order Rate Limit`;
    const defaultDescription = reviewResult
      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by ImpactIQ AI Multi-Agent Platform*`
      : `## Summary\n• Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n• Enforced 40% maximum discount threshold in discountService.\n• Updated Order schema to store requires2FA boolean status.\n• Added test coverage in tests/checkout.test.js.`;

    navigator.clipboard.writeText(`${defaultTitle}\n\n${defaultDescription}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export PR markdown
  const handleExportPR = () => {
    const defaultTitle = reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Impact & Pre-Review: Multi-Factor Authentication & Order Rate Limit`;
    const defaultDescription = reviewResult
      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by ImpactIQ AI Multi-Agent Platform*`
      : `## Summary\n• Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n• Enforced 40% maximum discount threshold in discountService.\n• Updated Order schema to store requires2FA boolean status.\n• Added test coverage in tests/checkout.test.js.`;

    const blob = new Blob([`${defaultTitle}\n\n${defaultDescription}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PULL_REQUEST_${requirementId || "DRAFT"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit PR
  const handleSubmitPR = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError("");

    const token = localStorage.getItem("impactiq_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch("/api/me/integrations", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ githubUsername, jiraUsername }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      setSettingsError("Could not save. Make sure the backend server is active.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // File Manager Handlers
  const displayFileMsg = (msg) => {
    setFileActionMsg(msg);
    setTimeout(() => setFileActionMsg(""), 3500);
  };

  const handleOpenAddFileModal = (preset = null) => {
    if (preset) {
      setFilePathInput(preset.filePath);
      setModuleInput(preset.module);
      setCodeInput(preset.content);
    } else {
      setFilePathInput("");
      setModuleInput("Controllers");
      setCodeInput("");
    }
    setFileFormError("");
    setShowAddModal(true);
  };

  const handleSaveNewFile = async (e) => {
    e.preventDefault();
    setFileFormError("");

    if (!filePathInput.trim()) {
      setFileFormError("Please specify a path relative to root");
      return;
    }

    const normalizedPath = filePathInput.trim().replace(/^[\/\\]+/, "");
    setIsSubmittingFile(true);
    try {
      await addCustomFile({
        filePath: normalizedPath,
        content: codeInput,
        module: moduleInput,
      });
      setShowAddModal(false);
      displayFileMsg(`File '${normalizedPath}' indexed successfully.`);
    } catch (err) {
      setFileFormError(err.message || "Failed to index file.");
    } finally {
      setIsSubmittingFile(false);
    }
  };

  const handleDeleteFile = async (file) => {
    const idOrPath = file.id || file.filePath;
    if (!window.confirm(`Are you sure you want to remove '${file.filePath}' from index registry?`)) {
      return;
    }
    try {
      await removeCustomFile(idOrPath);
      displayFileMsg(`Removed '${file.filePath}' from index.`);
      if (viewingFile?.filePath === file.filePath) {
        setViewingFile(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleParseBatchText = () => {
    if (!batchRawText.trim()) return;
    const chunks = batchRawText.split(/(?:^|\n)---+\s*([a-zA-Z0-9_\-./\\]+)\s*---+/g);
    const result = [];

    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i += 2) {
        const path = chunks[i]?.trim();
        const code = chunks[i + 1]?.trim() || "";
        if (path) {
          result.push({
            filePath: path.replace(/^[\/\\]+/, ""),
            content: code,
            module: path.toLowerCase().includes("controller")
              ? "Controllers"
              : path.toLowerCase().includes("service")
              ? "Services"
              : "General",
            lineCount: code.split("\n").length,
          });
        }
      }
    } else {
      result.push({
        filePath: "src/customFile.js",
        content: batchRawText,
        module: "Services",
        lineCount: batchRawText.split("\n").length,
      });
    }
    setBatchFilesPreview(result);
  };

  const handleConfirmBatchUpload = async () => {
    if (batchFilesPreview.length === 0) return;
    setIsSubmittingFile(true);
    try {
      await batchAddCustomFiles(batchFilesPreview);
      setShowBatchModal(false);
      setBatchFilesPreview([]);
      displayFileMsg(`Indexed ${batchFilesPreview.length} files successfully.`);
    } catch (err) {
      alert("Error uploading batch: " + err.message);
    } finally {
      setIsSubmittingFile(false);
    }
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Filtered files count calculation
  const filteredFiles = useMemo(() => {
    return repoFiles.filter((f) => {
      const p = (f.filePath || f.rootPath || "").toLowerCase();
      const matchesSearch = p.includes(searchQuery.toLowerCase()) || (f.module || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = activeModuleFilter === "ALL" || f.module === activeModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [repoFiles, searchQuery, activeModuleFilter]);

  const totalTrackedFiles = repoFiles.length || dashboardStats?.totalTrackedFiles || repositories.reduce((acc, r) => acc + (r.filesCount || 0), 0);
  const liveConnectedRepos = dashboardStats?.connectedRepos ?? repositories.length;
  const liveRequirements = dashboardStats?.indexedRequirements ?? history.length + 15;
  const liveAIReviewScore = dashboardStats?.aiReviewScore ?? "96%";
  const liveCoverage = dashboardStats?.repoTestCoverage ?? selectedRepo?.coverage ?? "91%";

  const fileCount = analysisData?.stats?.impactedFilesCount || (analysisData?.impactedFiles?.length || 4);
  const serviceCount = analysisData?.stats?.affectedServicesCount || 2;
  const testCount = analysisData?.stats?.testSuitesCount || 1;
  const confidence = analysisData?.stats?.confidence || "97%";

  return (
    <>
      <Navbar />

      <div className="dashboard-shell" style={{ display: "flex", background: "#07111f" }}>
        <Sidebar />

        <div className="dashboard-main" style={{ flex: 1, padding: "28px", minWidth: 0 }}>
          {/* Header Banner */}
          <div className="hero-panel" style={{ marginBottom: "22px", borderRadius: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ maxWidth: "760px" }}>
                <div className="stat-chip" style={{ marginBottom: "12px", borderRadius: "999px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLiveSyncing ? "#F59E0B" : "#22C55E", display: "inline-block" }} />
                  {isLiveSyncing ? "Syncing live data…" : `Live connection active • Refreshed ${lastUpdated || "just now"}`}
                </div>
                <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "6px", color: "#FFFFFF", textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                  AI Workspace Hub
                </h1>
                <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  Consolidated dashboard orchestrating semantic codebase indexing, requirement mapping, and Senior Staff AI pre-reviews.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="stat-chip">Repo: {selectedRepo?.name}</span>
                <select
                  value={selectedRepo?.id || "repo-1"}
                  onChange={(e) => {
                    const repo = repositories.find((r) => r.id === e.target.value);
                    if (repo) setSelectedRepo(repo);
                  }}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.branch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Shown on Overview & Analytics) */}
          {(activeTab === "overview" || activeTab === "analytics") && (
            <div className="metric-grid" style={{ marginBottom: "22px" }}>
              <MetricCard
                title="Connected Repos"
                value={liveConnectedRepos.toString()}
                subtitle={`${selectedRepo?.name || "impactiq-backend"} active`}
                color="#22C55E"
                to="/files"
                tooltip="Click to view and manage connected repository files"
              />
              <MetricCard
                title="Indexed Stories"
                value={liveRequirements.toString()}
                subtitle="Requirements parsed"
                color="#4F46E5"
                to="/requirements"
                tooltip="Click to configure and analyze requirement stories"
              />
              <MetricCard
                title="AI Pre-Review Score"
                value={liveAIReviewScore}
                subtitle="Average code validation"
                color="#F59E0B"
                to="/code-review"
                tooltip="Click to run Senior AI Code Pre-Review"
              />
              <MetricCard
                title="Test Coverage"
                value={liveCoverage}
                subtitle={`${totalTrackedFiles} tracked source files`}
                color="#38BDF8"
                to="/analytics"
                tooltip="Click to inspect test coverage and quality metrics"
              />
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 1: OVERVIEW
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "20px" }}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Active Requirement Snapshot */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={18} color="#818CF8" />
                      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>Active Requirement Target</h2>
                    </div>
                    <span style={{ background: "rgba(79, 70, 229, 0.15)", color: "#818CF8", padding: "4px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: 600 }}>
                      {requirementId}
                    </span>
                  </div>
                  <p style={{ color: "#CBD5E1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 16px" }}>
                    {brdText.substring(0, 180)}...
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "13px" }}
                    >
                      <Sparkles size={14} />
                      {isAnalyzing ? "Analyzing AST..." : "Run Semantic Analysis"}
                    </button>
                    <button
                      onClick={() => navigate("/requirements")}
                      className="secondary-btn"
                      style={{ padding: "10px 16px", fontSize: "13px" }}
                    >
                      Configure Story
                    </button>
                  </div>
                </div>

                {/* File Indexer Snapshot */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FolderTree size={18} color="#22C55E" />
                      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>Codebase Index Status</h2>
                    </div>
                    <button
                      onClick={() => navigate("/files")}
                      style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}
                    >
                      Manage files ({totalTrackedFiles})
                    </button>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px" }}>
                    <p style={{ color: "#E2E8F0", fontSize: "14px", margin: "0 0 6px" }}>{selectedRepo?.name}</p>
                    <small style={{ color: "#94A3B8" }}>Branch: <strong>{selectedRepo?.branch}</strong> • Status: <span style={{ color: "#22C55E" }}>Active</span></small>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleSyncRepo}
                      disabled={syncing}
                      className="secondary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "13px" }}
                    >
                      <RefreshCw size={13} className={syncing ? "spin" : ""} />
                      {syncing ? "Scanning codebase AST..." : "Force Index Sync"}
                    </button>
                  </div>
                </div>

                {/* Recent History Table */}
                <div className="card" style={{ padding: "24px" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 600 }}>Recent AI Analysis Runs</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ color: "#94A3B8", fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <th align="left" style={{ paddingBottom: "10px" }}>Story / Title</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Status</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Confidence</th>
                          <th align="right" style={{ paddingBottom: "10px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 3).map((item) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13.5px" }}>
                            <td style={{ padding: "12px 0" }}>
                              <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{item.requirementId}</div>
                              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{item.title}</div>
                            </td>
                            <td>
                              <span style={{ color: "#22C55E", fontWeight: 600 }}>● {item.status}</span>
                            </td>
                            <td style={{ color: "#818CF8", fontWeight: 600 }}>{item.confidence}</td>
                            <td align="right">
                              <button
                                onClick={() => navigate("/impact-analysis")}
                                style={{ background: "transparent", border: "none", color: "#818CF8", cursor: "pointer", fontSize: "12.5px" }}
                              >
                                View Map →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column (Agent Monitor) */}
              <div>
                <AIStatus />
                <div className="card" style={{ marginTop: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button onClick={() => navigate("/code-review")} className="primary-btn" style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", background: "rgba(79, 70, 229, 0.15)", border: "1px solid rgba(129, 140, 248, 0.3)", color: "#818CF8" }}>
                    <ShieldCheck size={16} /> AI Code Pre-Review
                  </button>
                  <button onClick={() => navigate("/pr-generator")} className="primary-btn" style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", background: "#059669" }}>
                    <Send size={16} /> Draft Pull Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 2: CODEBASE FILES (INDEXER)
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>Codebase Indexer Registry</h2>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Manage files target for requirement analysis scanning and AST dependency graph building.</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleSyncRepo} disabled={syncing} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <RefreshCw size={13} className={syncing ? "spin" : ""} /> Sync AST
                  </button>
                  <button onClick={() => handleOpenAddFileModal(null)} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px" }}>
                    <Plus size={14} /> Add File
                  </button>
                  <button onClick={() => setShowBatchModal(true)} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    Batch Upload
                  </button>
                </div>
              </div>

              {/* Status banner */}
              {fileActionMsg && (
                <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86EFAC", padding: "10px 16px", borderRadius: "10px", fontSize: "13px" }}>
                  {fileActionMsg}
                </div>
              )}

              {/* Filter controls */}
              <div className="card" style={{ padding: "16px", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: "220px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", padding: "8px 12px", gap: "8px" }}>
                  <Search size={15} color="#94A3B8" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file registry..."
                    style={{ background: "transparent", border: "none", outline: "none", color: "white", width: "100%", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["ALL", "Controllers", "Services", "Models", "Middlewares", "Tests"].map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setActiveModuleFilter(mod)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12.5px",
                        borderRadius: "8px",
                        background: activeModuleFilter === mod ? "#4F46E5" : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: activeModuleFilter === mod ? "white" : "#94A3B8",
                        cursor: "pointer",
                      }}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid content */}
              <div style={{ display: "grid", gridTemplateColumns: viewingFile ? "1fr 1fr" : "1fr", gap: "20px" }}>
                {/* List Card */}
                <div className="card" style={{ padding: "20px" }}>
                  {isLoadingFiles ? (
                    <Loader text="Loading codebase file registry..." />
                  ) : filteredFiles.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                      <FolderTree size={36} style={{ marginBottom: "10px", opacity: 0.5 }} />
                      <p>No files found matching the filter query.</p>
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ color: "#94A3B8", fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <th align="left" style={{ paddingBottom: "10px" }}>File Path</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Module</th>
                          <th align="left" style={{ paddingBottom: "10px" }}>Lines</th>
                          <th align="right" style={{ paddingBottom: "10px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiles.map((file) => (
                          <tr key={file.id || file.filePath} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                            <td style={{ padding: "12px 0", fontFamily: "monospace", color: "#E2E8F0" }}>{file.filePath}</td>
                            <td>
                              <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.07)", padding: "3px 8px", borderRadius: "6px", color: "#CBD5E1" }}>
                                {file.module}
                              </span>
                            </td>
                            <td style={{ color: "#94A3B8" }}>{file.lineCount || 0}</td>
                            <td align="right">
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => setViewingFile(file)}
                                  style={{ background: "transparent", border: "none", color: "#818CF8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  <Eye size={13} /> View
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file)}
                                  style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer" }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* View Code Panel */}
                {viewingFile && (
                  <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "540px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", margin: 0, fontFamily: "monospace", color: "#F8FAFC" }}>
                          {viewingFile.filePath.split("/").pop()}
                        </h3>
                        <small style={{ color: "#94A3B8", fontFamily: "monospace" }}>{viewingFile.filePath}</small>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleCopyPath(viewingFile.filePath)}
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "white", cursor: "pointer" }}
                        >
                          {copiedPath === viewingFile.filePath ? "Copied!" : "Copy Path"}
                        </button>
                        <button
                          onClick={() => setViewingFile(null)}
                          style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflow: "auto", background: "#0b1329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px" }}>
                      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12.5px", color: "#C7D2FE", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {viewingFile.content || "// No code content uploaded for this indexed reference."}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Quick Files when directory is empty or to guide user */}
              {!viewingFile && (
                <div className="card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "15px", margin: "0 0 12px", color: "#E2E8F0" }}>💡 Quick Preset Templates to Register</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                    {PRESET_SNIPPETS.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleOpenAddFileModal(preset)}
                        style={{
                          padding: "12px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#818CF8")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                      >
                        <h4 style={{ fontSize: "13.5px", color: "#F1F5F9", margin: "0 0 4px" }}>{preset.title}</h4>
                        <code style={{ fontSize: "11px", color: "#818CF8", display: "block" }}>{preset.filePath}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 3: REQUIREMENT ANALYSIS
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "requirement" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}>
              {/* Left Column Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Active Files Context Indicator */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12.5px", color: "#94A3B8", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FolderTree size={14} color="#818CF8" /> Target Codebase Files Context (First 5):
                    </span>
                    <button onClick={() => navigate("/files")} style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "12px", cursor: "pointer" }}>
                      Manage files
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {repoFiles.slice(0, 5).map((f, i) => (
                      <code key={i} style={{ background: "#1F2937", color: "#C7D2FE", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {f.filePath || f.rootPath}
                      </code>
                    ))}
                    {repoFiles.length > 5 && (
                      <span style={{ color: "#94A3B8", fontSize: "11.5px", alignSelf: "center" }}>
                        +{repoFiles.length - 5} more files indexed
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset List */}
                <div className="card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "14.5px", margin: "0 0 10px", color: "#E2E8F0" }}>💡 Load Preset Requirement Story:</h3>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {REQUIREMENT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: requirementId === p.id ? "#4F46E5" : "#1F2937",
                          color: requirementId === p.id ? "#FFFFFF" : "#9CA3AF",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: 500,
                        }}
                      >
                        {p.id}: {p.title.substring(0, 24)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form specifications */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 600 }}>Requirement Specifications</h2>
                    <input
                      type="text"
                      value={requirementId}
                      onChange={(e) => setRequirementId(e.target.value)}
                      placeholder="e.g. JIRA-241"
                      style={{
                        padding: "6px 12px",
                        background: "#1F2937",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        width: "120px",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <textarea
                    rows={8}
                    value={brdText}
                    onChange={(e) => setBrdText(e.target.value)}
                    placeholder="Paste Business Requirement Document (BRD) or Jira story scope..."
                    style={{
                      width: "100%",
                      padding: "16px",
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "13.5px",
                      lineHeight: "1.6",
                      resize: "vertical",
                      outline: "none",
                      marginBottom: "16px",
                    }}
                  />

                  {analysisError && (
                    <div style={{ display: "flex", gap: "10px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#FCA5A5", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                      <AlertCircle size={16} style={{ marginTop: "2px" }} />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !brdText.trim()}
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "14px" }}
                    >
                      <Sparkles size={16} />
                      {isAnalyzing ? "Gemini AI Mapping Code..." : "Run AI Impact Analysis"}
                    </button>
                    {analysisResult && !isAnalyzing && (
                      <span style={{ color: "#22C55E", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                        <CheckCircle2 size={15} /> Analysis primer generated!
                      </span>
                    )}
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="card" style={{ padding: "20px" }}>
                    <Loader text="AI Multi-Agent coordinator is parsing BRD and indexing AST files..." />
                  </div>
                )}
              </div>

              {/* Right Column Status */}
              <div>
                <AIStatus />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 4: IMPACT ANALYSIS MAP
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "impact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>Impact Mapping Results</h2>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>
                    Suggested starting files, dependent callers, and test suite coverages mapping for <strong>{requirementId}</strong>.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => navigate("/requirements")} className="secondary-btn" style={{ fontSize: "12.5px" }}>
                    Edit Story
                  </button>
                  <button onClick={handleAnalyze} disabled={isAnalyzing} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <RefreshCw size={13} className={isAnalyzing ? "spin" : ""} /> Re-analyze
                  </button>
                  <button onClick={() => navigate("/code-review")} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px" }}>
                    Proceed to Pre-Review <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Metrics cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" }}>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>Impacted Files</p>
                  <h1 style={{ color: "#22C55E", margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{fileCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>Affected Services</p>
                  <h1 style={{ color: "#4F46E5", margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{serviceCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>Tests to Update</p>
                  <h1 style={{ color: "#F59E0B", margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{testCount}</h1>
                </div>
                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>AI Confidence</p>
                  <h1 style={{ color: "#22C55E", margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{confidence}</h1>
                </div>
              </div>

              {/* Advisory Primer Content */}
              <div className="card" style={{ padding: "24px", border: "1px solid rgba(129,140,248,0.25)", background: "linear-gradient(180deg, rgba(30,27,75,0.2) 0%, rgba(15,23,42,0.95) 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={18} color="#818CF8" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Gemini AI Suggested Code Map</h3>
                  </div>
                  <span style={{ fontSize: "11px", background: "rgba(129,140,248,0.15)", color: "#818CF8", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    AI Advisory Engine
                  </span>
                </div>

                {isAnalyzing ? (
                  <Loader text="Generating map details from semantic index..." />
                ) : analysisResult ? (
                  <MarkdownView content={analysisResult} />
                ) : (
                  <div>
                    <p style={{ color: "#94A3B8", lineHeight: 1.6, margin: "0 0 10px" }}>
                      Run impact analysis mapping on a requirement story to inspect:
                    </p>
                    <div style={{ paddingLeft: "14px", color: "#CBD5E1", fontSize: "13.5px", lineHeight: 1.8 }}>
                      <p>• <strong>Primary Edit Targets</strong>: Files containing logic block modifications.</p>
                      <p>• <strong>Downstream Impacts</strong>: Caller contracts and schema structures modified.</p>
                      <p>• <strong>Tests to Update</strong>: Coverage files that require testing code assertions.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependency Graph */}
              <div className="card" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "15.5px", fontWeight: 600 }}>AST Dependency Graph Visualization</h3>
                <DependencyGraph graphData={analysisData?.graph} />
              </div>

              {/* File registry table */}
              <div className="card" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "15.5px", fontWeight: 600 }}>Impacted File Registry</h3>
                <ImpactTable files={analysisData?.impactedFiles} />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 5: SENIOR AI CODE REVIEW
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>AI Senior Staff Pre-Review</h2>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Paste Git diff code block to review quality, find regressions, and draft pull request documentation.</p>
                </div>
                <button onClick={() => navigate("/pr-generator")} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "10px 16px" }}>
                  Draft Pull Request <ArrowRight size={13} />
                </button>
              </div>

              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" }}>
                <ReviewCard title="Quality Score" value={reviewData?.qualityScore || "95/100"} color="#22C55E" />
                <ReviewCard title="Regression Risk" value={reviewData?.regressionRisk || "Low-Med"} color="#F59E0B" />
                <ReviewCard title="Test Gap Detection" value={reviewData?.testGapsCount ? `${reviewData.testGapsCount} Missing` : "1 Missing"} color="#818CF8" />
                <ReviewCard title="Security Clearance" value={reviewData?.securityStatus || "Pass"} color="#22C55E" />
              </div>

              {/* Git Diff Form */}
              <div className="card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Code2 size={18} color="#818CF8" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Committed Git Diff Source</h3>
                  </div>
                  <small style={{ color: "#94A3B8" }}>Linked story: <strong>{requirementId}</strong></small>
                </div>

                <textarea
                  rows={8}
                  value={gitDiff}
                  onChange={(e) => setGitDiff(e.target.value)}
                  placeholder="Paste git diff here (e.g. diff --git a/src/controllers/...)"
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#A7F3D0",
                    fontFamily: "monospace",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    resize: "vertical",
                    outline: "none",
                    marginBottom: "16px",
                  }}
                />

                {reviewError && (
                  <div style={{ display: "flex", gap: "10px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#FCA5A5", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                    <AlertCircle size={16} />
                    <span>{reviewError}</span>
                  </div>
                )}

                <button
                  onClick={handleReview}
                  disabled={isReviewing || !gitDiff.trim()}
                  className="primary-btn"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "14px" }}
                >
                  <Sparkles size={16} />
                  {isReviewing ? "Senior Agent Reviewing Diff..." : "Run AI Pre-Review on Diff"}
                </button>
              </div>

              {/* Review Report Display */}
              <div className="card" style={{ padding: "24px", border: "1px solid rgba(34, 197, 94, 0.25)", background: "linear-gradient(180deg, rgba(20,83,45,0.05) 0%, rgba(15,23,42,0.95) 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} color="#22C55E" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Senior Staff Review Report</h3>
                  </div>
                  <span style={{ fontSize: "11px", background: reviewResult ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: reviewResult ? "#22C55E" : "#94A3B8", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    {reviewResult ? "Report Active" : "Waiting for diff"}
                  </span>
                </div>

                {isReviewing ? (
                  <Loader text="Senior Pre-Review agent checking security contracts and regression risks..." />
                ) : reviewResult ? (
                  <MarkdownView content={reviewResult} />
                ) : (
                  <div>
                    <p style={{ color: "#94A3B8", lineHeight: 1.6, margin: "0 0 10px" }}>
                      Review report includes:
                    </p>
                    <div style={{ paddingLeft: "14px", color: "#CBD5E1", fontSize: "13.5px", lineHeight: 1.8 }}>
                      <p>✔ <strong>Code Standards check</strong>: lint findings, conventions, async structures.</p>
                      <p>✔ <strong>Regression Risk check</strong>: upstream caller integrations, backward compatibility.</p>
                      <p>✔ <strong>Test Coverage Gaps</strong>: uncovered code paths, boundary checks.</p>
                      <p>✔ <strong>Auto-PR Draft</strong>: structured summary ready for GitHub checkout mapping.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 6: PR GENERATOR
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "pr" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>AI Pull Request Draft</h2>
                <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Generated from requirement scope, files touched registry, and AI code review validations.</p>
              </div>

              {/* Title Section */}
              <div className="card" style={{ padding: "20px" }}>
                <label style={{ ...LABEL_STYLE, fontSize: "13.5px", color: "#94A3B8" }}>PR Title Draft</label>
                <input
                  type="text"
                  readOnly
                  value={reviewData?.prDraft?.title || `[${requirementId || "JIRA-241"}] AI Pre-Review: Multi-Factor Authentication & Order Rate Limit`}
                  style={{ ...INPUT_STYLE, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>

              {/* Markdown Description */}
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ ...LABEL_STYLE, fontSize: "13.5px", color: "#94A3B8", margin: 0 }}>PR Description Template (Markdown)</label>
                  {reviewResult && (
                    <span style={{ fontSize: "11px", color: "#818CF8", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Sparkles size={12} /> Auto-synthesized from Gemini Pre-Review
                    </span>
                  )}
                </div>
                <textarea
                  rows={12}
                  readOnly
                  value={
                    reviewResult
                      ? `## Automated AI Pre-Review Summary (${requirementId})\n\n${reviewResult}\n\n---\n*Generated by ImpactIQ AI Multi-Agent Platform*`
                      : `## Summary\n• Implemented 2FA TOTP verification on checkout for high-value orders (> $500).\n• Enforced 40% maximum discount threshold in discountService.\n• Updated Order schema to store \`requires2FA\` boolean status.\n• Added test coverage in \`tests/checkout.test.js\`.\n\n## Linked Requirement\n${requirementId || "JIRA-241"}\n\n## Files Touched\n• src/controllers/checkoutController.js\n• src/services/discountService.js\n• src/models/Order.js\n• tests/checkout.test.js\n\n## Pre-Review Checklist\n✔ Unit tests updated\n✔ Code quality & linting passed\n✔ Backward compatibility preserved`
                  }
                  style={{ ...INPUT_STYLE, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", height: "300px", resize: "none", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.6 }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button onClick={handleCopyPR} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "13.5px" }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied description!" : "Copy Description"}
                </button>
                <button onClick={handleExportPR} className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <Download size={16} /> Export Markdown File
                </button>
                <button onClick={handleSubmitPR} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", background: "#059669", padding: "10px 18px", fontSize: "13.5px" }}>
                  {submitted ? <Check size={16} /> : <Send size={16} />}
                  {submitted ? "PR Synced to GitHub!" : "Publish to GitHub PR"}
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 7: AI AGENT NETWORK
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "agents" && (
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: "25px" }}>
              {/* Agent Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>Active Agent Network</h2>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Check health telemetry and metrics of each isolated agent inside the intelligence swarm.</p>
                </div>
                {AGENTS_LIST.map((agent) => (
                  <div key={agent.id} className="card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(79, 70, 229, 0.12)", display: "flex", justifyContent: "center", alignItems: "center", color: "#818CF8" }}>
                          <Bot size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "15px", color: "white", fontWeight: 600 }}>{agent.name}</h3>
                          <p style={{ color: "#94A3B8", fontSize: "12px", marginTop: "2px", margin: 0 }}>{agent.role}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", background: "rgba(34,197,94,0.15)", color: "#22C55E", padding: "3px 8px", borderRadius: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22C55E" }} /> {agent.status}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <small style={{ color: "#94A3B8", fontSize: "11px" }}>Model LLM</small>
                        <p style={{ margin: "2px 0 0", color: "#E2E8F0", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <Cpu size={12} color="#818CF8" /> {agent.model}
                        </p>
                      </div>
                      <div>
                        <small style={{ color: "#94A3B8", fontSize: "11px" }}>Tasks Sync</small>
                        <p style={{ margin: "2px 0 0", color: "#E2E8F0", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <Zap size={12} color="#F59E0B" /> {agent.tasksCompleted} runs
                        </p>
                      </div>
                      <div>
                        <small style={{ color: "#94A3B8", fontSize: "11px" }}>Accuracy Benchmark</small>
                        <p style={{ margin: "2px 0 0", color: "#22C55E", fontSize: "12.5px", fontWeight: 600 }}>{agent.accuracy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status bar */}
              <div>
                <AIStatus />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 8: INSIGHTS & ANALYTICS
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div>
                <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>Quality & Health Insights</h2>
                <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Telemetry trends showing code hot spots, defect prevention rates, and safety scopes.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Hotspots Card */}
                <div className="card" style={{ padding: "24px" }}>
                  <h3 style={{ fontSize: "15.5px", fontWeight: 600, margin: "0 0 4px" }}>🔥 Most Impacted Source Hotspots</h3>
                  <p style={{ color: "#94A3B8", fontSize: "12.5px", margin: "0 0 16px" }}>Code paths that get touched frequently by requirement changes.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { file: "src/controllers/authController.js", count: 42, risk: "High" },
                      { file: "src/services/discountService.js", count: 31, risk: "High" },
                      { file: "src/models/Order.js", count: 28, risk: "Medium" },
                      { file: "src/middlewares/auth.js", count: 19, risk: "Low" },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                        <code style={{ fontSize: "12px", color: "#E2E8F0" }}>{item.file}</code>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "#94A3B8" }}>{item.count} updates</span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: item.risk === "High" ? "#EF4444" : item.risk === "Medium" ? "#F59E0B" : "#22C55E" }}>
                            {item.risk} Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reliability metrics */}
                <div className="card" style={{ padding: "24px" }}>
                  <h3 style={{ fontSize: "15.5px", fontWeight: 600, margin: "0 0 4px" }}>🛡️ Swarm Verification Metrics</h3>
                  <p style={{ color: "#94A3B8", fontSize: "12.5px", margin: "0 0 18px" }}>Aggregated health status scores for scanned packages.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[
                      { label: "Unit Test Coverage", value: 91, color: "#38BDF8" },
                      { label: "AI Review Agreement", value: 96, color: "#818CF8" },
                      { label: "Linting & Best Practice Standards", value: 98, color: "#22C55E" },
                      { label: "Security Risk Clearance", value: 89, color: "#F59E0B" },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                          <span style={{ color: "#CBD5E1" }}>{item.label}</span>
                          <span style={{ fontWeight: 600, color: item.color }}>{item.value}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${item.value}%`, height: "100%", background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              TAB 9: CONFIGURATION & SETTINGS
              ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div>
                <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "600", margin: 0 }}>Workspace Configuration</h2>
                <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>Set model weights, link developer accounts, and review database statuses.</p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* AI config */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Key size={18} color="#818CF8" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Gemini AI Settings</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={LABEL_STYLE}>Active Model Engine</label>
                      <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} style={INPUT_STYLE}>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default - Ultra fast)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep AST analysis)</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Username Integrations */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <GitBranch size={18} color="#F59E0B" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Integration Username Mapping</h3>
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "12.5px", margin: "0 0 16px" }}>
                    Map webhook signals (GitHub pusher, Jira assignee) to route reports to your address.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={LABEL_STYLE}>GitHub Username</label>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="e.g. john-doe"
                        style={INPUT_STYLE}
                      />
                      <p style={HINT_STYLE}>Matches GitHub commit author signals.</p>
                    </div>

                    <div>
                      <label style={LABEL_STYLE}>Jira Username</label>
                      <input
                        type="text"
                        value={jiraUsername}
                        onChange={(e) => setJiraUsername(e.target.value)}
                        placeholder="e.g. john.doe"
                        style={INPUT_STYLE}
                      />
                      <p style={HINT_STYLE}>Matches Jira ticket asignee identifiers.</p>
                    </div>
                  </div>
                </div>

                {/* Database indicator */}
                <div className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <Database size={18} color="#22C55E" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>System Services Health</h3>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", padding: "10px 14px", borderRadius: "10px", color: "#86EFAC", fontSize: "13px" }}>
                    <span>● MongoDB Connection Status</span>
                    <strong>Active (Safe Mode fallback enabled)</strong>
                  </div>
                </div>

                {/* Save status */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button type="submit" disabled={settingsSaving} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", fontSize: "13.5px" }}>
                    <Save size={15} /> Save Configurations
                  </button>
                  {settingsSaved && <span style={{ color: "#22C55E", fontSize: "13px" }}>✓ Settings updated successfully.</span>}
                  {settingsError && <span style={{ color: "#EF4444", fontSize: "13px" }}>{settingsError}</span>}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Add New File Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(2,6,23,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "700px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "white" }}>Index New Source File</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveNewFile} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={LABEL_STYLE}>Relative File Path</label>
                <input
                  type="text"
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  placeholder="e.g. src/controllers/orderController.js"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Module Classification</label>
                <select value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} style={INPUT_STYLE}>
                  <option value="Controllers">Controllers</option>
                  <option value="Services">Services</option>
                  <option value="Models">Models</option>
                  <option value="Middlewares">Middlewares</option>
                  <option value="Routes">Routes</option>
                  <option value="Tests">Tests</option>
                  <option value="Utils">Utils</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Code Content</label>
                <textarea
                  rows={8}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Paste source code logic block here..."
                  style={{ ...INPUT_STYLE, fontFamily: "monospace", resize: "none", height: "180px" }}
                />
              </div>

              {fileFormError && (
                <div style={{ color: "#EF4444", fontSize: "12.5px" }}>{fileFormError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="secondary-btn" style={{ fontSize: "13px", padding: "8px 14px" }}>Cancel</button>
                <button type="submit" disabled={isSubmittingFile} className="primary-btn" style={{ fontSize: "13px", padding: "8px 16px" }}>
                  {isSubmittingFile ? "Indexing..." : "Index File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(2,6,23,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "750px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "white" }}>Batch Index Files</h3>
              <button onClick={() => setShowBatchModal(false)} style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ color: "#94A3B8", fontSize: "13px", margin: 0 }}>
              Paste files separated by <code>--- path/to/file ---</code> separators to index multiple files simultaneously.
            </p>

            <textarea
              rows={8}
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder={`--- src/controllers/userController.js ---\nconst login = ...\n\n--- src/models/User.js ---\nconst UserSchema = ...`}
              style={{ ...INPUT_STYLE, fontFamily: "monospace", height: "180px", resize: "none" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleParseBatchText} className="secondary-btn" style={{ fontSize: "13px" }}>Parse & Preview</button>
              {batchFilesPreview.length > 0 && (
                <span style={{ alignSelf: "center", color: "#22C55E", fontSize: "13px" }}>
                  ✓ Decoded {batchFilesPreview.length} files successfully.
                </span>
              )}
            </div>

            {batchFilesPreview.length > 0 && (
              <div style={{ maxHeight: "100px", overflow: "auto", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px" }}>
                {batchFilesPreview.map((item, idx) => (
                  <div key={idx} style={{ fontSize: "12px", fontFamily: "monospace", color: "#CBD5E1", display: "flex", justifyContent: "space-between" }}>
                    <span>{item.filePath}</span>
                    <span style={{ color: "#94A3B8" }}>({item.lineCount} lines)</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => { setShowBatchModal(false); setBatchFilesPreview([]); }} className="secondary-btn" style={{ fontSize: "13px", padding: "8px 14px" }}>Cancel</button>
              <button onClick={handleConfirmBatchUpload} disabled={isSubmittingFile || batchFilesPreview.length === 0} className="primary-btn" style={{ fontSize: "13px", padding: "8px 16px" }}>
                {isSubmittingFile ? "Uploading..." : "Confirm Indexing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkspaceHub;
