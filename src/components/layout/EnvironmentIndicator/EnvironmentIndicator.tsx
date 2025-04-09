import React from "react";

const EnvironmentIndicatorDefault: React.FC = () => {
  // Default can be empty or show a placeholder/error
  return (
    <div
      style={{
        padding: "8px",
        fontSize: "0.8rem",
        color: "#aaa",
        borderTop: "1px solid #eee",
        marginTop: "auto",
      }}
    >
      ? Unknown Env
    </div>
  );
};

export default EnvironmentIndicatorDefault;
