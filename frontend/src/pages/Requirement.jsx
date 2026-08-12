import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIStatus from "../components/AIStatus";
import Loader from "../components/Loader";
import { useAnalysis } from "../context/AnalysisContext";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, FolderTree, Plus, FileCode } from "lucide-react";

const PRESETS = [
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

const Requirement = () => {
  const navigate = useNavigate();
  const {
    requirementId,
    setRequirementId,
    brdText,
    setBrdText,
    selectedRepo,
    repoFiles,
    isAnalyzing,
    analysisResult,
    analysisError,
    runImpactAnalysis,
  } = useAnalysis();

  const [selectedPreset, setSelectedPreset] = useState("JIRA-241");

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setRequirementId(preset.id);
    setBrdText(preset.text);
  };

  const handleAnalyze = async () => {
    try {
      await runImpactAnalysis(brdText);
      navigate("/impact-analysis");
    } catch (err) {
      console.error(err);
    }
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

        <div
          style={{
            flex: 1,
            padding: "30px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h1 style={{ fontSize: "28px", margin: 0 }}>Requirement Analysis</h1>
              <p
                style={{
                  color: "#9CA3AF",
                  marginTop: "6px",
                  margin: 0,
                }}
              >
                Analyze BRD documents or Jira stories to identify candidate impacted files across <strong>{selectedRepo?.name}</strong> using Gemini AI.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => navigate("/files")}
                className="primary-btn"
                style={{
                  background: "rgba(79, 70, 229, 0.15)",
                  border: "1px solid rgba(129, 140, 248, 0.3)",
                  color: "#818CF8",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FolderTree size={16} /> Codebase Files ({repoFiles.length})
              </button>

              {analysisResult && (
                <button
                  onClick={() => navigate("/impact-analysis")}
                  className="primary-btn"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  View Latest Impact Report <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}>
            {/* Left Column: Form & Presets */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Active Root Files Context Bar */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#9CA3AF", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FolderTree size={14} color="#818CF8" /> Target Codebase Files (Relative to Root):
                  </span>
                  <button
                    onClick={() => navigate("/files")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#818CF8",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Plus size={12} /> Add / Edit Files
                  </button>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {repoFiles.slice(0, 5).map((f, i) => (
                    <code
                      key={i}
                      style={{
                        background: "#1F2937",
                        color: "#C7D2FE",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {f.filePath || f.rootPath}
                    </code>
                  ))}
                  {repoFiles.length > 5 && (
                    <span style={{ color: "#9CA3AF", fontSize: "12px", alignSelf: "center" }}>
                      +{repoFiles.length - 5} more files indexed
                    </span>
                  )}
                </div>
              </div>

              {/* Presets Bar */}
              <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#E5E7EB" }}>
                  💡 Select Sample Jira Story / Requirement:
                </h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        background: selectedPreset === p.id ? "#4F46E5" : "#1F2937",
                        color: selectedPreset === p.id ? "#FFFFFF" : "#9CA3AF",
                        border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        transition: "0.2s",
                      }}
                    >
                      {p.id}: {p.title.substring(0, 28)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement Input */}
              <div className="card" style={{ padding: "25px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h2>Requirement / BRD Specification</h2>
                  <input
                    type="text"
                    value={requirementId}
                    onChange={(e) => setRequirementId(e.target.value)}
                    placeholder="Requirement ID (e.g. JIRA-241)"
                    style={{
                      padding: "8px 14px",
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  />
                </div>

                <textarea
                  rows={8}
                  value={brdText}
                  onChange={(e) => setBrdText(e.target.value)}
                  placeholder="Paste your Business Requirement Document (BRD) or Jira story text here..."
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    resize: "vertical",
                    boxSizing: "border-box",
                    marginBottom: "20px",
                  }}
                />

                {analysisError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      color: "#EF4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    <AlertCircle size={18} />
                    <span>{analysisError}</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !brdText.trim()}
                    className="primary-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 28px",
                      fontSize: "15px",
                      opacity: isAnalyzing || !brdText.trim() ? 0.7 : 1,
                      cursor: isAnalyzing || !brdText.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    <Sparkles size={18} />
                    {isAnalyzing ? "Gemini AI Analyzing..." : "Analyze Requirement with AI"}
                  </button>

                  {analysisResult && !isAnalyzing && (
                    <span style={{ color: "#22C55E", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
                      <CheckCircle2 size={16} /> Analysis ready!
                    </span>
                  )}
                </div>
              </div>

              {isAnalyzing && (
                <div className="card" style={{ padding: "20px" }}>
                  <Loader text="Gemini AI Agent is indexing candidate files and generating impact map..." />
                </div>
              )}
            </div>

            {/* Right Column: Workflow status */}
            <div>
              <AIStatus />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Requirement;