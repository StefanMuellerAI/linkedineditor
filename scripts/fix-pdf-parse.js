const fs = require("fs");
const path = require("path");

// pdf-parse v1.1.1 tries to require('./test/data/05-versions-space.pdf') on import.
// This file doesn't exist in production. Create an empty dummy so the require doesn't crash.
const dir = path.join(__dirname, "..", "node_modules", "pdf-parse", "test", "data");
const file = path.join(dir, "05-versions-space.pdf");

try {
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "");
  }
} catch (e) {
  // Non-critical, only affects PDF uploads
  console.warn("pdf-parse fix: could not create dummy test file:", e.message);
}
