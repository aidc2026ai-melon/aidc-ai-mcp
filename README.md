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
- Authenticated runnable examples that read the current response shape.

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
| Registry descriptor | `remote.server.json` (metadata revision 1.0.1; separate from npm/API versions) |
| Auth | Registered API key required. Configure `Authorization: Bearer` in the client credential settings; never send keys in tool arguments. |
| Tool count | 3 |
| Limits | The registered account limits apply; preserve HTTP 429 and `Retry-After`. |

### Tools

| Tool | One-line description |
|---|---|
| `design` | Size an AI data center: returns rack count, PUE, total MVA, liquid/air cooling split, CDU count, cost (KRW), and build timeline. |
| `validate` | Check a design against electrical, cooling, layout, safety, and data rules; returns severity-classified findings and RFIs. |
| `layout` | Generate a rack-plan grid (hall dimensions, row/column positions in mm) and a site-block layout. |

---

## Quick Start

### MCP client configuration

Obtain a registered integration key through [AIDC Contact](https://aidc-ai.io/contact).
Use a client that supports Streamable HTTP and pass the key through its
credential settings as an `Authorization: Bearer` header. The `mcp.json`
example contains a replacement marker, not a working credential. Keep the
configured copy private and never commit a real key.

For a local stdio client, the published package is available through npm:

```bash
npx -y aidc-mcp-server@0.2.4
```

Set `AIDC_API_KEY` in the MCP server process's environment using your client's
secret or environment configuration. A file next to the server is not read
automatically. `design`, `validate`, and `layout` do not accept credentials
as tool inputs. Authentication errors are connection-configuration failures,
not engineering verdicts.

### Docker (local stdio server)

Build and run the same published MCP server used for registry evaluation:

```bash
docker build -t aidc-ai-mcp .
docker run --rm -i -e AIDC_API_KEY aidc-ai-mcp
```

The container communicates over stdio and connects to `https://aidc-ai.io` by
default. Export a registered `AIDC_API_KEY` before running the container;
`-e AIDC_API_KEY` forwards the existing variable without placing its value in
the command text.

---

## REST Usage

The MCP package calls these REST endpoints. All calculation routes require a
registered key:

| Tool | REST endpoint |
|---|---|
| `design` | `POST https://aidc-ai.io/api/agent/design` |
| `validate` | `POST https://aidc-ai.io/api/agent/validate` |
| `layout` | `POST https://aidc-ai.io/api/agent/layout` |

### Example: size a 30 MW Rubin-era AI data center

```bash
curl -s -X POST https://aidc-ai.io/api/agent/design \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AIDC_API_KEY}" \
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

### Read the response

Use `node design.example.js` for a live authenticated example. Successful
responses contain `ok`, `summary`, `warnings`, `engineVersion`, `requestId`,
and `_agent`. Sizing values such as `rackCount`, `pueDesign`, and `mvaTotal`
are inside `summary`. Preserve warnings and validation findings; an `ok: true`
response does not certify the design or turn `PENDING` into PASS.

There is no fixed numeric output fixture for a real project. Use the returned
engine result and its evidence for the exact selected inputs.

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

Key response fields: `summary.rackCount`, optional `summary.unsnappedRackCount`,
`summary.pueDesign`, `summary.mvaTotal`, and cooling/commercial values inside
`summary`. `warnings[]`, `engineVersion`, and `requestId` are top-level fields.

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

Key response fields: `findings[]` (including `severity`, `family`, `message`,
and optional `publicRuleId`), `rfis[]`, and optional `verdict` / `graphVerdict`.
Public MCP accepts `rawInput` or `designSummary`; private EngineSession IDs
remain in the signed-in AIDC workflow.

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
