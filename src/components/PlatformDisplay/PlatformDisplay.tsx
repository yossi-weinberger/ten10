import React from "react";

const PlatformDisplayDefault: React.FC = () => {
  return (
    <div
      style={{
        border: "2px solid gray",
        padding: "10px",
        margin: "10px",
        borderRadius: "5px",
        backgroundColor: "#f0f0f0",
      }}
    >
      Platform: **DEFAULT** (Loaded from .tsx)
    </div>
  );
};

export default PlatformDisplayDefault;
