import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Key, Database, GitBranch, Check, Save } from "lucide-react";

const Settings = () => {
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        <div style={{ flex: 1, padding: "30px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>⚙️ Platform Settings</h1>
          <p style={{ color: "#9CA3AF", marginBottom: "30px" }}>
            Configure your AI LLM model, database integrations, and source control webhooks.
          </p>

          <form onSubmit={handleSave} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "25px" }}>
            {/* AI Engine Configuration */}
            <div className="card" style={{ padding: "25px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <Key size={22} color="#818CF8" />
                <h2 style={{ margin: 0, fontSize: "20px" }}>Gemini AI Configuration</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", color: "#D1D5DB", marginBottom: "8px", fontSize: "14px" }}>
                    AI Model Engine
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Ultra Fast)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Code Reasoning)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", color: "#D1D5DB", marginBottom: "8px", fontSize: "14px" }}>
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    defaultValue="http://localhost:5000/api"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Database & Integrations */}
            <div className="card" style={{ padding: "25px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <Database size={22} color="#22C55E" />
                <h2 style={{ margin: 0, fontSize: "20px" }}>Database & Code Indexing</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", color: "#D1D5DB", marginBottom: "8px", fontSize: "14px" }}>
                    Vector Database / MongoDB Status
                  </label>
                  <div
                    style={{
                      padding: "14px 18px",
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "10px",
                      color: "#22C55E",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>● Codebase Indexing Fallback: In-Memory AST Active</span>
                    <span style={{ fontWeight: 600 }}>Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <button
                type="submit"
                className="primary-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 28px",
                  fontSize: "15px",
                }}
              >
                <Save size={18} /> Save Settings
              </button>

              {saved && (
                <span style={{ color: "#22C55E", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
                  <Check size={18} /> Settings saved successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Settings;
