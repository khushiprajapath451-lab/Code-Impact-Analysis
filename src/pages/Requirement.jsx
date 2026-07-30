import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const Requirement = () => {
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
          <h1>Requirement Analysis</h1>

          <p
            style={{
              color: "#9CA3AF",
              marginTop: "8px",
              marginBottom: "30px",
            }}
          >
            Analyze BRD documents or Jira stories to identify impacted
            modules and generate AI insights.
          </p>

          {/* Upload Section */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <h2>Upload Requirement</h2>

            <br />

            <input
              type="file"
              style={{
                marginBottom: "20px",
                color: "white",
              }}
            />

            <br />

            <button className="primary-btn">
              Analyze Requirement
            </button>
          </div>

          {/* Requirement Details */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <h2>Requirement Details</h2>

            <br />

            <p>
              <strong>Requirement ID:</strong> JIRA-241
            </p>

            <br />

            <p>
              <strong>Priority:</strong> High
            </p>

            <br />

            <p>
              <strong>Description:</strong>
            </p>

            <p
              style={{
                color: "#9CA3AF",
                marginTop: "10px",
              }}
            >
              Build an AI assistant that analyzes a software requirement
              and identifies impacted files, classes, modules, and
              functions before development begins.
            </p>
          </div>

          {/* AI Summary */}

          <div
            className="card"
            style={{
              padding: "25px",
            }}
          >
            <h2>AI Summary</h2>

            <br />

            <ul
              style={{
                color: "#9CA3AF",
                lineHeight: "2",
              }}
            >
              <li>Repository successfully indexed.</li>

              <li>12 files are likely to be impacted.</li>

              <li>4 Java services require modification.</li>

              <li>Regression risk is Moderate.</li>

              <li>Missing unit tests detected.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Requirement;