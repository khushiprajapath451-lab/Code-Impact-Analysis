import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Loader from "../components/Loader";
import { useAnalysis } from "../context/AnalysisContext";
import {
  FileCode2,
  Plus,
  UploadCloud,
  FolderTree,
  Search,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  Code2,
  Layers,
  FileCheck,
  ArrowRight,
  FolderGit2,
  Terminal,
} from "lucide-react";

const MODULE_OPTIONS = [
  "Controllers",
  "Services",
  "Models",
  "Middlewares",
  "Routes",
  "Tests",
  "Utils",
  "Config",
  "UI / Frontend",
  "General",
];

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

const CodebaseFiles = () => {
  const navigate = useNavigate();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    repoFiles,
    isLoadingFiles,
    addCustomFile,
    batchAddCustomFiles,
    removeCustomFile,
    runRepoScan,
  } = useAnalysis();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [copiedPath, setCopiedPath] = useState(null);

  // Form State for Adding / Editing File
  const [filePathInput, setFilePathInput] = useState("");
  const [moduleInput, setModuleInput] = useState("Controllers");
  const [codeInput, setCodeInput] = useState("");
  const [formError, setFormError] = useState("");

  // Batch paste state
  const [batchRawText, setBatchRawText] = useState("");
  const [uploadedFilesPreview, setUploadedFilesPreview] = useState([]);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const displayMessage = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(""), 3500);
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    return repoFiles.filter((f) => {
      const p = (f.filePath || f.rootPath || "").toLowerCase();
      const matchesSearch = p.includes(searchQuery.toLowerCase()) || (f.module || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = activeModuleFilter === "ALL" || f.module === activeModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [repoFiles, searchQuery, activeModuleFilter]);

  const totalLines = useMemo(() => {
    return repoFiles.reduce((acc, f) => acc + (f.lineCount || 0), 0);
  }, [repoFiles]);

  const totalFunctions = useMemo(() => {
    return repoFiles.reduce((acc, f) => acc + (f.functions?.length || 0), 0);
  }, [repoFiles]);

  const handleOpenAddModal = (preset = null) => {
    if (preset) {
      setFilePathInput(preset.filePath);
      setModuleInput(preset.module);
      setCodeInput(preset.content);
    } else {
      setFilePathInput("");
      setModuleInput("Controllers");
      setCodeInput("");
    }
    setFormError("");
    setShowAddModal(true);
  };

  const handleSaveFile = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!filePathInput.trim()) {
      setFormError("Please specify the path to root (e.g. src/services/paymentService.js)");
      return;
    }

    const normalizedPath = filePathInput.trim().replace(/^[\/\\]+/, "");

    setIsSubmitting(true);
    try {
      await addCustomFile({
        filePath: normalizedPath,
        content: codeInput,
        module: moduleInput,
      });
      setShowAddModal(false);
      displayMessage(`File '${normalizedPath}' registered to root index successfully!`);
    } catch (err) {
      setFormError(err.message || "Failed to save file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = async (file) => {
    const idOrPath = file.id || file.filePath;
    if (!window.confirm(`Are you sure you want to remove '${file.filePath}' from the index registry?`)) {
      return;
    }
    try {
      await removeCustomFile(idOrPath);
      displayMessage(`Removed '${file.filePath}' from index.`);
      if (viewingFile?.filePath === file.filePath) {
        setViewingFile(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Folder and File Upload Handlers
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const parsedList = [];
    for (const file of files) {
      const relativePath = file.webkitRelativePath || file.name;
      if (relativePath.includes("node_modules") || relativePath.includes(".git") || relativePath.includes("dist")) {
        continue;
      }
      try {
        const text = await file.text();
        let mod = "General";
        const lPath = relativePath.toLowerCase();
        if (lPath.includes("controller")) mod = "Controllers";
        else if (lPath.includes("service")) mod = "Services";
        else if (lPath.includes("model")) mod = "Models";
        else if (lPath.includes("middleware")) mod = "Middlewares";
        else if (lPath.includes("test") || lPath.includes("spec")) mod = "Tests";
        else if (lPath.includes("route") || lPath.includes("api")) mod = "Routes";
        else if (lPath.includes("util") || lPath.includes("helper")) mod = "Utils";

        parsedList.push({
          filePath: relativePath,
          content: text,
          module: mod,
          sizeBytes: file.size,
          lineCount: text.split("\n").length,
        });
      } catch (err) {
        console.warn("Could not read file:", file.name, err);
      }
    }

    setUploadedFilesPreview(parsedList);
    setShowBatchModal(true);
    e.target.value = null;
  };

  const handleConfirmBatchUpload = async () => {
    if (uploadedFilesPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      await batchAddCustomFiles(uploadedFilesPreview);
      setShowBatchModal(false);
      setUploadedFilesPreview([]);
      displayMessage(`Successfully indexed ${uploadedFilesPreview.length} files with root paths!`);
    } catch (err) {
      alert("Error uploading files: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParseRawBatchPaste = () => {
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
            module: path.toLowerCase().includes("controller") ? "Controllers" : path.toLowerCase().includes("service") ? "Services" : "General",
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

    setUploadedFilesPreview(result);
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <>
      <Navbar />

      <div
        style={{
          display: "flex",
          background: "#0B1220",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        <Sidebar />

        <div style={{ flex: 1, padding: "30px", maxWidth: "1600px", margin: "0 auto" }}>
          {/* Header Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "25px", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <FolderTree size={28} color="#818CF8" />
                <h1 style={{ fontSize: "28px", margin: 0 }}>Codebase Indexer & File Registry</h1>
              </div>
              <p style={{ color: "#9CA3AF", margin: 0, fontSize: "14px", lineHeight: "1.6" }}>
                Explicitly add, upload, or paste source files and configure their relative path to root (e.g. <code>src/controllers/orderController.js</code>).
                These files feed directly into Gemini AI requirement and impact analysis.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedRepo?.id || "repo-1"}
                onChange={(e) => {
                  const repo = repositories.find((r) => r.id === e.target.value);
                  if (repo) setSelectedRepo(repo);
                }}
                style={{
                  padding: "10px 14px",
                  background: "#1F2937",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    📦 {r.name} ({r.branch})
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleOpenAddModal()}
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "14px" }}
              >
                <Plus size={16} /> Add File (Specify Path)
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="primary-btn"
                style={{
                  background: "#1F2937",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                }}
              >
                <UploadCloud size={16} /> Upload Folder / Files
              </button>

              <input
                ref={folderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                style={{ display: "none" }}
                onChange={handleFilesSelected}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFilesSelected}
              />

              <button
                onClick={() => {
                  setUploadedFilesPreview([]);
                  setBatchRawText("");
                  setShowBatchModal(true);
                }}
                className="primary-btn"
                style={{
                  background: "rgba(79, 70, 229, 0.15)",
                  color: "#818CF8",
                  border: "1px solid rgba(129, 140, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                }}
              >
                <Terminal size={16} /> Batch Paste
              </button>

              <button
                onClick={() => runRepoScan(selectedRepo?.id)}
                className="primary-btn"
                style={{
                  background: "#1F2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#9CA3AF",
                }}
                title="Scan Local Directory AST"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Action Success Toast */}
          {actionSuccessMsg && (
            <div
              style={{
                padding: "12px 18px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                borderRadius: "10px",
                color: "#22C55E",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <CheckCircle2 size={18} />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Metric Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "16px",
              marginBottom: "25px",
            }}
          >
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Tracked Files</span>
                <FileCode2 size={18} color="#818CF8" />
              </div>
              <h2 style={{ color: "#FFFFFF", margin: "10px 0 0", fontSize: "26px" }}>{repoFiles.length}</h2>
              <span style={{ color: "#22C55E", fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
                ● Indexed for AI Analysis
              </span>
            </div>

            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Lines of Code</span>
                <Code2 size={18} color="#4F46E5" />
              </div>
              <h2 style={{ color: "#FFFFFF", margin: "10px 0 0", fontSize: "26px" }}>{totalLines.toLocaleString()}</h2>
              <span style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
                Across {repoFiles.length} source files
              </span>
            </div>

            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Extracted Functions / Symbols</span>
                <Layers size={18} color="#F59E0B" />
              </div>
              <h2 style={{ color: "#FFFFFF", margin: "10px 0 0", fontSize: "26px" }}>{totalFunctions}</h2>
              <span style={{ color: "#F59E0B", fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
                AST callable symbols
              </span>
            </div>

            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Repository Scope</span>
                <FolderGit2 size={18} color="#22C55E" />
              </div>
              <h2 style={{ color: "#FFFFFF", margin: "10px 0 0", fontSize: "22px" }}>{selectedRepo?.name}</h2>
              <span style={{ color: "#818CF8", fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
                Branch: {selectedRepo?.branch}
              </span>
            </div>
          </div>

          {/* Preset Samples Bar */}
          <div className="card" style={{ padding: "18px 20px", marginBottom: "25px", border: "1px dashed rgba(129, 140, 248, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#E0E7FF", fontSize: "14px", fontWeight: 600 }}>
                <Sparkles size={16} color="#818CF8" /> Quick Add Enterprise Presets & Sample Files:
              </div>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Click any preset to prefill path to root & sample code</span>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {PRESET_SNIPPETS.map((preset) => (
                <button
                  key={preset.filePath}
                  onClick={() => handleOpenAddModal(preset)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(31, 41, 55, 0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#D1D5DB",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#818CF8")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  <FileCheck size={14} color="#818CF8" />
                  <span>{preset.title}</span>
                  <code style={{ fontSize: "11px", color: "#818CF8", background: "rgba(129,140,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                    {preset.filePath}
                  </code>
                </button>
              ))}
            </div>
          </div>

          {/* Explorer Bar: Search & Filter Tabs */}
          <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "16px" }}>
              {/* Search */}
              <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
                <Search size={16} color="#9CA3AF" style={{ position: "absolute", left: "14px", top: "13px" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by path to root (e.g. src/controllers/...), module, or function..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Link to Analysis */}
              <button
                onClick={() => navigate("/requirements")}
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
              >
                Analyze Requirements with These Files <ArrowRight size={14} />
              </button>
            </div>

            {/* Module Filter Pills */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {["ALL", ...MODULE_OPTIONS].map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveModuleFilter(mod)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    background: activeModuleFilter === mod ? "#4F46E5" : "#1F2937",
                    color: activeModuleFilter === mod ? "#FFFFFF" : "#9CA3AF",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "0.2s",
                  }}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          {/* Files Registry Table */}
          <div className="card" style={{ padding: "20px" }}>
            {isLoadingFiles ? (
              <Loader text="Loading codebase files and AST index..." />
            ) : filteredFiles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px" }}>
                <FileCode2 size={42} color="#6B7280" style={{ marginBottom: "12px" }} />
                <h3 style={{ color: "#E5E7EB", margin: "0 0 8px" }}>No files match your filter</h3>
                <p style={{ color: "#9CA3AF", fontSize: "14px", margin: "0 0 20px" }}>
                  Add a custom file with path to root or click "Upload Folder / Files" to register files.
                </p>
                <button onClick={() => handleOpenAddModal()} className="primary-btn">
                  <Plus size={16} /> Add First Code File
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#F3F4F6", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ color: "#9CA3AF", borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                      <th style={{ padding: "12px 14px" }}>Path to Root</th>
                      <th style={{ padding: "12px 14px" }}>Module / Role</th>
                      <th style={{ padding: "12px 14px" }}>Lines</th>
                      <th style={{ padding: "12px 14px" }}>Extracted Functions / Exports</th>
                      <th style={{ padding: "12px 14px" }}>Source</th>
                      <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file, idx) => {
                      const rootPath = file.filePath || file.rootPath;
                      const isTest = file.isTestFile || /test|spec/.test(rootPath);
                      const fns = file.functions || [];

                      return (
                        <tr
                          key={file.id || rootPath || idx}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                            transition: "0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(79, 70, 229, 0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent")}
                        >
                          <td style={{ padding: "14px", fontFamily: "monospace" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <FileCode2 size={16} color={isTest ? "#F59E0B" : "#818CF8"} />
                              <strong style={{ color: "#FFFFFF", fontSize: "14px" }}>{rootPath}</strong>
                              <button
                                onClick={() => handleCopyPath(rootPath)}
                                title="Copy root path"
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#6B7280",
                                  cursor: "pointer",
                                  padding: "2px",
                                }}
                              >
                                {copiedPath === rootPath ? <Check size={12} color="#22C55E" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                              Root: <code>/ {rootPath}</code>
                            </div>
                          </td>

                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background:
                                  file.module === "Controllers"
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : file.module === "Services"
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : file.module === "Tests"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "rgba(16, 185, 129, 0.15)",
                                color:
                                  file.module === "Controllers"
                                    ? "#EF4444"
                                    : file.module === "Services"
                                    ? "#60A5FA"
                                    : file.module === "Tests"
                                    ? "#F59E0B"
                                    : "#34D399",
                              }}
                            >
                              {file.module || "General"}
                            </span>
                          </td>

                          <td style={{ padding: "14px", color: "#D1D5DB" }}>{file.lineCount || 1} lines</td>

                          <td style={{ padding: "14px" }}>
                            {fns.length > 0 ? (
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxWidth: "340px" }}>
                                {fns.slice(0, 3).map((fn, i) => (
                                  <code
                                    key={i}
                                    style={{
                                      fontSize: "11px",
                                      background: "#1F2937",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      color: "#C7D2FE",
                                    }}
                                  >
                                    {fn}()
                                  </code>
                                ))}
                                {fns.length > 3 && (
                                  <span style={{ fontSize: "11px", color: "#9CA3AF" }}>+{fns.length - 3} more</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#6B7280", fontSize: "12px" }}>Auto-extracted</span>
                            )}
                          </td>

                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                color: file.isExplicit ? "#22C55E" : "#9CA3AF",
                                fontWeight: 500,
                              }}
                            >
                              {file.isExplicit ? "Explicit Custom" : "Scanned Local"}
                            </span>
                          </td>

                          <td style={{ padding: "14px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                              <button
                                onClick={() => setViewingFile(file)}
                                title="View Code Content"
                                style={{
                                  background: "rgba(31, 41, 55, 0.8)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#818CF8",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                <Eye size={13} /> View
                              </button>

                              <button
                                onClick={() => {
                                  setFilePathInput(file.filePath || file.rootPath);
                                  setModuleInput(file.module || "General");
                                  setCodeInput(file.content || "");
                                  setShowAddModal(true);
                                }}
                                title="Edit File and Root Path"
                                style={{
                                  background: "rgba(31, 41, 55, 0.8)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#E5E7EB",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                <Edit3 size={13} /> Edit
                              </button>

                              <button
                                onClick={() => handleDeleteFile(file)}
                                title="Remove File"
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "1px solid rgba(239, 68, 68, 0.2)",
                                  color: "#EF4444",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Explicit File Creator / Editor */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              background: "#111827",
              border: "1px solid rgba(129, 140, 248, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileCode2 size={24} color="#818CF8" />
                <h2 style={{ margin: 0, fontSize: "20px" }}>Explicit File & Root Path Configuration</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFile} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Path to Root Input */}
              <div>
                <label style={{ display: "block", color: "#E5E7EB", marginBottom: "6px", fontSize: "14px", fontWeight: 600 }}>
                  Relative Path to Root <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  placeholder="e.g. src/controllers/orderController.js or services/payment.js"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                  required
                />
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#9CA3AF" }}>
                  Target path in index: <code>&lt;project_root&gt;/{filePathInput.trim().replace(/^[\/\\]+/, "") || "..."}</code>
                </div>
              </div>

              {/* Module Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", color: "#E5E7EB", marginBottom: "6px", fontSize: "14px", fontWeight: 600 }}>
                    Module / Role Tag
                  </label>
                  <select
                    value={moduleInput}
                    onChange={(e) => setModuleInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  >
                    {MODULE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", color: "#E5E7EB", marginBottom: "6px", fontSize: "14px", fontWeight: 600 }}>
                    Target Repository
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedRepo?.name} (${selectedRepo?.branch})`}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(31, 41, 55, 0.5)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      color: "#9CA3AF",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Code Content Editor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ color: "#E5E7EB", fontSize: "14px", fontWeight: 600 }}>
                    Source Code / Snippet
                  </label>
                  <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                    {codeInput.split("\n").length} lines • {codeInput.length} chars
                  </span>
                </div>

                <textarea
                  rows={14}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Paste or write the source code here..."
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#030712",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#A7F3D0",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {formError && (
                <div style={{ color: "#EF4444", fontSize: "13px" }}>{formError}</div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "10px 18px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#D1D5DB",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-btn"
                  style={{ padding: "10px 24px" }}
                >
                  {isSubmitting ? "Indexing Code..." : "Save & Index File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Upload & Paste Modal */}
      {showBatchModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              background: "#111827",
              border: "1px solid rgba(129, 140, 248, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <UploadCloud size={24} color="#818CF8" />
                <h2 style={{ margin: 0, fontSize: "20px" }}>Batch Upload / Paste Multiple Files</h2>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {uploadedFilesPreview.length > 0 ? (
              <div>
                <p style={{ color: "#9CA3AF", marginBottom: "15px", fontSize: "14px" }}>
                  Review {uploadedFilesPreview.length} extracted files and their paths to root before indexing:
                </p>

                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", marginBottom: "20px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", color: "white", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#1F2937", color: "#9CA3AF", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>Root Path</th>
                        <th style={{ padding: "8px 12px" }}>Module</th>
                        <th style={{ padding: "8px 12px" }}>Lines</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFilesPreview.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{item.filePath}</td>
                          <td style={{ padding: "8px 12px" }}>{item.module}</td>
                          <td style={{ padding: "8px 12px" }}>{item.lineCount}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <button
                              onClick={() => setUploadedFilesPreview((prev) => prev.filter((_, i) => i !== idx))}
                              style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    onClick={() => setUploadedFilesPreview([])}
                    style={{ padding: "10px 18px", background: "#1F2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#D1D5DB", cursor: "pointer" }}
                  >
                    Back to Paste
                  </button>
                  <button
                    onClick={handleConfirmBatchUpload}
                    disabled={isSubmitting}
                    className="primary-btn"
                    style={{ padding: "10px 24px" }}
                  >
                    {isSubmitting ? "Indexing..." : `Index All ${uploadedFilesPreview.length} Files`}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: "#9CA3AF", marginBottom: "15px", fontSize: "14px" }}>
                  Paste multiple files formatted with headers (e.g. <code>--- src/services/auth.js ---</code>):
                </p>

                <textarea
                  rows={12}
                  value={batchRawText}
                  onChange={(e) => setBatchRawText(e.target.value)}
                  placeholder={`--- src/controllers/orderController.js ---
export const checkout = () => {};

--- src/services/paymentService.js ---
export const charge = () => {};`}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#030712",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#A7F3D0",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    marginBottom: "20px",
                    boxSizing: "border-box",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(129, 140, 248, 0.5)",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      color: "#818CF8",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <UploadCloud size={15} /> Select local files from disk
                  </button>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setShowBatchModal(false)}
                      style={{ padding: "10px 18px", background: "#1F2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#D1D5DB", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button onClick={handleParseRawBatchPaste} className="primary-btn" style={{ padding: "10px 20px" }}>
                      Parse & Preview Files
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: View File Code Modal */}
      {viewingFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              background: "#0D1117",
              border: "1px solid rgba(129, 140, 248, 0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileCode2 size={20} color="#818CF8" />
                  <code style={{ fontSize: "16px", color: "#FFFFFF", fontWeight: "bold" }}>
                    {viewingFile.filePath || viewingFile.rootPath}
                  </code>
                </div>
                <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                  Module: <strong>{viewingFile.module}</strong> • Lines: <strong>{viewingFile.lineCount || (viewingFile.content || "").split("\n").length}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => handleCopyPath(viewingFile.content || "")}
                  style={{
                    padding: "6px 12px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#D1D5DB",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Copy size={13} /> Copy Code
                </button>
                <button
                  onClick={() => setViewingFile(null)}
                  style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#030712",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "16px",
                maxHeight: "500px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.6",
                color: "#A7F3D0",
                whiteSpace: "pre-wrap",
              }}
            >
              {viewingFile.content || "// Code content not stored for locally scanned file."}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", gap: "10px" }}>
              <button
                onClick={() => {
                  const f = viewingFile;
                  setViewingFile(null);
                  setFilePathInput(f.filePath || f.rootPath);
                  setModuleInput(f.module || "General");
                  setCodeInput(f.content || "");
                  setShowAddModal(true);
                }}
                className="primary-btn"
                style={{ padding: "8px 18px", fontSize: "13px" }}
              >
                <Edit3 size={14} /> Edit This File
              </button>
              <button
                onClick={() => setViewingFile(null)}
                style={{ padding: "8px 18px", background: "#1F2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#D1D5DB", cursor: "pointer", fontSize: "13px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CodebaseFiles;
