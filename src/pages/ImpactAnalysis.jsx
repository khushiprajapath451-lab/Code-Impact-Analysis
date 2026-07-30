import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DependencyGraph from "../components/DependencyGraph";
import ImpactTable from "../components/ImpactTable";

const ImpactAnalysis = () => {
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

        <div
          style={{
            flex: 1,
            padding: "30px",
          }}
        >
          <h1>Code Impact Analysis</h1>

          <p
            style={{
              color: "#9CA3AF",
              marginTop: "8px",
              marginBottom: "30px",
            }}
          >
            AI identifies files, classes, functions and modules likely to be
            affected by the selected requirement.
          </p>

          {/* Summary */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "20px",
              marginBottom: "25px",
            }}
          >
            <div className="card" style={{ padding: "20px" }}>
              <h3>Impacted Files</h3>
              <h1 style={{ color: "#22C55E" }}>12</h1>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <h3>Classes</h3>
              <h1 style={{ color: "#4F46E5" }}>8</h1>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <h3>Functions</h3>
              <h1 style={{ color: "#F59E0B" }}>21</h1>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <h3>AI Confidence</h3>
              <h1 style={{ color: "#EF4444" }}>96%</h1>
            </div>
          </div>

          {/* Graph */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <h2>Dependency Graph</h2>

            <br />

            <DependencyGraph />
          </div>

          {/* Table */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <h2>Impacted Files</h2>

            <br />

            <ImpactTable />
          </div>

          {/* AI */}

          <div
            className="card"
            style={{
              padding: "25px",
            }}
          >
            <h2>AI Explanation</h2>

            <br />

            <p
              style={{
                color: "#9CA3AF",
                lineHeight: "1.8",
              }}
            >
              Based on repository indexing and semantic search, the selected
              requirement is expected to modify the authentication workflow.
              The impacted files include controller, service and repository
              classes. Changes may affect login validation and user profile APIs.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImpactAnalysis;