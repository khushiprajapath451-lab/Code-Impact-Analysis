import { Loader2 } from "lucide-react";

const Loader = ({ text = "AI Agent processing...", size = 36, color = "#4F46E5" }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        gap: "16px",
      }}
    >
      <Loader2
        size={size}
        color={color}
        style={{
          animation: "spin 1s linear infinite",
        }}
      />
      {text && (
        <p
          style={{
            color: "#9CA3AF",
            fontSize: "15px",
            fontWeight: "500",
            letterSpacing: "0.5px",
            margin: 0,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
