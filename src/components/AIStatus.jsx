import { CheckCircle2, Clock3, Loader2 } from "lucide-react";

const agents = [
  {
    name: "Coordinator Agent",
    status: "Completed",
    icon: <CheckCircle2 color="#22C55E" size={20} />,
  },
  {
    name: "Requirement Agent",
    status: "Completed",
    icon: <CheckCircle2 color="#22C55E" size={20} />,
  },
  {
    name: "Impact Agent",
    status: "Running",
    icon: <Loader2 color="#F59E0B" size={20} className="spin" />,
  },
  {
    name: "Review Agent",
    status: "Waiting",
    icon: <Clock3 color="#9CA3AF" size={20} />,
  },
  {
    name: "PR Generator Agent",
    status: "Waiting",
    icon: <Clock3 color="#9CA3AF" size={20} />,
  },
];

const AIStatus = () => {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: "18px",
        padding: "24px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        🤖 AI Agent Workflow
      </h2>

      {agents.map((agent, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            paddingBottom: "12px",
            borderBottom:
              index !== agents.length - 1
                ? "1px solid rgba(255,255,255,.06)"
                : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {agent.icon}
            <span>{agent.name}</span>
          </div>

          <span
            style={{
              color:
                agent.status === "Completed"
                  ? "#22C55E"
                  : agent.status === "Running"
                  ? "#F59E0B"
                  : "#9CA3AF",
              fontWeight: "600",
            }}
          >
            {agent.status}
          </span>
        </div>
      ))}

      <div style={{ marginTop: "25px" }}>
        <p
          style={{
            marginBottom: "10px",
            color: "#9CA3AF",
          }}
        >
          Overall Progress
        </p>

        <div
          style={{
            width: "100%",
            height: "10px",
            background: "#1F2937",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "45%",
              height: "100%",
              background: "#4F46E5",
            }}
          ></div>
        </div>

        <p
          style={{
            marginTop: "8px",
            color: "#4F46E5",
            fontWeight: "600",
          }}
        >
          45% Completed
        </p>
      </div>
    </div>
  );
};

export default AIStatus;