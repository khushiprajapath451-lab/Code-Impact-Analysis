import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const MetricCard = ({ title, value, subtitle, color = "#4F46E5", to, onClick, tooltip }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (to) {
      navigate(to);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  const isClickable = Boolean(onClick || to);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tooltip || (to ? `Open ${title}` : undefined)}
      style={{
        background: isHovered
          ? "linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(17, 24, 39, 0.98))"
          : "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.95))",
        border: isHovered
          ? `1px solid ${color}88`
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "18px 18px 16px",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: isClickable ? "pointer" : "default",
        boxShadow: isHovered
          ? `0 20px 35px -8px rgba(0, 0, 0, 0.5), 0 0 20px -3px ${color}33`
          : "0 16px 30px rgba(2,6,23,0.18)",
        transform: isHovered && isClickable ? "translateY(-4px)" : "translateY(0)",
        position: "relative",
        userSelect: "none",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: isHovered ? "#E2E8F0" : "#9CA3AF", fontSize: "13px", margin: 0, fontWeight: 600, transition: "color 0.2s ease" }}>
          {title}
        </p>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            background: isHovered ? `${color}25` : "rgba(255,255,255,0.05)",
            border: isHovered ? `1px solid ${color}55` : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s ease",
            transform: isHovered ? "scale(1.1) translate(1px, -1px)" : "scale(1)",
          }}
        >
          <ArrowUpRight
            color={color}
            size={18}
            style={{
              transition: "transform 0.2s ease",
              transform: isHovered ? "translate(1px, -1px)" : "none",
            }}
          />
        </div>
      </div>

      <h2
        style={{
          marginTop: "12px",
          marginBottom: "8px",
          color,
          fontSize: "28px",
          fontWeight: 800,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </h2>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small style={{ color: "#94A3B8", fontSize: "12px" }}>{subtitle}</small>
        {isClickable && (
          <span
            style={{
              fontSize: "11px",
              color: color,
              fontWeight: 600,
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? "translateX(0)" : "translateX(-4px)",
              transition: "all 0.2s ease",
            }}
          >
            Explore →
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;