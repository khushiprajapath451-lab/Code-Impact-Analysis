import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MetricCard from "../components/MetricCard";
import { Activity, GitCommit, FileCheck, ShieldAlert } from "lucide-react";

const Analytics = () => {
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
        <div style={{ flex: 1, padding: "30px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>📊 Impact & Quality Analytics</h1>
          <p style={{ color: "#9CA3AF", marginBottom: "30px" }}>
            Real-time telemetry on code change frequency, regression risks, and review scores.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <MetricCard title="Total Diffs Analyzed" value="1,248" subtitle="Last 30 days" color="#3B82F6" />
            <MetricCard title="Defects Prevented" value="94" subtitle="Prior to merge" color="#22C55E" />
            <MetricCard title="Avg Review Turnaround" value="2.4m" subtitle="vs 4.2h human review" color="#8B5CF6" />
            <MetricCard title="High Risk Files" value="7" subtitle="Critical hot paths" color="#EF4444" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px", marginBottom: "25px" }}>
            <div className="card" style={{ padding: "25px" }}>
              <h2>🔥 Most Frequently Impacted Files</h2>
              <p style={{ color: "#9CA3AF", fontSize: "14px", marginTop: "4px", marginBottom: "20px" }}>
                Hotspot files requiring the highest testing coverage.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { file: "src/controllers/authController.js", count: 42, risk: "High" },
                  { file: "src/services/discountService.js", count: 31, risk: "High" },
                  { file: "src/models/Order.js", count: 28, risk: "Medium" },
                  { file: "src/middlewares/auth.js", count: 19, risk: "Low" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#1F2937",
                      borderRadius: "10px",
                    }}
                  >
                    <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#E5E7EB" }}>{item.file}</span>
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                      <span style={{ color: "#9CA3AF", fontSize: "13px" }}>{item.count} diffs</span>
                      <span
                        style={{
                          color: item.risk === "High" ? "#EF4444" : item.risk === "Medium" ? "#F59E0B" : "#22C55E",
                          fontWeight: 600,
                          fontSize: "13px",
                        }}
                      >
                        {item.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: "25px" }}>
              <h2>🛡️ Code Health & Reliability</h2>
              <p style={{ color: "#9CA3AF", fontSize: "14px", marginTop: "4px", marginBottom: "20px" }}>
                Quality benchmarks across active microservices.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {[
                  { label: "Unit Test Coverage", value: 91, color: "#22C55E" },
                  { label: "AI Review Acceptance Rate", value: 96, color: "#4F46E5" },
                  { label: "Linting & Standards Compliance", value: 98, color: "#3B82F6" },
                  { label: "Security Vulnerability Clearance", value: 89, color: "#F59E0B" },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", color: "#D1D5DB" }}>{item.label}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: item.color }}>{item.value}%</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#1F2937", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ width: `${item.value}%`, height: "100%", background: item.color, borderRadius: "8px" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;
