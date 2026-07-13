# AIDC-AI.IO — MCP Connector

**AI data center sizing, validation, and layout via a remote MCP server.**  
AI 데이터센터 자동화 툴: 결정론적 엔진으로 AI 데이터센터를 설계·검증·레이아웃합니다.

[![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP-blue)](https://aidc-ai.io/api/mcp)
[![Registry](https://img.shields.io/badge/registry-io.aidc--ai%2Fdesign--engine-green)](https://aidc-ai.io/.well-known/mcp/server.json)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## What is this?

This repository shows how to connect an MCP client or REST client to the
**AIDC-AI.IO Design Engine** — a deterministic, source-backed engine that sizes,
validates, and lays out Rubin-era AI data centers.

**What the engine does (on the server):**

- Accepts an IT load, rack density, GPU generation (Hopper / Blackwell / **NVIDIA Vera Rubin**
  NVL72 / VR200), and site constraints.
- Returns deployment-unit-snapped rack counts, design PUE, power-factor-backed total MVA
  (22.9 kV intake), liquid-cooling / air-cooling heat split, CDU planning values,
  cost (KRW), and timeline.
- Validates designs against electrical, cooling, layout, safety, and data rules with
  severity-classified findings and RFIs.
- Generates a rack-plan grid (hall dimensions, row/column positions in mm) and a
  site-block layout.

**What this repo contains:**

- MCP client configuration snippet.
- `curl` and Node.js examples that call the public REST projection (`/api/agent/*`).
- An illustrative response so you know what fields to expect.

The core calculation engine, reference catalogs (rack library, AHJ/code matrix,
1.6T fabric topology, direct-to-chip (D2C) cooling models, etc.) are proprietary and
remain server-side. No engine source is published here.

> **Korea live.** Region-specific: 22.9 kV utility intake, Korean AHJ/code, climate,
> and operations validation. Keywords the engine targets: AI data center, AIDC,
> NVIDIA Rubin, Vera Rubin, 22.9kV, liquid cooling, CDU, D2C, 1.6T fabric, PUE.

---

## MCP Server

| Field | Value |
|---|---|
| Transport | Streamable HTTP |
| Endpoint | `https://aidc-ai.io/api/mcp` |
| Official registry name | `io.aidc-ai/design-engine` |
| Auth | None required (anonymous tier). Optional `Authorization: Bearer aidc_live_<32hex>` raises rate tier. |
| Tool count | 3 |
| Rate limit (anon) | 10 req / hour on `/api/agent/*` |

### Tools

| Tool | One-line description |
|---|---|
| `design` | Size an AI data center: returns rack count, PUE, total MVA, liquid/air cooling split, CDU count, cost (KRW), and build timeline. |
| `validate` | Check a design against electrical, cooling, layout, safety, and data rules; returns severity-classified findings and RFIs. |
| `layout` | Generate a rack-plan grid (hall dimensions, row/column positions in mm) and a site-block layout. |

---

## Quick Start

### MCP client configuration

Add this to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`,
Cursor MCP settings, or any Streamable HTTP client):

```json
{
  "mcpServers": {
    "aidc-design-engine": {
      "url": "https://aidc-ai.io/api/mcp"
    }
  }
}
```

The server is immediately usable without an API key. To raise the rate limit, add:

```json
{
  "mcpServers": {
    "aidc-design-engine": {
      "url": "https://aidc-ai.io/api/mcp",
      "headers": {
        "Authorization": "Bearer aidc_live_<your-32-hex-key>"
      }
    }
  }
}
```

Contact [contact@aidc-ai.io](mailto:contact@aidc-ai.io) for a registered or partner key.

### Docker (local stdio server)

Build and run the same published MCP server used for registry evaluation:

```bash
docker build -t aidc-ai-mcp .
docker run --rm -i aidc-ai-mcp
```

The container communicates over stdio and connects to `https://aidc-ai.io` by
default. No API key is required for the anonymous tier.

---

## REST Usage

The MCP tools proxy to these REST endpoints (permissive CORS, same optional auth):

| Tool | REST endpoint |
|---|---|
| `design` | `POST https://aidc-ai.io/api/agent/design` |
| `validate` | `POST https://aidc-ai.io/api/agent/validate` |
| `layout` | `POST https://aidc-ai.io/api/agent/layout` |

### Example: size a 30 MW Rubin-era AI data center

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

### Illustrative response

> The JSON below is illustrative — field names and structure reflect the actual API
> shape, but exact numbers will vary by engine version and input. See
> `design.response.example.json` for the full object.

```json
{
  "rackCount": 256,
  "rackCountRaw": 250,
  "pueDesign": 1.21,
  "mvaTotal": 45.8,
  "liquidCoolingLoadMw": 26.4,
  "airCoolingLoadMw": 3.6,
  "cduCount": 13,
  "totalCostKrw": 187500000000,
  "totalMonths": 28,
  "warnings": []
}
```

(30 MW IT / 120 kW per rack / Rubin / 5 000 m² / metropolitan / N+1 / liquid / PUE 1.2 target)

---

## Tools — Input Reference

### `design`

Size an AI data center from scratch.

| Field | Type | Range / values | Required |
|---|---|---|---|
| `itLoadMw` | number | 0 < x ≤ 1000 | Yes |
| `rackDensityKw` | number | 0 < x ≤ 500 | Yes |
| `gpuGen` | string | `"hopper"` \| `"blackwell"` \| `"rubin"` | Yes |
| `siteAreaSqm` | number | 0 < x ≤ 1 000 000 | Yes |
| `region` | string | `"metropolitan"` \| `"regional"` | Yes |
| `options.redundancy` | string | `"n"` \| `"n_plus_1"` \| `"2n"` | No |
| `options.coolingMode` | string | `"air"` \| `"hybrid"` \| `"liquid"` | No |
| `options.pueTarget` | number | 1.0 – 2.5 | No |

**Key response fields:** `rackCount`, `rackCountRaw`, `pueDesign`, `mvaTotal`,
`liquidCoolingLoadMw`, `airCoolingLoadMw`, `cduCount`, `totalCostKrw`,
`totalMonths`, `warnings[]`

---

### `validate`

Check a design against engineering rules.

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

**Key response fields:** `findings[]` (each with `severity`, `code`, `message`),
`rfis[]`, `passCount`, `warnCount`, `failCount`

---

### `layout`

Generate a rack plan and site block layout.

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

**Key response fields:** `rackPlan` (hall dimensions, rows, columns, per-rack positions in mm),
`sitePlan` (block-level layout in percentage coords)

---

## Links

| Resource | URL |
|---|---|
| Website | https://aidc-ai.io |
| OpenAPI 3.1 spec | https://aidc-ai.io/api/openapi.json |
| MCP server card | https://aidc-ai.io/.well-known/mcp/server.json |
| LLM context | https://aidc-ai.io/llms.txt |
| Full LLM context | https://aidc-ai.io/llms-full.txt |
| Contact | contact@aidc-ai.io |

---

## License

This repository (examples and connector code only) is released under the [MIT License](LICENSE).  
The AIDC-AI.IO engine, reference catalogs, and all server-side logic remain proprietary.
