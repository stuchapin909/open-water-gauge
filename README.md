# Open Water Gauge

[![npm version](https://img.shields.io/npm/v/openwatergauge)](https://www.npmjs.com/package/openwatergauge)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

MCP server that gives AI agents access to USGS stream gauge data -- water levels, discharge rates, and water temperature for thousands of stations nationwide. Free API, no key required.

## Why

AI agents can search the web and read documents -- but they can't check current river conditions, water levels, or flood status. If you ask "is it safe to kayak the Snoqualmie today?" or "is the Mississippi flooding at St. Louis?", the agent has to guess or tell you it can't look.

The USGS operates ~11,000 stream gauges nationwide with real-time telemetry. The data is free, publicly accessible, and updated every 15-60 minutes. Open Water Gauge gives agents structured access to this data through simple MCP tools.

## Quick start

```json
{
  "mcpServers": {
    "openwatergauge": {
      "command": "npx",
      "args": ["-y", "openwatergauge"]
    }
  }
}
```

Or install globally:

```bash
npm install -g openwatergauge
openwatergauge
```

No configuration needed. No API keys. The server queries USGS directly on every request.

## How it works

The USGS Water Services API serves real-time and historical stream gauge data as JSON. Every request hits the USGS API directly -- no cached data, no intermediate servers. A valid USGS site code is all you need to get current conditions.

The USGS operates two relevant endpoints:
- **Instantaneous Values (IV)** -- real-time readings, updated every 15-60 minutes per gauge
- **Daily Values (DV)** -- historical daily statistics, some gauges with 100+ years of data

## MCP Tools

| Tool | Description |
|---|---|
| `search_gauges` | Find gauges by state, keyword, or site code |
| `nearby_gauges` | Geographic search by lat/lng/radius, sorted by distance |
| `get_reading` | Current real-time conditions at one or more gauges |
| `get_history` | Historical daily averages over a date range |
| `get_gauge_info` | Detailed metadata for a single station |

### Parameters

Not every gauge measures every parameter. A small creek might only track gauge height. A major river gauge might track all four. Use `get_gauge_info` to see what a specific gauge supports.

| Code | Measurement | Unit |
|---|---|---|
| `00065` | Gauge height | feet |
| `00060` | Streamflow / discharge | ft³/s |
| `00010` | Water temperature | °C |
| `00045` | Precipitation | inches |

### Output format

Every tool returns structured JSON.

**get_reading response:**
```json
{
  "success": true,
  "requested": 1,
  "found": 1,
  "gauges": [
    {
      "id": "12149000",
      "name": "SNOQUALMIE RIVER NEAR CARNATION, WA",
      "lat": 47.666,
      "lng": -121.925,
      "state": "53",
      "county": "53033",
      "huc": "17110010",
      "timezone": "PST",
      "readings": {
        "Streamflow": {
          "value": 2820,
          "unit": "ft³/s",
          "datetime": "2026-04-01T06:15:00.000-07:00",
          "parameter_code": "00060"
        },
        "Gage Height": {
          "value": 46.93,
          "unit": "ft",
          "datetime": "2026-04-01T06:15:00.000-07:00",
          "parameter_code": "00065"
        }
      }
    }
  ]
}
```

**nearby_gauges response:**
```json
{
  "success": true,
  "query": { "lat": 47.6062, "lng": -122.3321, "radius_mi": 25 },
  "total_found": 39,
  "returned": 10,
  "gauges": [
    {
      "id": "12113415",
      "name": "DUWAMISH R AT E MARGINAL WAY BR AT DUWAMISH, WA",
      "lat": 47.5005,
      "lng": -122.2881,
      "distance_mi": 7.59,
      "readings": { "Gage Height": { "value": 9.12, "unit": "ft" } }
    }
  ]
}
```

**get_history response:**
```json
{
  "success": true,
  "gauge": { "id": "12149000", "name": "SNOQUALMIE RIVER NEAR CARNATION, WA" },
  "parameter": { "name": "Streamflow", "unit": "ft³/s" },
  "period": "2026-03-25 to 2026-04-01",
  "count": 7,
  "values": [
    { "date": "2026-03-25", "value": 10300 },
    { "date": "2026-03-26", "value": 7420 },
    { "date": "2026-03-31", "value": 3110 }
  ]
}
```

## Data source

All data comes from the USGS Water Services API:

| Endpoint | Purpose | URL |
|---|---|---|
| Instantaneous Values | Real-time readings | `waterservices.usgs.gov/nwis/iv/` |
| Daily Values | Historical data | `waterservices.usgs.gov/nwis/dv/` |

- Free, no API key, no rate limit
- ~11,000 active stream gauges nationwide
- Data updated every 15-60 minutes (varies by gauge)
- Historical records dating back to the 1800s for some stations
- Operated by the U.S. Geological Survey, a federal science agency

### Data notes

- All readings marked with qualifier `P` are provisional -- subject to revision after USGS quality control
- Some gauges are seasonal (inactive during winter in cold regions)
- Not all gauges have all parameters -- check `get_gauge_info` for available measurements
- Discharge (streamflow) is the most widely tracked parameter
- Water temperature is available at many but not all gauges

## Security

The server only makes outbound HTTPS requests to `waterservices.usgs.gov`. No user data is collected, stored, or transmitted. No telemetry, no analytics, no phone-home. The source code is open.

See [SECURITY.md](SECURITY.md) for details.

## Contributing

Bug fixes and improvements welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Why this exists

See [WHY.md](WHY.md) for the reasoning behind design decisions and how this fits into the agent-first ecosystem.

## License

MIT
