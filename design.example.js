/**
 * Authenticated AIDC design example (Node.js, no external dependencies).
 * Set AIDC_API_KEY in the process environment, then run node design.example.js.
 * Credentials are never tool arguments or console output.
 */
const API_URL = "https://aidc-ai.io/api/agent/design";
const request = {
  itLoadMw: 30,
  rackDensityKw: 120,
  gpuGen: "rubin",
  siteAreaSqm: 5000,
  region: "metropolitan",
  options: { redundancy: "n_plus_1", coolingMode: "liquid", pueTarget: 1.2 },
};

async function main({ apiKey = process.env.AIDC_API_KEY, fetchImpl = globalThis.fetch, log = console.log } = {}) {
  const key = (apiKey || "").trim();
  if (!key) throw new Error("Set a registered AIDC_API_KEY before running this example.");

  let response;
  try {
    response = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("The AIDC API network request failed.");
  }
  if (!response.ok) throw new Error(`AIDC API returned HTTP ${response.status}.`);

  const data = await response.json();
  const summary = data?.summary;
  if (data?.ok !== true || !summary || Array.isArray(summary) ||
      ![summary.rackCount, summary.pueDesign, summary.mvaTotal].every(Number.isFinite)) {
    throw new Error("The API did not return a successful design summary.");
  }
  log("=== AIDC-AI.IO Design Summary ===");
  log(`Rack count: ${summary.rackCount}`);
  log(`Design PUE: ${summary.pueDesign}`);
  log(`Total MVA: ${summary.mvaTotal} MVA`);
  if (summary.liquidCoolingLoadMw != null) log(`Liquid cooling load: ${summary.liquidCoolingLoadMw} MW`);
  if (summary.airCoolingLoadMw != null) log(`Air cooling load: ${summary.airCoolingLoadMw} MW`);
  if (summary.cduCount != null) log(`CDU count: ${summary.cduCount}`);
  if (summary.totalCostKrw != null) log(`Planning cost: ${summary.totalCostKrw} KRW`);
  if (summary.totalMonths != null) log(`Planning schedule: ${summary.totalMonths} months`);
  log(`Engine version: ${data.engineVersion}`);
  log(`Request ID: ${data.requestId}`);
  for (const warning of data.warnings || []) log(`Warning: ${warning}`);
  log("Use validate to inspect engineering findings and unresolved RFIs.");
  return data;
}

if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { main };
