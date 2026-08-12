import { CheckCircle2, Clock3, Loader2, AlertCircle, PlayCircle, Sparkles } from "lucide-react";
import { useAnalysis } from "../context/AnalysisContext";

const AIStatus = () => {
  const { workflow } = useAnalysis();

  const getAgentConfig = (name, status) => {
    let icon;
    let statusColor;

    switch (status) {
      case "Completed":
        icon = <CheckCircle2 color="#22C55E" size={18} />;
        statusColor = "#22C55E";
        break;
      case "Running":
        icon = <Loader2 color="#F59E0B" size={18} style={{ animation: "spin 1s linear infinite" }} />;
        statusColor = "#F59E0B";
        break;
      case "Failed":
        icon = <AlertCircle color="#EF4444" size={18} />;
        statusColor = "#EF4444";
        break;
      case "Ready":
        icon = <PlayCircle color="#818CF8" size={18} />;
        statusColor = "#818CF8";
        break;
      default:
        icon = <Clock3 color="#9CA3AF" size={18} />;
        statusColor = "#9CA3AF";
    }

    return { name, status, icon, statusColor };
  };

  const agents = [
    getAgentConfig("Coordinator Agent", workflow.coordinator),
    getAgentConfig("Requirement Agent", workflow.requirement),
    getAgentConfig("Impact Agent", workflow.impact),
    getAgentConfig("Review Agent", workflow.review),
    getAgentConfig("PR Generator Agent", workflow.pr),
  ];

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.95))", borderRadius: "20px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 16px 30px rgba(2,6,23,0.18)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <Sparkles size={16} color="#818CF8" />
        <h2 style={{ fontSize: "16px", margin: 0, color: "#F8FAFC" }}>AI Agent Workflow</h2>
      </div>

      {agents.map((agent, index) => (
        <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: index !== agents.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {agent.icon}
            <span style={{ fontSize: "13px", color: "#E5E7EB" }}>{agent.name}</span>
          </div>
          <span style={{ color: agent.statusColor, fontWeight: "700", fontSize: "12px" }}>{agent.status}</span>
        </div>
      ))}

      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ color: "#9CA3AF", fontSize: "12px", margin: 0 }}>Overall Progress</p>
          <p style={{ color: workflow.progress === 100 ? "#22C55E" : "#818CF8", fontWeight: "700", fontSize: "12px", margin: 0 }}>{workflow.progress}%</p>
        </div>
        <div style={{ width: "100%", height: "10px", background: "#1F2937", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ width: `${workflow.progress}%`, height: "100%", background: workflow.progress === 100 ? "#22C55E" : "linear-gradient(90deg, #4F46E5, #7C3AED)", transition: "width 0.5s ease-in-out" }}></div>
        </div>
      </div>
    </div>
  );
};

export default AIStatus;