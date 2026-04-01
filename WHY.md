# Why Open Water Gauge

## The problem

AI agents can search the web and read documents -- but they can't check current environmental conditions. If you ask "what's the water level at the Snoqualmie River?" or "has the Mississippi been rising this week?", the agent has to guess or tell you it can't look.

This matters for real decisions: kayaking safety, flood monitoring, fishing conditions, drought tracking, construction near waterways, hydropower planning. People check water levels constantly -- agents should be able to do the same.

## Why USGS

The U.S. Geological Survey operates the largest stream gauge network in the world. ~11,000 active stations with real-time telemetry, free API, no authentication, no rate limits. The data is public by design -- it's a federal science agency whose mission includes disseminating water data.

This is the same pattern that makes Open Eagle Eye work: government-maintained infrastructure, free API, no keys, station-level data with coordinates. The data is naturally open.

## Why not cached data

Open Eagle Eye caches a static camera registry because webcam URLs change and need validation. USGS data doesn't have that problem -- the API is the source of truth, it's fast, and it never goes down. Querying live means the agent always gets current readings, not stale data from the last cache refresh.

The tradeoff: a network request per tool call instead of a local file read. In practice this adds ~1 second and is irrelevant for an agent answering a question.

## Why no images

Water gauge data is numerical, not visual. A gauge height of 9.12 feet means something specific. A discharge rate of 2,820 ft³/s means something specific. There's no image to fetch -- the value IS the data. This makes the server simpler than Eagle Eye: no SSRF protection, no content-type validation, no vision AI screening.

## Existing options

| | Open Water Gauge | USGS WaterWatch | USGS mobile app | Environmental APIs |
|---|---|---|---|---|
| **Agent-native** | Yes -- structured JSON, MCP protocol | No -- website for humans | No -- app for humans | Some, varies |
| **Access method** | MCP tools, npm package | Browser | Mobile app | REST APIs |
| **Authentication** | None | None | None | Varies |
| **Nearby search** | Yes (lat/lng/radius) | Map-based | Map-based | Varies |
| **Historical data** | Yes (daily values) | Limited | Limited | Varies |
| **Multiple gauges** | Yes (batch queries) | One at a time | One at a time | Varies |
| **Open source** | Yes (MIT) | N/A (government) | N/A (government) | Varies |

## What "agent-native" means here

The USGS website is built for humans browsing maps and clicking on individual stations. The API is designed for bulk data retrieval by scientists. Open Water Gauge sits between them -- it gives agents exactly what they need: a gauge name, a current reading, and a unit. No map rendering, no page scraping, no CSV parsing.

An agent doesn't need to know that parameter code `00060` means discharge. The server translates that into `"Streamflow": { "value": 2820, "unit": "ft³/s" }`. The agent just answers the user's question.

## Why open source

Water data is public infrastructure. The USGS provides it for free. An MCP server that makes this data accessible to AI agents should also be free. The more agents and developers use it, the more use cases emerge, and the better the tooling gets for everyone.
