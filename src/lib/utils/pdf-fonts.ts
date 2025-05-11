import jsPDF from "jspdf";

// Defines the custom fonts for jsPDF
// Ensure the font files are available in the specified paths relative to your public directory or build output

export async function addFontToJsPDF(doc: jsPDF) {
  // Hebrew Font
  // Note: jsPDF uses VFS (Virtual File System) for fonts. You might need to load the font file differently
  // depending on your environment (Node.js vs. Browser) and how you bundle your assets.
  // This example assumes the font is available via a URL or local path accessible during build/runtime.
  // For browser environments, you might pre-load fonts or use base64 encoded fonts.

  // For simplicity, this example might not work out-of-the-box without proper font loading.
  // You might need to use a tool or library to convert .ttf to a jsPDF compatible format or use standard fonts.
  doc.addFont(
    "assets/fonts/assistant/Assistant-Regular.ttf",
    "assistant",
    "normal"
  );
  doc.setFont("assistant");
}
