import { Bell, Globe, Search, UserCircle2 } from "lucide-react";

const Navbar = () => {
  return (
    <header
      style={{
        height: "72px",
        background: "#111827",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "30px",
        }}
      >
        <h2
          style={{
            color: "#fff",
            fontWeight: "700",
          }}
        >
          Impact<span style={{ color: "#4F46E5" }}>IQ</span>
        </h2>

        <div
          style={{
            background: "#1F2937",
            padding: "10px 15px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "350px",
          }}
        >
          <Search size={18} color="#9CA3AF" />

          <input
            type="text"
            placeholder="Search repository, file, Jira..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Right Section */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
    <Globe size={22} />

        <Bell size={22} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <UserCircle2 size={36} />

          <div>
            <h4>Developer</h4>

            <small
              style={{
                color: "#9CA3AF",
              }}
            >
              AI Workspace
            </small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;