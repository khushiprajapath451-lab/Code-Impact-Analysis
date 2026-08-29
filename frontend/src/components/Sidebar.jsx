import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  FolderTree,
  Bot,
  ShieldCheck,
  FileCode2,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { title: "Codebase Files", path: "/files", icon: <FolderTree size={18} /> },
  { title: "Requirement", path: "/requirements", icon: <FileText size={18} /> },
  { title: "Impact Analysis", path: "/impact-analysis", icon: <GitBranch size={18} /> },
  { title: "AI Agents", path: "/agents", icon: <Bot size={18} /> },
  { title: "Code Review", path: "/code-review", icon: <ShieldCheck size={18} /> },
  { title: "PR Generator", path: "/pr-generator", icon: <FileCode2 size={18} /> },
  { title: "Analytics", path: "/analytics", icon: <BarChart3 size={18} /> },
  { title: "Settings", path: "/settings", icon: <Settings size={18} /> },
];

const Sidebar = () => {
  return (
    <aside style={{ width: "250px", background: "rgba(15, 23, 42, 0.78)", borderRight: "1px solid rgba(255,255,255,0.08)", minHeight: "calc(100vh - 72px)", padding: "22px 14px", backdropFilter: "blur(12px)" }}>
      <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(79, 70, 229, 0.12)", border: "1px solid rgba(129, 140, 248, 0.2)", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#C7D2FE", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>
          <Sparkles size={12} /> AI WORKSPACE
        </div>
        <p style={{ marginTop: "8px", color: "#E2E8F0", fontSize: "13px", lineHeight: 1.5 }}>Orchestrate requirements, impact maps, and reviews from a single place.</p>
      </div>

      {menuItems.map((item) => (
        <NavLink key={item.path} to={item.path} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", textDecoration: "none", color: isActive ? "#ffffff" : "#9CA3AF", background: isActive ? "linear-gradient(135deg, rgba(79,70,229,0.95), rgba(124,58,237,0.9))" : "transparent", transition: "0.3s", fontWeight: 600, border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent" })}>
          {item.icon}
          {item.title}
        </NavLink>
      ))}

      <div style={{ marginTop: "30px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h4 style={{ marginBottom: "10px", color: "#F8FAFC" }}>AI Status</h4>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#22C55E" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22C55E" }}></span>
          All Agents Online
        </div>
        <p style={{ marginTop: "10px", color: "#9CA3AF", fontSize: "13px" }}>Ready to analyze requirements and review code with live context.</p>
      </div>
    </aside>
  );
};

export default Sidebar;