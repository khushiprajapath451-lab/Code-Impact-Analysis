import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIStatus from "../components/AIStatus";
import { Bot, Zap, CheckCircle2, RefreshCw, Cpu } from "lucide-react";

const agentsList = [
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

const Agents = () => {
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
            <div>
              <h1 style={{ fontSize: "28px", margin: 0 }}>🤖 AI Agent Network</h1>
              <p style={{ color: "#9CA3AF", marginTop: "8px" }}>
                Multi-agent architecture coordinating impact analysis and automated pre-reviews.
              </p>
            </div>
            <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <RefreshCw size={16} /> Sync Agents
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {agentsList.map((agent) => (
                <div key={agent.id} className="card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: "rgba(79, 70, 229, 0.15)",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          color: "#4F46E5",
                        }}
                      >
                        <Bot size={26} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px" }}>{agent.name}</h3>
                        <p style={{ color: "#9CA3AF", fontSize: "14px", marginTop: "4px", margin: 0 }}>
                          {agent.role}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#22C55E",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle2 size={14} /> {agent.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "15px",
                      marginTop: "20px",
                      paddingTop: "15px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div>
                      <small style={{ color: "#9CA3AF" }}>Model Engine</small>
                      <p style={{ margin: "4px 0 0", color: "#F3F4F6", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Cpu size={14} color="#818CF8" /> {agent.model}
                      </p>
                    </div>
                    <div>
                      <small style={{ color: "#9CA3AF" }}>Tasks Processed</small>
                      <p style={{ margin: "4px 0 0", color: "#F3F4F6", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={14} color="#F59E0B" /> {agent.tasksCompleted}
                      </p>
                    </div>
                    <div>
                      <small style={{ color: "#9CA3AF" }}>Accuracy Benchmark</small>
                      <p style={{ margin: "4px 0 0", color: "#22C55E", fontWeight: 600 }}>
                        {agent.accuracy}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <AIStatus />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Agents;
