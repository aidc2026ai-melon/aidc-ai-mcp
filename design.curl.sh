#!/usr/bin/env bash
# Size a 30 MW Rubin-era AI data center via the AIDC-AI.IO agent REST API.
# A registered AIDC_API_KEY must already be set in the environment.
set -euo pipefail
: "${AIDC_API_KEY:?Set a registered AIDC_API_KEY before running this example.}"

curl --fail-with-body --silent --show-error -X POST https://aidc-ai.io/api/agent/design \
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
  }' | python3 -m json.tool
