import { ArrowUpRight } from "lucide-react";

const MetricCard = ({ title, value, subtitle, color }) => {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px",
        padding: "20px",
        transition: "0.3s",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            color: "#9CA3AF",
            fontSize: "14px",
            margin: 0,
          }}
        >
          {title}
        </p>

        <ArrowUpRight color={color} size={20} />
      </div>

      <h2
        style={{
          marginTop: "15px",
          marginBottom: "10px",
          color: color,
          fontSize: "32px",
        }}
      >
        {value}
      </h2>

      <small
        style={{
          color: "#9CA3AF",
        }}
      >
        {subtitle}
      </small>
    </div>
  );
};

export default MetricCard;