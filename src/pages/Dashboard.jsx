import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MetricCard from "../components/MetricCard";
import AIStatus from "../components/AIStatus";

const Dashboard = () => {
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
          {/* Header */}

          <h1
            style={{
              fontSize: "32px",
              marginBottom: "8px",
            }}
          >
            Welcome to ImpactIQ 👋
          </h1>

          <p
            style={{
              color: "#9CA3AF",
              marginBottom: "35px",
            }}
          >
            AI Powered Code Impact Analysis & Review Assistant
          </p>

          {/* Metric Cards */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <MetricCard
              title="Repositories"
              value="12"
              subtitle="GitHub Connected"
              color="#22C55E"
            />

            <MetricCard
              title="Requirements"
              value="48"
              subtitle="Jira Stories"
              color="#4F46E5"
            />

            <MetricCard
              title="Review Score"
              value="94%"
              subtitle="AI Quality"
              color="#F59E0B"
            />

            <MetricCard
              title="Coverage"
              value="91%"
              subtitle="Unit Tests"
              color="#EF4444"
            />
          </div>

          {/* Main Grid */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
            }}
          >
            {/* Left */}

            <div>
              {/* Repository */}

              <div className="card" style={{ padding: "25px" }}>
                <h2>Connected Repository</h2>

                <br />

                <h3>impactiq-backend</h3>

                <p
                  style={{
                    color: "#9CA3AF",
                    marginTop: "10px",
                  }}
                >
                  Branch : main
                </p>

                <p
                  style={{
                    color: "#22C55E",
                  }}
                >
                  ● Connected
                </p>
              </div>

              {/* Requirement */}

              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <h2>Current Requirement</h2>

                <br />

                <h3>JIRA-241</h3>

                <p
                  style={{
                    color: "#9CA3AF",
                    marginTop: "10px",
                  }}
                >
                  AI should analyze repository and identify impacted
                  classes before implementation.
                </p>

                <button
                  className="primary-btn"
                  style={{
                    marginTop: "20px",
                  }}
                >
                  Analyze Requirement
                </button>
              </div>

              {/* Recent Analysis */}

              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <h2>Recent AI Analysis</h2>

                <br />

                <table
                  style={{
                    width: "100%",
                    color: "white",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th align="left">Requirement</th>
                      <th align="left">Status</th>
                      <th align="left">Confidence</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>JIRA-241</td>
                      <td style={{ color: "#22C55E" }}>
                        Completed
                      </td>
                      <td>97%</td>
                    </tr>

                    <tr>
                      <td>JIRA-238</td>
                      <td style={{ color: "#F59E0B" }}>
                        Running
                      </td>
                      <td>82%</td>
                    </tr>

                    <tr>
                      <td>JIRA-235</td>
                      <td style={{ color: "#EF4444" }}>
                        Failed
                      </td>
                      <td>43%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right */}

            <div>
              <AIStatus />

              <div
                className="card"
                style={{
                  marginTop: "20px",
                  padding: "25px",
                }}
              >
                <h2>Quick Actions</h2>

                <br />

                <button
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginBottom: "15px",
                  }}
                >
                  Connect GitHub
                </button>

                <button
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginBottom: "15px",
                  }}
                >
                  Connect Jira
                </button>

                <button
                  className="primary-btn"
                  style={{
                    width: "100%",
                  }}
                >
                  Generate PR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;