import { ArrowUpRight } from "lucide-react";

const MetricCard = ({ title, value, subtitle, color }) => {
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.95))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "18px 18px 16px", transition: "0.3s", cursor: "pointer", boxShadow: "0 16px 30px rgba(2,6,23,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#9CA3AF", fontSize: "13px", margin: 0, fontWeight: 600 }}>{title}</p>
        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowUpRight color={color} size={18} />
        </div>
      </div>

      <h2 style={{ marginTop: "12px", marginBottom: "8px", color, fontSize: "28px", fontWeight: 800 }}>{value}</h2>
      <small style={{ color: "#94A3B8" }}>{subtitle}</small>
    </div>
  );
};

export default MetricCard;