/**
 * Script to add East Africa and West Africa bird lists to the Bird Species Database.
 *
 * East Africa: from Kenyan Birds.xlsx (1180 birds with family data)
 * West Africa: from West Africa Bird List.xlsx (1727 birds, family inferred via genus mapping)
 *
 * Genus→family mapping combines three sources:
 *   1. Kenyan Birds data (421 genera)
 *   2. Southern Africa + Netherlands data from existing DB (additional genera)
 *   3. Manual mappings for remaining West African genera
 *
 * Run: npx tsx prisma/add-regions.ts
 */
import * as XLSX from "xlsx";
import * as path from "path";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveAlphabeticalName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${lastName}, ${rest}`;
}

interface OutputRow {
  "Alphabetical Name": string;
  "Full  Name ": string; // Keep extra space to match existing column format
  "Scientific Name": string;
  "Group Name": string;
}

// Manual family mappings for genera not found in Kenya/SA/NL data
const MANUAL_GENUS_FAMILIES: Record<string, string> = {
  Achaetops: "Rockrunners",
  Afropavo: "Pheasants and Allies",
  Agelastes: "Guineafowl",
  Alaemon: "Larks",
  Alethe: "Old World Flycatchers",
  Ammomanes: "Larks",
  Ammomanopsis: "Larks",
  Anabathmis: "Sunbirds",
  Artomyias: "Old World Flycatchers",
  Atronanus: "Swallows and Martins",
  Brachycope: "Weavers",
  Calyptocichla: "Greenbuls",
  Canirallus: "Rails",
  Ceratogymna: "Hornbills",
  Chamaetylas: "Old World Flycatchers",
  Cossyphicula: "Old World Flycatchers",
  Criniger: "Greenbuls",
  Cyanograucalus: "Cuckooshrikes",
  Delacourella: "Waxbills",
  Deleornis: "Sunbirds",
  Drymocichla: "Old World Warblers",
  Eremalauda: "Larks",
  Euschistospiza: "Waxbills",
  Grafisia: "Starlings",
  Graueria: "Old World Warblers",
  Hemitesia: "Bush Warblers",
  Himantornis: "Rails",
  Horizocerus: "Hornbills",
  Hylopsar: "Starlings",
  Hypergerus: "Old World Warblers",
  Ixonotus: "Greenbuls",
  Jubula: "Owls",
  Lanioturdus: "Shrikes",
  Lobotos: "Cuckooshrikes",
  Melichneutes: "Honeyguides",
  Melignomon: "Honeyguides",
  Myopornis: "Old World Flycatchers",
  Namibornis: "Old World Flycatchers",
  Neocichla: "Starlings",
  Neolestes: "Bushshrikes",
  Nesocharis: "Waxbills",
  Parmoptila: "Waxbills",
  Phedinopsis: "Swallows and Martins",
  Pholidornis: "Sunbirds",
  Picathartes: "Rockfowl",
  Pogonornis: "African Barbets",
  Poliolais: "Old World Warblers",
  Pseudocalyptomena: "Broadbills",
  Pseudochelidon: "Swallows and Martins",
  Pteronetta: "Ducks and Geese",
  Ramphocoris: "Larks",
  Scotocerca: "Old World Warblers",
  Spiloptila: "Old World Warblers",
  Stiphrornis: "Old World Flycatchers",
  Stizorhina: "Old World Flycatchers",
  Thescelocichla: "Greenbuls",
  Tigriornis: "Herons",
  Urolais: "Old World Warblers",
  Urotriorchis: "Hawks and Eagles",
  Veles: "Nightjars",
  Verreauxia: "Woodpeckers",
  Xenocopsychus: "Old World Flycatchers",
};

// ── Build genus → family lookup from all sources ─────────────────────────────

const genusToFamily = new Map<string, string>();

// Source 1: Kenyan Birds
const kenyaPath = "/Users/lukeroberts/Downloads/Kenyan Birds.xlsx";
const kenyaWorkbook = XLSX.readFile(kenyaPath);
const kenyaRaw: unknown[][] = XLSX.utils.sheet_to_json(
  kenyaWorkbook.Sheets["main"],
  { header: 1 }
);

interface KenyaBird {
  commonName: string;
  scientificName: string;
  familyEnglish: string;
}

const kenyaBirds: KenyaBird[] = [];

for (let i = 2; i < kenyaRaw.length; i++) {
  const row = kenyaRaw[i];
  if (!row || !row[3]) continue;
  const commonName = String(row[3]).trim();
  const scientificName = String(row[4] || "").trim();
  const familyEnglish = String(row[2] || "").trim();
  if (commonName) {
    kenyaBirds.push({ commonName, scientificName, familyEnglish });
    if (scientificName && familyEnglish) {
      const genus = scientificName.split(" ")[0];
      if (genus && !genusToFamily.has(genus)) {
        genusToFamily.set(genus, familyEnglish);
      }
    }
  }
}

console.log(`🇰🇪 Loaded ${kenyaBirds.length} Kenyan birds (${genusToFamily.size} genera)`);

// Source 2: Existing DB (Southern Africa + Netherlands)
const dbPath = path.join(__dirname, "Bird Species Database.xlsx");
const dbWorkbook = XLSX.readFile(dbPath);

for (const sheet of ["southern_africa", "the_netherlands"]) {
  if (!dbWorkbook.Sheets[sheet]) continue;
  const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    dbWorkbook.Sheets[sheet]
  );
  for (const row of data) {
    const sci = String(row["Scientific Name"] || "").trim();
    const group = String(row["Group Name"] || "").trim();
    if (sci && group) {
      const genus = sci.split(" ")[0];
      if (genus && !genusToFamily.has(genus)) {
        genusToFamily.set(genus, group);
      }
    }
  }
}

console.log(`📊 After SA/NL: ${genusToFamily.size} genera`);

// Source 3: Manual mappings
for (const [genus, family] of Object.entries(MANUAL_GENUS_FAMILIES)) {
  if (!genusToFamily.has(genus)) {
    genusToFamily.set(genus, family);
  }
}

console.log(`🔬 After manual: ${genusToFamily.size} genera total`);

// ── Create East Africa sheet data ────────────────────────────────────────────

const eastAfricaRows: OutputRow[] = kenyaBirds.map((bird) => ({
  "Alphabetical Name": deriveAlphabeticalName(bird.commonName),
  "Full  Name ": bird.commonName,
  "Scientific Name": bird.scientificName,
  "Group Name": bird.familyEnglish,
}));

console.log(`\n🌍 East Africa: ${eastAfricaRows.length} birds`);

// ── Create West Africa sheet data ────────────────────────────────────────────

const waPath = "/Users/lukeroberts/Downloads/West Africa Bird List.xlsx";
const waWorkbook = XLSX.readFile(waPath);
const waRaw: unknown[][] = XLSX.utils.sheet_to_json(
  waWorkbook.Sheets["IOC"],
  { header: 1 }
);

const westAfricaRows: OutputRow[] = [];
const unmatchedGenera = new Map<string, string[]>();

for (const row of waRaw) {
  if (!row || !row[1]) continue;
  const commonName = String(row[1]).trim();
  const scientificName = String(row[2] || "").trim();
  const genus = scientificName.split(" ")[0];
  const familyEnglish = genusToFamily.get(genus) || "";

  if (!familyEnglish && genus) {
    if (!unmatchedGenera.has(genus)) unmatchedGenera.set(genus, []);
    unmatchedGenera.get(genus)!.push(commonName);
  }

  westAfricaRows.push({
    "Alphabetical Name": deriveAlphabeticalName(commonName),
    "Full  Name ": commonName,
    "Scientific Name": scientificName,
    "Group Name": familyEnglish,
  });
}

const matchedCount = westAfricaRows.filter((r) => r["Group Name"]).length;
const unmatchedCount = westAfricaRows.length - matchedCount;
console.log(
  `🌍 West Africa: ${westAfricaRows.length} birds (${matchedCount} matched, ${unmatchedCount} unmatched)`
);

if (unmatchedGenera.size > 0) {
  console.log(
    `\n⚠️  ${unmatchedGenera.size} genera still unmatched:`
  );
  for (const [genus, birds] of [...unmatchedGenera.entries()].sort()) {
    console.log(
      `   ${genus}: ${birds.slice(0, 2).join(", ")}${birds.length > 2 ? ` (+${birds.length - 2})` : ""}`
    );
  }
}

// ── Write to Bird Species Database ───────────────────────────────────────────

// Remove existing east_africa / west_africa sheets if present (for re-runs)
for (const name of ["east_africa", "west_africa"]) {
  const idx = dbWorkbook.SheetNames.indexOf(name);
  if (idx !== -1) {
    dbWorkbook.SheetNames.splice(idx, 1);
    delete dbWorkbook.Sheets[name];
    console.log(`   Removed existing '${name}' sheet`);
  }
}

// Add new sheets
const eastAfricaSheet = XLSX.utils.json_to_sheet(eastAfricaRows);
XLSX.utils.book_append_sheet(dbWorkbook, eastAfricaSheet, "east_africa");

const westAfricaSheet = XLSX.utils.json_to_sheet(westAfricaRows);
XLSX.utils.book_append_sheet(dbWorkbook, westAfricaSheet, "west_africa");

XLSX.writeFile(dbWorkbook, dbPath);

console.log(
  `\n✅ Updated Bird Species Database: ${dbWorkbook.SheetNames.join(", ")}`
);
console.log(`   📁 ${dbPath}`);
