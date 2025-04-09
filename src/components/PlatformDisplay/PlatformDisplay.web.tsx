import React from "react";

const PlatformDisplayWeb: React.FC = () => {
  return (
    <div
      style={{
        border: "2px solid blue",
        padding: "10px",
        margin: "10px",
        borderRadius: "5px",
        backgroundColor: "#e0e0ff",
      }}
    >
      Platform: **WEB** (Loaded from .web.tsx)
    </div>
  );
};

export default PlatformDisplayWeb;
