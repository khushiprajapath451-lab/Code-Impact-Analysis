import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Bot,
  ShieldCheck,
  FileCode2,
  BarChart3,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    title: "Requirement",
    path: "/requirements",
    icon: <FileText size={20} />,
  },
  {
    title: "Impact Analysis",
    path: "/impact-analysis",
    icon: <GitBranch size={20} />,
  },
  {
    title: "AI Agents",
    path: "/agents",
    icon: <Bot size={20} />,
  },
  {
    title: "Code Review",
    path: "/code-review",
    icon: <ShieldCheck size={20} />,
  },
  {
    title: "PR Generator",
    path: "/pr-generator",
    icon: <FileCode2 size={20} />,
  },
  {
    title: "Analytics",
    path: "/analytics",
    icon: <BarChart3 size={20} />,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: <Settings size={20} />,
  },
];

const Sidebar = () => {
  return (
    <aside
      style={{
        width: "250px",
        background: "#111827",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        minHeight: "calc(100vh - 72px)",
        padding: "25px 15px",
      }}
    >
      <p
        style={{
          color: "#9CA3AF",
          fontSize: "13px",
          marginBottom: "20px",
          letterSpacing: "1px",
        }}
      >
        AI WORKSPACE
      </p>

      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 18px",
            marginBottom: "10px",
            borderRadius: "12px",
            textDecoration: "none",
            color: isActive ? "#ffffff" : "#9CA3AF",
            background: isActive ? "#4F46E5" : "transparent",
            transition: "0.3s",
            fontWeight: 500,
          })}
        >
          {item.icon}
          {item.title}
        </NavLink>
      ))}

      {/* AI Status */}
      <div
        style={{
          marginTop: "40px",
          padding: "18px",
          borderRadius: "15px",
          background: "#1F2937",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h4 style={{ marginBottom: "12px" }}>🤖 AI Status</h4>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#22C55E",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#22C55E",
            }}
          ></span>

          All Agents Online
        </div>

        <p
          style={{
            marginTop: "12px",
            color: "#9CA3AF",
            fontSize: "13px",
          }}
        >
          Ready to analyze requirements and review code.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;