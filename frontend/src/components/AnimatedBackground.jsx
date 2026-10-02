import React, { useEffect, useRef, useState } from "react";

const CODE_PILLS = [
  { text: "AST::CallGraph.traverse()", x: 12, y: 18, delay: 0, col: "#818CF8" },
  { text: "ChromaDB.query(k=5)", x: 82, y: 22, delay: 3, col: "#06B6D4" },
  { text: "Gemini-1.5::PreReview()", x: 75, y: 78, delay: 6, col: "#A855F7" },
  { text: "BlastRadius::RiskScore(0%)", x: 18, y: 82, delay: 2, col: "#10B981" },
  { text: "DiffParser::test_gap(0)", x: 88, y: 50, delay: 5, col: "#F43F5E" },
  { text: "sentence-transformers::384d", x: 8, y: 52, delay: 4, col: "#F59E0B" },
];

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 180 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Particle nodes for AST / code network
    const particleCount = Math.min(Math.floor((width * height) / 14000), 75);
    const particles = [];

    const colors = [
      "rgba(99, 102, 241, 0.8)",   // Indigo
      "rgba(6, 182, 212, 0.8)",    // Cyan
      "rgba(139, 92, 246, 0.8)",   // Purple
      "rgba(16, 185, 129, 0.7)",   // Emerald
      "rgba(236, 72, 153, 0.7)",   // Pink
      "rgba(56, 189, 248, 0.8)",   // Sky
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.025 + Math.random() * 0.02,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // Draw connection lines between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.22;
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Connect particles to mouse cursor for interactive spider-web effect
        const mouseDx = particles[i].x - mouse.x;
        const mouseDy = particles[i].y - mouse.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        if (mouseDist < mouse.radius) {
          const mouseAlpha = (1 - mouseDist / mouse.radius) * 0.5;
          ctx.strokeStyle = `rgba(6, 182, 212, ${mouseAlpha})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Subtle magnetic pull
          particles[i].x -= (mouseDx / mouseDist) * 0.4;
          particles[i].y -= (mouseDy / mouseDist) * 0.4;
        }
      }

      // Draw glowing particle nodes
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentRadius = p.radius + Math.sin(p.pulse) * 0.7;

        // Outer glow
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          currentRadius * 3.5
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Core white dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render cursor spotlight node
      if (mouse.x > 0 && mouse.y > 0) {
        const cursorGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          90
        );
        cursorGrad.addColorStop(0, "rgba(6, 182, 212, 0.15)");
        cursorGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = cursorGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Dynamic Animated Mesh Aurora Blobs */}
      <div className="aurora-orb orb-1" />
      <div className="aurora-orb orb-2" />
      <div className="aurora-orb orb-3" />
      <div className="aurora-orb orb-4" />

      {/* Cyber Grid Pattern */}
      <div className="cyber-grid-overlay" />

      {/* Floating Holographic AST Code Stream Pills */}
      {CODE_PILLS.map((pill, idx) => (
        <div
          key={idx}
          className="floating-code-pill"
          style={{
            position: "absolute",
            left: `${pill.x}%`,
            top: `${pill.y}%`,
            animationDelay: `${pill.delay}s`,
            borderColor: `${pill.col}44`,
            boxShadow: `0 0 20px ${pill.col}22`,
            color: pill.col,
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pill.col }} />
          <span>{pill.text}</span>
        </div>
      ))}

      {/* Interactive Particle & Neural Network Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
