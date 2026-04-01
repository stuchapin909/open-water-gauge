# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-01

Initial release -- MCP server providing access to USGS stream gauge data.

### Features
- 5 MCP tools: search_gauges, nearby_gauges, get_reading, get_history, get_gauge_info
- Live queries to USGS Water Services API (no cached data)
- Access to ~11,000 active stream gauges nationwide
- Real-time gauge height, discharge, water temperature, and precipitation
- Historical daily averages (some gauges with 100+ years of data)
- Geographic search with distance sorting
- No API key required
- USGS no-data sentinel filtering (-999999 values)
