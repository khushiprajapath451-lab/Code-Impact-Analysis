const ReviewCard = ({ title, value, color }) => {
  return (
    <div
      className="card"
      style={{
        padding: "20px",
      }}
    >
      <p
        style={{
          color: "#9CA3AF",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          marginTop: "15px",
          color: color,
        }}
      >
        {value}
      </h2>
    </div>
  );
};

export default ReviewCard;