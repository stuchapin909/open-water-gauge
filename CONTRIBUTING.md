# Contributing to Open Water Gauge

Bug fixes, improvements, and new features welcome. Open an issue first if the change is substantial.

## Development setup

```bash
git clone https://github.com/stuchapin909/open-water-gauge.git
cd open-water-gauge
npm install
```

Test locally:

```bash
# Start the MCP server (stdio mode -- no output expected)
node index.js

# Test with a JSON-RPC message
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"nearby_gauges","arguments":{"lat":47.6062,"lng":-122.3321}}}' | node index.js
```

## Adding a new tool

1. Define the tool schema in `server.js` using Zod (all parameter schemas must use `z.string()`, `z.number()`, etc.)
2. Implement the handler as an async function
3. Use `fetchIV()` for real-time data or `fetchDV()` for historical data
4. Return structured JSON matching the existing response format
5. Test against live USGS data before pushing

## USGS API reference

### Instantaneous Values (real-time)
```
https://waterservices.usgs.gov/nwis/iv/?format=json&sites=12149000&parameterCd=00065,00060
```

Query parameters:
- `sites` -- comma-separated USGS site codes
- `stateCd` -- two-letter state code (e.g. `WA`)
- `bBox` -- bounding box `west,south,east,north` (max 7 decimal places)
- `siteType` -- `ST` for stream, `GW` for groundwater, `LK` for lake
- `siteStatus` -- `active`, `all`
- `parameterCd` -- comma-separated parameter codes
- `period` -- `P1D` (last day), `P7D` (last week)

### Daily Values (historical)
```
https://waterservices.usgs.gov/nwis/dv/?format=json&sites=12149000&parameterCd=00060&startDT=2026-01-01&endDT=2026-04-01&statCd=00003
```

Additional query parameters:
- `startDT` / `endDT` -- date range in `YYYY-MM-DD`
- `statCd` -- `00003` (mean), `00001` (max), `00002` (min), `00008` (median)

### Parameter codes

| Code | Measurement | Typical unit |
|---|---|---|
| `00065` | Gage height | ft |
| `00060` | Discharge / streamflow | ft³/s |
| `00010` | Water temperature | °C |
| `00045` | Precipitation | in |
| `00095` | Specific conductance | µS/cm |
| `00300` | Dissolved oxygen | mg/L |
| `00400` | pH | standard units |
| `63160` | Stream water level elevation | ft above NGVD29 |

### Common pitfalls

**No-data sentinel:** USGS uses `-999999` to indicate missing data. The server filters these out automatically.

**Provisional data:** Real-time readings are marked with qualifier `P` -- they're subject to revision after USGS quality control. This is normal and expected.

**Site metadata endpoint:** The USGS site service (`/nwis/site/`) does not support JSON output -- only RDB and WML formats. This server uses the IV endpoint for metadata instead (every reading response includes full station info).

**Bounding box precision:** The USGS API requires at most 7 decimal places in bounding box coordinates. The server rounds to 4 decimals.

**Seasonal gauges:** Some gauges are inactive during winter. They return no data but the station metadata is still valid.

**Not all parameters everywhere:** A gauge might track discharge but not temperature. Always check `available_parameters` in `get_gauge_info` before requesting a specific parameter.

## Code style

- ES modules (`import`/`export`)
- Zod schemas for all MCP tool parameters
- Async handlers with try/catch for USGS API errors
- Return `{ success: false, error: "..." }` for validation failures

## License

Contributions are licensed under MIT. By submitting a PR you agree to license your changes under the same terms.
