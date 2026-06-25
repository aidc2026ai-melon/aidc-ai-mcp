/**
 * AIDC-AI.IO — design endpoint example (Node.js, no external dependencies)
 *
 * Sizes a 30 MW Rubin-era AI data center and prints a summary.
 * No API key is required for the anonymous tier (10 req/hour per IP).
 *
 * Run:  node design.example.js
 *
 * To use a registered key, set the env var:
 *   AIDC_API_KEY=aidc_live_<your-32-hex-key> node design.example.js
 */

const API_URL = "https://aidc-ai.io/api/agent/design";

const request = {
  itLoadMw: 30,
  rackDensityKw: 120,
  gpuGen: "rubin",
  siteAreaSqm: 5000,
  region: "metropolitan",
  options: {
    redundancy: "n_plus_1",
    coolingMode: "liquid",
    pueTarget: 1.2,
  },
};

async function main() {
  const headers = { "Content-Type": "application/json" };
  if (process.env.AIDC_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.AIDC_API_KEY}`;
  }

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });
  } catch (err) {
    console.error("Network error:", err.message);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = await res.json();

  console.log("=== AIDC-AI.IO Design Summary ===");
  console.log(`Rack count (snapped):  ${data.rackCount}`);
  console.log(`Rack count (raw):      ${data.rackCountRaw ?? "n/a"}`);
  console.log(`Design PUE:            ${data.pueDesign}`);
  console.log(`Total MVA:             ${data.mvaTotal} MVA`);
  console.log(`Liquid cooling load:   ${data.liquidCoolingLoadMw} MW`);
  console.log(`Air cooling load:      ${data.airCoolingLoadMw} MW`);
  console.log(`CDU count:             ${data.cduCount}`);
  if (data.totalCostKrw != null) {
    const billion = (data.totalCostKrw / 1e8).toFixed(1);
    console.log(`Estimated cost:        ₩${billion}억 KRW`);
  }
  console.log(`Build timeline:        ${data.totalMonths} months`);

  if (data.warnings && data.warnings.length > 0) {
    console.log("\nWarnings:");
    data.warnings.forEach((w) => console.log(`  - ${w}`));
  } else {
    console.log("\nNo warnings.");
  }

  console.log("\nFull response:");
  console.log(JSON.stringify(data, null, 2));
}

main();
