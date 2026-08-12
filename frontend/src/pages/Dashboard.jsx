import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MetricCard from "../components/MetricCard";
import AIStatus from "../components/AIStatus";
import { useAnalysis } from "../context/AnalysisContext";
import { Sparkles, ArrowRight, FolderGit2, CheckCircle2, RefreshCw, GitBranch, FolderTree, Plus } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    history,
    dashboardStats,
    requirementId,
    brdText,
    repoFiles,
    isAnalyzing,
    lastUpdated,
    isLiveSyncing,
    runRepoScan,
    runImpactAnalysis,
  } = useAnalysis();

  const [syncing, setSyncing] = useState(false);

  const handleAnalyzeClick = async () => {
    try {
      await runImpactAnalysis(brdText, selectedRepo?.id, requirementId);
      navigate("/impact-analysis");
    } catch (err) {
      console.error(err);
      navigate("/requirements");
    }
  };

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

  const totalFiles = repoFiles.length || dashboardStats?.totalTrackedFiles || repositories.reduce((acc, r) => acc + (r.filesCount || 0), 0);
  const liveConnectedRepos = dashboardStats?.connectedRepos ?? repositories.length;
  const liveRequirements = dashboardStats?.indexedRequirements ?? history.length + 15;
  const liveAIReviewScore = dashboardStats?.aiReviewScore ?? '96%';
  const liveCoverage = dashboardStats?.repoTestCoverage ?? selectedRepo?.coverage ?? '91%';

  return (
    <>
      <Navbar />

      <div className="dashboard-shell">
        <Sidebar />

        <div className="dashboard-main">
          <div className="hero-panel" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ maxWidth: "760px" }}>
                <div className="stat-chip" style={{ marginBottom: "12px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLiveSyncing ? "#F59E0B" : "#22C55E" }} />
                  {isLiveSyncing ? "Syncing live data…" : `Live data • Updated ${lastUpdated || 'just now'}`}
                </div>
                <h1 style={{ fontSize: "30px", marginBottom: "8px", margin: 0 }}>
                  Welcome back, {selectedRepo?.name || 'ImpactIQ'}
                </h1>
                <p style={{ color: "#E2E8F0", marginTop: "6px", margin: 0, lineHeight: 1.6 }}>
                  Your AI workspace is tracking the latest repository signals, impact analysis results, and review health in real time.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="stat-chip">Active Repo: {selectedRepo?.name || 'impactiq-backend'}</span>
                <select
                  value={selectedRepo?.id || "repo-1"}
                  onChange={(e) => {
                    const repo = repositories.find((r) => r.id === e.target.value);
                    if (repo) setSelectedRepo(repo);
                  }}
                  style={{ padding: "10px 14px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
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

          <div className="metric-grid">
            <MetricCard title="Connected Repos" value={liveConnectedRepos.toString()} subtitle={`${selectedRepo?.name || 'impactiq-backend'} active`} color="#22C55E" />
            <MetricCard title="Indexed Requirements" value={liveRequirements.toString()} subtitle="Jira & BRD stories synced" color="#4F46E5" />
            <MetricCard title="AI Review Score" value={liveAIReviewScore} subtitle="Live Gemini review signal" color="#F59E0B" />
            <MetricCard title="Repo Test Coverage" value={liveCoverage} subtitle={`${totalFiles} tracked files`} color="#38BDF8" />
          </div>

          {/* Main Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
            }}
          >
            {/* Left */}
            <div>
              {/* Repository Card */}
              <div className="card" style={{ padding: "25px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <FolderGit2 size={22} color="#818CF8" />
                    <h2 style={{ margin: 0, fontSize: "18px" }}>Connected Repository & Codebase Files</h2>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => navigate("/files")}
                      style={{
                        background: "rgba(79, 70, 229, 0.15)",
                        border: "1px solid rgba(129, 140, 248, 0.3)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        color: "#818CF8",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      <FolderTree size={13} /> Manage Files ({totalFiles})
                    </button>

                    <button
                      onClick={handleSyncRepo}
                      disabled={syncing}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        color: "#9CA3AF",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={13} className={syncing ? "spin" : ""} />
                      {syncing ? "Scanning Codebase..." : "Sync AST"}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: "18px" }}>
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#F3F4F6" }}>{selectedRepo?.name}</h3>
                  <p style={{ color: "#9CA3AF", marginTop: "6px", fontSize: "14px", margin: 0 }}>
                    Branch: <strong style={{ color: "#E5E7EB" }}>{selectedRepo?.branch}</strong> • Tracked Code Files: <strong style={{ color: "#E5E7EB" }}>{totalFiles} files with root path</strong>
                  </p>
                  <p style={{ color: "#22C55E", marginTop: "8px", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={15} /> ● {selectedRepo?.status || "Connected"} (AST Vector Index Active)
                  </p>
                </div>
              </div>

              {/* Requirement Card */}
              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2>Current Active Requirement</h2>
                  <span
                    style={{
                      background: "rgba(79, 70, 229, 0.15)",
                      color: "#818CF8",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {requirementId}
                  </span>
                </div>

                <p
                  style={{
                    color: "#D1D5DB",
                    marginTop: "14px",
                    lineHeight: "1.6",
                    fontSize: "14px",
                  }}
                >
                  {brdText.substring(0, 180)}...
                </p>

                <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="primary-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      opacity: isAnalyzing ? 0.7 : 1,
                    }}
                  >
                    <Sparkles size={16} />
                    {isAnalyzing ? "Gemini AI Analyzing..." : "Run Impact Analysis"}
                  </button>

                  <button
                    onClick={() => navigate("/requirements")}
                    className="primary-btn"
                    style={{
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    Edit / Switch Story <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Recent Analysis Table */}
              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px" }}>Recent AI Analysis History</h2>
                  <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Live Synced</span>
                </div>

                <table
                  style={{
                    width: "100%",
                    color: "white",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ color: "#9CA3AF", fontSize: "13px" }}>
                      <th align="left" style={{ paddingBottom: "10px" }}>Story / Title</th>
                      <th align="left" style={{ paddingBottom: "10px" }}>Status</th>
                      <th align="left" style={{ paddingBottom: "10px" }}>Confidence</th>
                      <th align="right" style={{ paddingBottom: "10px" }}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          fontSize: "14px",
                        }}
                      >
                        <td style={{ padding: "14px 0" }}>
                          <div style={{ fontWeight: 600, color: "#F3F4F6" }}>{item.requirementId}</div>
                          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{item.title}</div>
                        </td>

                        <td>
                          <span
                            style={{
                              color: item.status === "Completed" ? "#22C55E" : "#F59E0B",
                              fontWeight: 600,
                              fontSize: "13px",
                            }}
                          >
                            ● {item.status}
                          </span>
                        </td>

                        <td style={{ color: "#818CF8", fontWeight: 600 }}>{item.confidence}</td>

                        <td align="right">
                          <button
                            onClick={() => navigate("/impact-analysis")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#818CF8",
                              cursor: "pointer",
                              fontSize: "13px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            View Map <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right */}
            <div>
              <AIStatus />

              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <button
                  onClick={() => navigate("/files")}
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginBottom: "14px",
                    background: "rgba(79, 70, 229, 0.15)",
                    border: "1px solid rgba(129, 140, 248, 0.3)",
                    color: "#818CF8",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FolderTree size={16} /> Codebase Files & Root Paths
                </button>

                <button
                  onClick={() => navigate("/requirements")}
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginBottom: "14px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Sparkles size={16} /> New Requirement Analysis
                </button>

                <button
                  onClick={() => navigate("/code-review")}
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginBottom: "14px",
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <GitBranch size={16} /> AI Code Pre-Review
                </button>

                <button
                  onClick={() => navigate("/pr-generator")}
                  className="primary-btn"
                  style={{
                    width: "100%",
                    background: "#059669",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Draft Pull Request
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;