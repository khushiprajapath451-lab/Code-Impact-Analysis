import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, Globe, Search, LogOut, ShieldCheck, Sparkles } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      style={{
        height: "72px",
        background: "rgba(7, 17, 31, 0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px", minWidth: 0 }}>
        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <h2 style={{ color: "#fff", fontWeight: "700", margin: 0, fontSize: "20px" }}>
              Impact<span style={{ color: "#818CF8" }}>IQ</span>
            </h2>
          </div>
        </Link>

        <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 14px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "10px", width: "320px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={16} color="#94A3B8" />
          <input type="text" placeholder="Search repo, file, Jira..." style={{ background: "transparent", border: "none", outline: "none", color: "white", width: "100%" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Globe size={18} color="#CBD5E1" />
        </div>
        <div style={{ width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Bell size={18} color="#CBD5E1" />
        </div>

        {isAuthenticated ? (
          <div style={{ position: "relative" }}>
            <div onClick={() => setDropdownOpen(!dropdownOpen)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "6px 10px", borderRadius: "999px", background: dropdownOpen ? "rgba(255,255,255,0.08)" : "transparent" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: "bold", fontSize: "14px" }}>
                {user?.name?.charAt(0) || "U"}
              </div>
              <div style={{ textAlign: "left" }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "#FFFFFF" }}>{user?.name || "Developer"}</h4>
                <small style={{ color: "#818CF8", fontWeight: 600, fontSize: "11px" }}>{user?.role || "Senior Staff Engineer"}</small>
              </div>
            </div>

            {dropdownOpen && (
              <div style={{ position: "absolute", right: 0, top: "52px", width: "220px", background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", boxShadow: "0 12px 30px rgba(0,0,0,0.45)", padding: "10px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 200 }}>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>Signed in as</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#F3F4F6", fontWeight: 600 }}>{user?.email || "developer@impactiq.ai"}</p>
                </div>

                <Link to="/settings" onClick={() => setDropdownOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", color: "#D1D5DB", fontSize: "13px", textDecoration: "none" }}>
                  <ShieldCheck size={16} /> Workspace Settings
                </Link>

                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", color: "#EF4444", fontSize: "13px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="primary-btn" style={{ padding: "8px 16px", fontSize: "13px" }}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;