const data = [
  {
    file: "AuthController.java",
    module: "Authentication",
    risk: "High",
  },
  {
    file: "UserService.java",
    module: "User",
    risk: "Medium",
  },
  {
    file: "UserRepository.java",
    module: "Database",
    risk: "Low",
  },
  {
    file: "SecurityConfig.java",
    module: "Security",
    risk: "High",
  },
];

const ImpactTable = () => {
  return (
    <table
      style={{
        width: "100%",
        color: "white",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr
          style={{
            background: "#1F2937",
          }}
        >
          <th style={{ padding: "15px" }}>File</th>
          <th>Module</th>
          <th>Risk</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item, index) => (
          <tr
            key={index}
            style={{
              borderBottom: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <td style={{ padding: "15px" }}>{item.file}</td>

            <td>{item.module}</td>

            <td
              style={{
                color:
                  item.risk === "High"
                    ? "#EF4444"
                    : item.risk === "Medium"
                    ? "#F59E0B"
                    : "#22C55E",
                fontWeight: "600",
              }}
            >
              {item.risk}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ImpactTable;