import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ReviewCard from "../components/ReviewCard";
import MarkdownView from "../components/MarkdownView";
import Loader from "../components/Loader";
import { useAnalysis } from "../context/AnalysisContext";
import { Sparkles, ArrowRight, ShieldCheck, FileCode, AlertCircle } from "lucide-react";

const CodeReview = () => {
  const navigate = useNavigate();
  const {
    requirementId,
    gitDiff,
    setGitDiff,
    isReviewing,
    reviewResult,
    reviewData,
    reviewError,
    runCodeReview,
  } = useAnalysis();

  const handleReview = async () => {
    try {
      await runCodeReview(gitDiff, requirementId);
    } catch (err) {
      console.error(err);
    }
  };

  const score = reviewData?.qualityScore || "95/100";
  const risk = reviewData?.regressionRisk || "Low-Med";
  const security = reviewData?.securityStatus || "Pass";
  const testGaps = reviewData?.testGapsCount ? `${reviewData.testGapsCount} Missing` : "1 Missing";

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
            <div>
              <h1 style={{ fontSize: "28px", margin: 0 }}>AI Senior Staff Pre-Review</h1>
              <p
                style={{
                  color: "#9CA3AF",
                  marginTop: "6px",
                  margin: 0,
                }}
              >
                Automated pre-review performing AST inspection, regression risk analysis, and draft PR generation.
              </p>
            </div>

            <button
              onClick={() => navigate("/pr-generator")}
              className="primary-btn"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              Generate Draft PR <ArrowRight size={16} />
            </button>
          </div>

          {/* Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "20px",
              marginBottom: "25px",
            }}
          >
            <ReviewCard title="Quality Score" value={score} color="#22C55E" />
            <ReviewCard title="Regression Risk" value={risk} color="#F59E0B" />
            <ReviewCard title="Test Gap Detection" value={testGaps} color="#818CF8" />
            <ReviewCard title="Security Clearance" value={security} color="#22C55E" />
          </div>

          {/* Diff Input Section */}
          <div className="card" style={{ padding: "25px", marginBottom: "25px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileCode size={20} color="#818CF8" />
                <h2 style={{ margin: 0 }}>Committed Git Diff to Review</h2>
              </div>
              <span style={{ color: "#9CA3AF", fontSize: "13px" }}>
                Linked Story: <strong>{requirementId}</strong>
              </span>
            </div>

            <textarea
              rows={7}
              value={gitDiff}
              onChange={(e) => setGitDiff(e.target.value)}
              placeholder="Paste raw Git diff output here..."
              style={{
                width: "100%",
                padding: "16px",
                background: "#1F2937",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#A7F3D0",
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: "20px",
              }}
            />

            {reviewError && (
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
                <span>{reviewError}</span>
              </div>
            )}

            <button
              onClick={handleReview}
              disabled={isReviewing || !gitDiff.trim()}
              className="primary-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 28px",
                fontSize: "15px",
                opacity: isReviewing || !gitDiff.trim() ? 0.7 : 1,
              }}
            >
              <Sparkles size={18} />
              {isReviewing ? "Gemini AI Reviewing Diff..." : "Run AI Pre-Review on Diff"}
            </button>
          </div>

          {/* Review Report */}
          <div
            className="card"
            style={{
              padding: "25px",
              border: "1px solid rgba(129, 140, 248, 0.3)",
              background: "linear-gradient(180deg, rgba(30, 27, 75, 0.3) 0%, rgba(17, 24, 39, 1) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={22} color="#22C55E" />
                <h2 style={{ margin: 0 }}>Senior AI Review Report</h2>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22C55E",
                  borderRadius: "20px",
                  fontWeight: 600,
                }}
              >
                {reviewResult ? "Review Completed" : "Ready for Execution"}
              </span>
            </div>

            {isReviewing ? (
              <Loader text="Senior Staff AI Agent is analyzing diff for code quality, regressions, and test gaps..." />
            ) : reviewResult ? (
              <MarkdownView content={reviewResult} />
            ) : (
              <div>
                <p style={{ color: "#9CA3AF", marginBottom: "15px" }}>
                  Click &ldquo;Run AI Pre-Review on Diff&rdquo; above to generate a real-time Gemini AI report covering:
                </p>
                <ul style={{ color: "#D1D5DB", lineHeight: "2", marginLeft: "15px" }}>
                  <li>✔ <strong>Standards & Code Quality</strong>: Linting, naming conventions, and best practices.</li>
                  <li>✔ <strong>Regression Risk</strong>: Potential broken contracts, callers, and backward compatibility.</li>
                  <li>✔ <strong>Test Gaps</strong>: Uncovered branches and boundary conditions.</li>
                  <li>✔ <strong>Draft PR Description</strong>: Structured summary ready for GitHub PR.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeReview;