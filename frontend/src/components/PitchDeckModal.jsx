import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Layers,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  Database,
  BarChart3,
  AlertTriangle,
  Play,
} from "lucide-react";

const SLIDES = [
  {
    id: 1,
    tag: "OVERVIEW",
    title: "ImpactIQ",
    subtitle: "AI-Powered Code Impact Analysis & Pre-Review Platform",
    accent: "#6366F1",
    content: (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "999px",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            color: "#818CF8",
            fontWeight: "700",
            fontSize: "13px",
            marginBottom: "24px",
          }}
        >
          <Zap size={16} /> Autonomous Pre-Review & Blast Radius Intelligence
        </div>
        <p
          style={{
            fontSize: "18px",
            color: "#CBD5E1",
            maxWidth: "720px",
            margin: "0 auto 30px auto",
            lineHeight: 1.6,
          }}
        >
          Predicts the ripple effect of software requirements across large enterprise codebases, runs Senior AI pre-reviews on Git diffs, and synthesizes ready-to-merge Pull Requests with unit tests.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            maxWidth: "850px",
            margin: "0 auto",
          }}
        >
          {[
            { label: "Predictive Impact", icon: Layers, desc: "AST Blast Radius" },
            { label: "AI Pre-Review", icon: Shield, desc: "Diff Security Audit" },
            { label: "PR Synthesis", icon: GitPullRequest, desc: "Auto Test Plans" },
            { label: "Zero-Leakage", icon: Database, desc: "Local ChromaDB" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px auto",
                  color: "#818CF8",
                }}
              >
                <item.icon size={20} />
              </div>
              <h4 style={{ color: "#FFF", fontSize: "14px", margin: "0 0 4px 0" }}>{item.label}</h4>
              <p style={{ color: "#94A3B8", fontSize: "12px", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 2,
    tag: "PROBLEM STATEMENT",
    title: "The Problem with Modern Code Evolution",
    subtitle: "High risk, manual bottlenecks, and hidden blast radius in enterprise repositories",
    accent: "#EF4444",
    content: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "10px" }}>
        {[
          {
            title: "Predictive Blindspots",
            icon: AlertTriangle,
            col: "#EF4444",
            points: [
              "Engineers can't easily see downstream blast radius before writing code.",
              "Business requirements (BRD/Jira) lack direct mapping to specific codebase files.",
              "Hidden dependencies cause unexpected regressions and production outages.",
            ],
          },
          {
            title: "Manual Review Bottlenecks",
            icon: Shield,
            col: "#F59E0B",
            points: [
              "Senior engineering time is heavily consumed by routine PR reviews (30%+ of week).",
              "Human reviewer fatigue causes edge cases, race conditions, and security flaws to slip through.",
              "Review turnaround delays sprint delivery by multiple days per ticket.",
            ],
          },
          {
            title: "Test Coverage Gaps",
            icon: Layers,
            col: "#3B82F6",
            points: [
              "Features are frequently merged without adequate regression unit tests.",
              "No automated link between modified code paths and required test suites.",
              "Costly post-production bug fixes and hotfix emergency patching.",
            ],
          },
        ].map((card, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: `1px solid ${card.col}44`,
              borderRadius: "20px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `${card.col}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.col,
                }}
              >
                <card.icon size={18} />
              </div>
              <h3 style={{ color: "#FFF", fontSize: "16px", margin: 0 }}>{card.title}</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {card.points.map((pt, pidx) => (
                <li key={pidx} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#CBD5E1", lineHeight: 1.5 }}>
                  <span style={{ color: card.col, fontWeight: "bold" }}>•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 3,
    tag: "SOLUTION & ARCHITECTURE",
    title: "The ImpactIQ Multi-Agent Solution",
    subtitle: "Deterministic AST Parsing combined with Semantic LLM Reasoning",
    accent: "#06B6D4",
    content: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "10px" }}>
        {[
          {
            title: "1. Predictive Blast Radius Mapping",
            desc: "Translates plain-English Jira tickets into exact candidate files and downstream callers using hybrid semantic vector search + AST lookup.",
            highlight: "Zero Guesswork before writing code",
          },
          {
            title: "2. Interactive AST Dependency Graph",
            desc: "Extracts code syntax trees to visually map relationships between Controllers, Services, Models, and Test Suites in real time.",
            highlight: "Full architectural visibility",
          },
          {
            title: "3. Senior Staff AI Pre-Review",
            desc: "Audits Git diffs against security standards, edge cases, null pointer exceptions, and anti-patterns with severity rating.",
            highlight: "Catches bugs before human review",
          },
          {
            title: "4. Autonomous PR & Test Drafting",
            desc: "Generates formatted PR summaries, risk ratings, and synthesizes missing unit test templates for modified code branches.",
            highlight: "Ready-to-merge Pull Requests",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              borderRadius: "18px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ color: "#38BDF8", fontSize: "16px", margin: "0 0 8px 0" }}>{item.title}</h3>
              <p style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
            <div
              style={{
                marginTop: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#10B981",
              }}
            >
              <CheckCircle2 size={14} /> {item.highlight}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 4,
    tag: "TECH STACK",
    title: "Full-Stack AI Architecture",
    subtitle: "Engineered for speed, resilience, and strict enterprise privacy",
    accent: "#8B5CF6",
    content: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "10px" }}>
        {[
          {
            title: "Frontend Tier",
            icon: Cpu,
            col: "#818CF8",
            items: [
              "React 18 + Vite SPA",
              "TailwindCSS Glassmorphism UI",
              "Interactive Graph Visualizer",
              "Lucide Icons & Context State",
            ],
          },
          {
            title: "Gateway & Multi-Agent",
            icon: Layers,
            col: "#06B6D4",
            items: [
              "Node.js / Express API Gateway",
              "FastAPI (Python) Multi-Agent Engine",
              "Tenacity Retry Backoff Resilience",
              "Python & JS AST Code Parser",
            ],
          },
          {
            title: "AI, Storage & Vector DB",
            icon: Database,
            col: "#10B981",
            items: [
              "ChromaDB (Local Zero-Leakage Vector DB)",
              "Sentence-Transformers (all-MiniLM-L6-v2)",
              "Google Gemini GenAI & Multi-LLM",
              "Git Diff Analysis & Webhooks",
            ],
          },
        ].map((stack, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              border: `1px solid ${stack.col}33`,
              borderRadius: "20px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `${stack.col}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stack.col,
                }}
              >
                <stack.icon size={18} />
              </div>
              <h3 style={{ color: "#FFF", fontSize: "16px", margin: 0 }}>{stack.title}</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {stack.items.map((it, iidx) => (
                <li key={iidx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#E2E8F0" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: stack.col }} />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 5,
    tag: "METHODOLOGY",
    title: "End-to-End Execution Pipeline",
    subtitle: "How a requirement flows from Jira to a verified Pull Request",
    accent: "#10B981",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
        {[
          { step: "01", title: "AST & Vector Ingestion", desc: "Codebase is scanned, parsed into AST symbols (classes, functions), and embedded locally into ChromaDB." },
          { step: "02", title: "Hybrid Requirement Matching", desc: "Jira ticket text is searched via Semantic Vector Similarity + exact AST keyword matching." },
          { step: "03", title: "Blast Radius & Caller Traversal", desc: "BFS/DFS algorithm traverses callers up to 3 levels deep with cycle detection to identify affected routes and tests." },
          { step: "04", title: "Diff Pre-Review & Test Gap Audit", desc: "Committed Git diffs are inspected for regressions, security flaws, and missing test assertions." },
          { step: "05", title: "Automated PR & Test Synthesis", desc: "Structured PR title, summary, test plan, and unit test code templates are synthesized automatically." },
        ].map((s, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              background: "rgba(15, 23, 42, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "12px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: "bold",
                fontSize: "14px",
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "6px 10px",
                borderRadius: "8px",
              }}
            >
              {s.step}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: "#FFF", fontSize: "14px", margin: "0 0 2px 0" }}>{s.title}</h4>
              <p style={{ color: "#94A3B8", fontSize: "12px", margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 6,
    tag: "ROI & IMPACT",
    title: "Enterprise Value & Outcomes",
    subtitle: "Measurable ROI, privacy compliance, and speed acceleration",
    accent: "#F59E0B",
    content: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "10px" }}>
        {[
          {
            stat: "70%",
            label: "Faster Review Turnaround",
            desc: "Automated pre-review catches syntax, logic, and security bugs before human review.",
            col: "#6366F1",
          },
          {
            stat: "0",
            label: "Blast Radius Surprises",
            desc: "Predictive AST dependency mapping prevents breaking changes across microservices.",
            col: "#06B6D4",
          },
          {
            stat: "< $100",
            label: "Monthly Operational Cost",
            desc: "Self-hosted local vector embeddings with lean token consumption for 100+ PRs/mo.",
            col: "#10B981",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: `1px solid ${card.col}44`,
              borderRadius: "20px",
              padding: "30px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <h2 style={{ fontSize: "42px", fontWeight: "800", color: card.col, margin: "0 0 8px 0" }}>{card.stat}</h2>
            <h4 style={{ color: "#FFF", fontSize: "16px", margin: "0 0 8px 0" }}>{card.label}</h4>
            <p style={{ color: "#94A3B8", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>{card.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const PitchDeckModal = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") {
        setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slide = SLIDES[currentSlide];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(24px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(9, 13, 22, 0.98))",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "28px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(99, 102, 241, 0.2)",
          padding: "36px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: "600px",
        }}
      >
        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                letterSpacing: "1px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: `${slide.accent}22`,
                color: slide.accent,
                border: `1px solid ${slide.accent}44`,
              }}
            >
              {slide.tag}
            </span>
            <span style={{ color: "#64748B", fontSize: "12px", fontWeight: "600" }}>
              Slide {currentSlide + 1} of {SLIDES.length}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Title area */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#FFF", margin: "0 0 6px 0" }}>{slide.title}</h1>
          <p style={{ fontSize: "14px", color: "#94A3B8", margin: 0 }}>{slide.subtitle}</p>
        </div>

        {/* Slide Content Body */}
        <div style={{ flex: 1 }}>{slide.content}</div>

        {/* Footer Navigation bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: idx === currentSlide ? "28px" : "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: idx === currentSlide ? slide.accent : "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
              disabled={currentSlide === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: currentSlide === 0 ? "#475569" : "#FFF",
                cursor: currentSlide === 0 ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <button
              onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1))}
              disabled={currentSlide === SLIDES.length - 1}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "none",
                color: "#FFF",
                cursor: currentSlide === SLIDES.length - 1 ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitchDeckModal;
