# AIDC-AI.IO — MCP Connector

**AI data center sizing, validation, layout, rack POD feasibility and site fit through a remote MCP server.**  
AI 데이터센터 자동화 툴: 결정론적 엔진으로 AI 데이터센터를 설계·검증·배치하고, 홀별 랙 POD 타당성과 부지 배치를 3D로 보여줍니다.

[![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP-blue)](https://aidc-ai.io/api/mcp)
[![Registry](https://img.shields.io/badge/registry-io.aidc--ai%2Fdesign--engine-green)](https://aidc-ai.io/.well-known/mcp/server.json)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## What is this?

This repository shows how to connect an MCP client or a REST client to the
**AIDC-AI.IO Design Engine**: a deterministic engine (no LLM inside the
calculations) that sizes, validates and lays out AI data centers for NVIDIA
Hopper, Blackwell and Vera Rubin racks.

Give it an IT load, a GPU generation and a site. It returns:

- the design basis: rack count, design PUE, total MVA, cooling split, cost (KRW) and schedule;
- findings and RFIs from electrical, cooling, layout, safety and data rules;
- rack, Hall and site layouts;
- for a data hall: rack rows and aisles, CDUs, CRAHs, manifolds, busway and tap-offs, routed piping, power and
  comms, power and thermal checks with margins, and a list of what it could not place;
- for a Korean site: the parcel, the nearby substations and the whole-site fit;
- an interactive 3D view of the result in clients that support MCP Apps.

Every tool is **read-only and stateless**. No account data is read, no design
session is saved, and nothing is stored per user.

The calculation engine and its reference catalogs stay on the server. This
repository holds client configuration and examples only.

---

## MCP server

| Field | Value |
|---|---|
| Endpoint | `https://aidc-ai.io/api/mcp` |
| Transport | Streamable HTTP |
| Server name | `aidc-design-engine` |
| Tools | 12, all read-only (`readOnlyHint: true`) |
| MCP App | `ui://aidc/viewer-3d` (3D viewer) |
| Auth | **None until 2026-12-31 23:59 KST** (keyless window). See [Access](#access). |
| Limits | 20 requests per minute per IP, plus a daily cap on keyless tool calls per IP. On HTTP 429, wait for `Retry-After`. |

### Tools

| Tool | What it does | 3D view |
|---|---|---|
| `design` | Size an AI data center: rack count, PUE, MVA, cost and schedule. | |
| `validate` | Check a design summary or raw input against electrical, cooling, layout, safety and data rules; returns findings and RFIs. | |
| `layout` | Generate rack blocks, rack-plan candidates and a site layout. | Yes |
| `pod_feasibility` | Lay out GPU rack PODs per Hall (rows, aisles, CDUs, manifolds, busway and tap-offs), route piping and power, run power and thermal checks, and return the equipment schedule, BOQ, SLD, P&ID and an isometric drawing. | Yes |
| `site_design` | Lay out a whole site on its parcels: buildings, Halls, EPODs, plant, generators and parking, with rack totals, MVA and PUE. | Yes |
| `find_site` | Search a Korean address or place, look up cadastral parcels by PNU or coordinates, and return parcel polygons with their area. | |
| `nearby_substations` | List substations near a site, nearest first, with distance (km) and voltage (kV). | |
| `site_rack_capacity` | Turn a scalable-unit count and rack selections into physical racks, main GPU racks and MaxP/MaxQ IT MW. | |
| `validation_programs` | List the validation programs the engine checks a design against. | |
| `rack_catalog` | List the rack system catalog (power, cooling topology, accelerators, fabric) or return one system by slug. | |
| `list_equipment_models` | List the equipment catalog's 3D models (GLB) with kind, catalog items and license. | |
| `get_equipment_model` | Return one 3D model with its license, dimensions and a preview link; a download link only when its license allows it. | |

`find_site`, `nearby_substations` and `site_design` cover sites in Korea.

---

## Quick start

### Claude (claude.ai, Claude Desktop)

Settings → Connectors → Add custom connector, then enter:

```
https://aidc-ai.io/api/mcp
```

No sign-in is asked for while the keyless window is open.

### Claude Code

```bash
claude mcp add --transport http aidc https://aidc-ai.io/api/mcp
```

### Other MCP clients

Any client that supports Streamable HTTP:

```json
{
  "mcpServers": {
    "aidc-design-engine": {
      "url": "https://aidc-ai.io/api/mcp"
    }
  }
}
```

### Try it

- "Check the POD feasibility of a 10 MW Rubin data hall and show it in 3D."
- "Size a 50 MW Blackwell data center at 130 kW per rack on a 60,000 m² metropolitan site, then validate it."
- "Find the parcel at this Korean address, list the substations within 10 km and fit a 100 MW campus on it."

---

## Access

- **Until 2026-12-31 23:59 KST** the server runs a keyless window. A request
  with no key gets every tool listed above.
- **After the window closes** a registered key is required again. Request one
  through [AIDC Contact](https://aidc-ai.io/contact) and pass it in the client's
  credential settings as an `Authorization: Bearer` header. `mcp.json` in this
  repository is that registered-key form; its value is a replacement marker,
  not a working key.
- Keys are never tool arguments. Keep a configured key private and never commit it.
- A registered key keeps its own tier during the window.

---

## Tools: input reference

Each tool publishes its full JSON schema through `tools/list`. The most used inputs:

### `design`

| Field | Type | Range / values | Required |
|---|---|---|---|
| `itLoadMw` | number | 0 < x ≤ 1000 | Yes |
| `rackDensityKw` | number | 0 < x ≤ 500 | Yes |
| `gpuGen` | string | `"hopper"` \| `"blackwell"` \| `"rubin"` | Yes |
| `siteAreaSqm` | number | 0 < x ≤ 1 000 000 | Yes |
| `region` | string | `"metropolitan"` \| `"regional"` | Yes |
| `hallCount` | integer | up to 48 | No |
| `options.redundancy` | string | `"n"` \| `"n_plus_1"` \| `"2n"` | No |
| `options.coolingMode` | string | `"air"` \| `"hybrid"` \| `"liquid"` | No |
| `options.pueTarget` | number | 1.0 – 2.5 | No |

Sizing values such as `rackCount`, `pueDesign` and `mvaTotal` are inside
`summary`. `warnings[]`, `engineVersion` and `requestId` are top-level fields.

### `validate`

Takes `rawInput` (the same fields as `design`) or `designSummary` (the summary
of an earlier `design` answer). Returns `findings[]` with severity and family,
and `rfis[]`.

```json
{
  "rawInput": {
    "itLoadMw": 30,
    "rackDensityKw": 120,
    "gpuGen": "rubin",
    "siteAreaSqm": 5000,
    "region": "metropolitan"
  }
}
```

### `layout`

```json
{
  "design": {
    "itLoadMw": 30,
    "rackDensityKw": 120,
    "gpuGen": "rubin",
    "siteAreaSqm": 5000,
    "region": "metropolitan"
  },
  "siteCentroid": { "lat": 37.5665, "lng": 126.9780 },
  "siteAreaSqm": 5000
}
```

### `pod_feasibility`

Give the IT load one of three ways: `hallItMw` (IT MW per Hall, for example
`[25, 25, 32]`), `halls` (per-Hall IT MW with optional Hall dimensions), or
`itLoadMw` with `hallCount`.

| Field | Type | Range / values |
|---|---|---|
| `itLoadMw` | number | up to 720 |
| `hallCount` | integer | up to 12 |
| `gpuGen` | string | `"rubin"` \| `"blackwell"` \| `"hopper"` |
| `rackDensityKw` | number | up to 500 (default: the generation's catalog value) |
| `powerMode` | string | `"maxp"` \| `"maxq"` |
| `cduLocation` | string | `"mechanical_gallery"` \| `"row_end"` \| `"in_row"` \| `"in_rack"` \| `"plant_floor"` |
| `powerDistribution` | string | `"busway_rpp"` \| `"busway_tap_off"` |
| `hotAisleMm`, `coldAisleMm` | integer | 900 – 4000 |

```json
{ "hallItMw": [10], "gpuGen": "rubin" }
```

### `site_design`

Name the site by `address`, `pnus` (19-digit parcel codes), `picks` (points
inside the parcels) or `parcels` (GeoJSON features, for example from
`find_site`). Then give `itLoadMw` (up to 1000) or `hallItMw`, and optionally
`gpuGen`, `rackDensityKw`, `pueTarget`, `powerMode` and `mainRack`.

### Site and catalog tools

| Tool | Inputs |
|---|---|
| `find_site` | `query` with `searchType` (`PLACE`, `DISTRICT`, `ADDRESS`), or `address`, or `pnus`, or `lat` and `lng` |
| `nearby_substations` | `lat`, `lng` (required); `radiusKm`, `minKv`, `limit` |
| `site_rack_capacity` | `suCount` (required); `powerSizingBasis` (`maxP`, `maxQ`), `rackCatalogSelections` |
| `validation_programs` | `query` |
| `rack_catalog` | `slug`, or `query`, `minPowerKw`, `coolingTopology` |
| `list_equipment_models` | `query`, `kind`, `catalogItemId`, `downloadableOnly`, `limit`, `offset` |
| `get_equipment_model` | `id` (required) |

---

## REST usage

`design`, `validate` and `layout` are also plain REST endpoints:

| Tool | REST endpoint |
|---|---|
| `design` | `POST https://aidc-ai.io/api/agent/design` |
| `validate` | `POST https://aidc-ai.io/api/agent/validate` |
| `layout` | `POST https://aidc-ai.io/api/agent/layout` |

The keyless window covers these three endpoints too. The other nine tools are
available through MCP only.

```bash
curl -s -X POST https://aidc-ai.io/api/agent/design \
  -H "Content-Type: application/json" \
  -d '{
    "itLoadMw": 30,
    "rackDensityKw": 120,
    "gpuGen": "rubin",
    "siteAreaSqm": 5000,
    "region": "metropolitan",
    "options": {
      "redundancy": "n_plus_1",
      "coolingMode": "liquid",
      "pueTarget": 1.2
    }
  }'
```

A successful response contains `ok`, `summary`, `warnings`, `engineVersion`,
`requestId` and `_agent`. Keep the warnings and validation findings: an
`ok: true` response does not certify the design.

`design.curl.sh` and `design.example.js` are the registered-key versions of
this call. They stop before any network request when `AIDC_API_KEY` is not set.

---

## Local stdio server (npm, Docker)

The npm package `aidc-mcp-server@0.2.4` and the `Dockerfile` in this repository
run a local stdio server. That version offers `design`, `validate` and `layout`
only, has no 3D view, and is configured with a registered key in `AIDC_API_KEY`.
For all 12 tools, use the remote endpoint above.

```bash
npx -y aidc-mcp-server@0.2.4
```

```bash
docker build -t aidc-ai-mcp .
docker run --rm -i -e AIDC_API_KEY aidc-ai-mcp
```

---

## Links

| Resource | URL |
|---|---|
| Website | https://aidc-ai.io |
| MCP server card | https://aidc-ai.io/.well-known/mcp/server.json |
| LLM context | https://aidc-ai.io/llms.txt |
| Full LLM context | https://aidc-ai.io/llms-full.txt |
| OpenAPI 3.1 spec (registered key) | https://aidc-ai.io/api/openapi.json |
| Privacy | https://aidc-ai.io/privacy |
| Terms | https://aidc-ai.io/terms |
| Support | https://aidc-ai.io/contact |
| Contact | contact@aidc-ai.io |

---

## License

This repository (examples and connector configuration only) is released under the [MIT License](LICENSE).  
The AIDC-AI.IO engine, reference catalogs and all server-side logic remain proprietary.
