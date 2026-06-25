#!/usr/bin/env bash
# Size a 30 MW Rubin-era AI data center via the AIDC-AI.IO agent REST API.
# No API key required for the anonymous tier (10 req/hour per IP).
# To raise the rate limit, add: -H "Authorization: Bearer aidc_live_<32hex>"

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
  }' | python3 -m json.tool
