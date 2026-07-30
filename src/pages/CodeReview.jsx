import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ReviewCard from "../components/ReviewCard";

const CodeReview = () => {
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
          <h1>AI Code Review</h1>

          <p
            style={{
              color: "#9CA3AF",
              marginBottom: "30px",
            }}
          >
            AI performs a pre-review before code reaches human reviewers.
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
            <ReviewCard
              title="Quality Score"
              value="94/100"
              color="#22C55E"
            />

            <ReviewCard
              title="Regression Risk"
              value="Medium"
              color="#F59E0B"
            />

            <ReviewCard
              title="Coverage"
              value="89%"
              color="#4F46E5"
            />

            <ReviewCard
              title="Security"
              value="2 Warnings"
              color="#EF4444"
            />
          </div>

          {/* Coding Standards */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <h2>Coding Standards</h2>

            <br />

            <ul
              style={{
                lineHeight: "2",
                color: "#9CA3AF",
              }}
            >
              <li>✔ Naming conventions followed</li>
              <li>✔ No duplicate code detected</li>
              <li>⚠ Unused import found in UserService.java</li>
              <li>⚠ Long method detected in AuthController.java</li>
            </ul>
          </div>

          {/* AI Suggestions */}

          <div
            className="card"
            style={{
              padding: "25px",
            }}
          >
            <h2>AI Suggestions</h2>

            <br />

            <ul
              style={{
                lineHeight: "2",
                color: "#9CA3AF",
              }}
            >
              <li>Add unit tests for LoginService.</li>
              <li>Refactor AuthController into smaller methods.</li>
              <li>Improve exception handling.</li>
              <li>Remove unused imports.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeReview;