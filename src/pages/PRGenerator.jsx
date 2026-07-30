import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const PRGenerator = () => {
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
          <h1>AI Pull Request Generator</h1>

          <p
            style={{
              color: "#9CA3AF",
              marginBottom: "30px",
            }}
          >
            AI automatically prepares a pull request draft based on your
            code changes.
          </p>

          {/* PR Header */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <h2>PR Title</h2>

            <input
              type="text"
              value="AI: Improve Authentication Flow"
              readOnly
              style={{
                width: "100%",
                marginTop: "15px",
                padding: "15px",
                background: "#1F2937",
                border: "none",
                color: "white",
                borderRadius: "10px",
              }}
            />
          </div>

          {/* Description */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <h2>PR Description</h2>

            <textarea
              rows="10"
              defaultValue={`## Summary

• Updated authentication workflow

• Improved validation

• Added security checks

• Refactored login service

## Requirement

JIRA-241

## Testing

Unit Tests Added

## Review Notes

Ready for developer review.`}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "20px",
                background: "#1F2937",
                color: "white",
                border: "none",
                borderRadius: "10px",
                resize: "vertical",
              }}
            />
          </div>

          {/* Changed Files */}

          <div
            className="card"
            style={{
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <h2>Files Changed</h2>

            <br />

            <ul
              style={{
                color: "#9CA3AF",
                lineHeight: "2",
              }}
            >
              <li>AuthController.java</li>
              <li>UserService.java</li>
              <li>SecurityConfig.java</li>
              <li>UserRepository.java</li>
            </ul>
          </div>

          {/* Actions */}

          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
          >
            <button className="primary-btn">
              Copy PR
            </button>

            <button className="primary-btn">
              Export Markdown
            </button>

            <button className="primary-btn">
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PRGenerator;