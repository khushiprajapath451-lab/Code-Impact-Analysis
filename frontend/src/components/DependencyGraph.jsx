import { useState } from "react";
import { Layers } from "lucide-react";

const DEFAULT_NODES = [
  { id: "req", name: "JIRA-241", type: "Requirement", x: 60, y: 150, color: "#818CF8" },
  { id: "ctrl", name: "checkoutController.js", type: "Controller", x: 280, y: 80, color: "#3B82F6" },
  { id: "svc", name: "discountService.js", type: "Service", x: 280, y: 220, color: "#F59E0B" },
  { id: "model", name: "Order.js", type: "Model", x: 500, y: 80, color: "#22C55E" },
  { id: "test", name: "checkout.test.js", type: "Test Suite", x: 500, y: 220, color: "#EC4899" },
];

const DEFAULT_EDGES = [
  { from: "req", to: "ctrl" },
  { from: "req", to: "svc" },
  { from: "ctrl", to: "model" },
  { from: "ctrl", to: "test" },
  { from: "svc", to: "test" },
];

const DependencyGraph = ({ graphData }) => {
  const [activeNode, setActiveNode] = useState(null);

  const nodes = graphData?.nodes && graphData.nodes.length > 0 ? graphData.nodes : DEFAULT_NODES;
  const edges = graphData?.edges && graphData.edges.length > 0 ? graphData.edges : DEFAULT_EDGES;

  const getNode = (id) => nodes.find((n) => n.id === id);

  return (
    <div
      style={{
        background: "#111827",
        borderRadius: "15px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "13px", color: "#9CA3AF", display: "flex", alignItems: "center", gap: "6px" }}>
          <Layers size={14} color="#818CF8" /> Live AI Dependency Graph (Click node to inspect)
        </span>
        {activeNode && (
          <span style={{ fontSize: "13px", color: activeNode.color, fontWeight: 600 }}>
            Inspecting: {activeNode.name} ({activeNode.type})
          </span>
        )}
      </div>

      <svg width="100%" height="300" viewBox="0 0 650 300" style={{ overflow: "visible" }}>
        {/* Draw Edges */}
        {edges.map((edge, idx) => {
          const fromNode = getNode(edge.from);
          const toNode = getNode(edge.to);
          if (!fromNode || !toNode) return null;

          const isHighlighted = activeNode && (activeNode.id === edge.from || activeNode.id === edge.to);

          return (
            <line
              key={idx}
              x1={(fromNode.x || 60) + 60}
              y1={(fromNode.y || 150) + 20}
              x2={toNode.x || 280}
              y2={(toNode.y || 80) + 20}
              stroke={isHighlighted ? "#818CF8" : "rgba(255,255,255,0.15)"}
              strokeWidth={isHighlighted ? "3" : "2"}
              strokeDasharray={isHighlighted ? "none" : "4"}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isSelected = activeNode?.id === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x || 60}, ${node.y || 150})`}
              onClick={() => setActiveNode(isSelected ? null : node)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width="140"
                height="46"
                rx="10"
                fill={isSelected ? "#1E1B4B" : "#1F2937"}
                stroke={isSelected ? "#818CF8" : node.color || "#818CF8"}
                strokeWidth={isSelected ? "2.5" : "1.5"}
              />
              <circle cx="15" cy="23" r="5" fill={node.color || "#818CF8"} />
              <text x="28" y="20" fill="#FFFFFF" fontSize="12" fontWeight="600">
                {node.name.length > 14 ? node.name.substring(0, 13) + "…" : node.name}
              </text>
              <text x="28" y="34" fill="#9CA3AF" fontSize="10">
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default DependencyGraph;