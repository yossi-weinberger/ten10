import React from "react";

const PlatformDisplayDesktop: React.FC = () => {
  return (
    <div
      style={{
        border: "2px solid green",
        padding: "10px",
        margin: "10px",
        borderRadius: "5px",
        backgroundColor: "#e0ffe0",
      }}
    >
      Platform: **DESKTOP** (Loaded from .desktop.tsx)
    </div>
  );
};

export default PlatformDisplayDesktop;
