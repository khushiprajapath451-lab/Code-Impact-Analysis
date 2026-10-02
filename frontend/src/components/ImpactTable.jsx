import { FileCode } from "lucide-react";

const ImpactTable = ({ files }) => {
  const tableData = Array.isArray(files) ? files : [];

  if (tableData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "36px 20px", color: "#94A3B8" }}>
        <FileCode size={30} color="#6366F1" style={{ margin: "0 auto 10px", display: "block", opacity: 0.7 }} />
        <h4 style={{ margin: "0 0 6px", color: "#E2E8F0", fontSize: "14.5px", fontWeight: 600 }}>
          No Impacted Files Registered
        </h4>
        <p style={{ margin: 0, fontSize: "12.5px", color: "#94A3B8", maxWidth: "400px", marginInline: "auto" }}>
          Upload or add your codebase files in the Codebase Files tab, then run an impact analysis to populate the registry.
        </p>
      </div>
    );
  }

  return (
    <table
      style={{
        width: "100%",
        color: "white",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr
          style={{
            background: "#1F2937",
            color: "#9CA3AF",
            fontSize: "13px",
          }}
        >
          <th style={{ padding: "14px", textAlign: "left" }}>Relative Path to Root</th>
          <th style={{ padding: "14px", textAlign: "left" }}>Module Layer</th>
          <th style={{ padding: "14px", textAlign: "left" }}>Impact Risk</th>
        </tr>
      </thead>

      <tbody>
        {tableData.map((item, index) => {
          const filePath = item.file || item.filePath || item.rootPath;
          return (
            <tr
              key={index}
              style={{
                borderBottom: "1px solid rgba(255,255,255,.08)",
                background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
              }}
            >
              <td style={{ padding: "14px", fontFamily: "monospace", fontSize: "13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileCode size={15} color="#818CF8" />
                  <span style={{ color: "#F3F4F6", fontWeight: 600 }}>{filePath}</span>
                </div>
                {item.reason && <div style={{ color: "#94A3B8", fontSize: "12px", marginTop: "4px" }}>{item.reason}</div>}
              </td>

              <td style={{ padding: "14px", color: "#D1D5DB", fontSize: "13px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.06)",
                    fontSize: "12px",
                  }}
                >
                  {item.module || "Source"}
                </span>
              </td>

              <td
                style={{
                  padding: "14px",
                  color:
                    item.risk === "High"
                      ? "#EF4444"
                      : item.risk === "Medium"
                      ? "#F59E0B"
                      : "#22C55E",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                ● {item.risk}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ImpactTable;