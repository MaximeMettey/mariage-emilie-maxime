// Test du tri alphabétique
const files = [
  { name: "20251108-230348-1L8A4470.jpg" },
  { name: "20251108-164743-7J1A5150.jpg" },
  { name: "20251108-164812-7J1A5151.jpg" }
];

console.log("AVANT tri:");
files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));

// Tri comme dans server.js
files.sort((a, b) => {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
});

console.log("\nAPRÈS tri:");
files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));

console.log("\nOrdre attendu:");
console.log("  1. 20251108-164743-7J1A5150.jpg");
console.log("  2. 20251108-164812-7J1A5151.jpg");
console.log("  3. 20251108-230348-1L8A4470.jpg");
