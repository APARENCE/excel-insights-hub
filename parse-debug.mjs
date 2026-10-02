import * as XLSX from "xlsx";
import fs from "fs";

const filePath = "src/data/Renault_Operacao_Externalizacao-Terminal_Tlog.xlsx";
const buffer = fs.readFileSync(filePath);
const wb = XLSX.read(buffer, { cellDates: true });

console.log("=== Sheet Names ===");
wb.SheetNames.forEach((name, i) => console.log(`${i}: "${name}"`));

// Check for programação sheets
console.log("\n=== Looking for Programação sheets ===");
wb.SheetNames.forEach(name => {
  const normalized = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("PROGRAMACAO") || normalized.includes("PROGRAMA")) {
    console.log(`Found: "${name}" -> normalized: "${normalized}"`);
  }
});

// Parse the first few rows of each sheet that might be programação
wb.SheetNames.forEach(sheetName => {
  const normalized = sheetName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("PROGRAMACAO") || normalized.includes("PROGRAMA")) {
    console.log(`\n=== Sheet: "${sheetName}" ===`);
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    console.log(`Rows: ${aoa.length}`);
    if (aoa.length > 0) {
      console.log('Headers:', aoa[0]);
      console.log('First 10 data rows:');
      aoa.slice(1, 11).forEach((row, i) => console.log(`  Row ${i+1}:`, row));
    }
  }
});