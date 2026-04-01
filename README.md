# Open Water Gauge

MCP server that gives AI agents access to USGS stream gauge data — water levels, discharge rates, and water temperature for thousands of stations nationwide.

**Data source:** USGS Water Services API (free, no API key required)

## Tools

| Tool | Description |
|------|-------------|
| `search_gauges` | Find gauges by state, keyword, or site code |
| `nearby_gauges` | Geographic search by lat/lng/radius, sorted by distance |
| `get_reading` | Current real-time conditions at one or more gauges |
| `get_history` | Historical daily averages over a date range |
| `get_gauge_info` | Detailed metadata for a single station |

## Install

```bash
npm install -g openwatergauge
```

## Configure with Hermes

```bash
hermes mcp add openwatergauge -- npx openwatergauge
```

## Configure with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openwatergauge": {
      "command": "npx",
      "args": ["openwatergauge"]
    }
  }
}
```

## Parameters

USGS parameter codes for common measurements:

| Code | Measurement | Unit |
|------|------------|------|
| `00065` | Gauge height | feet |
| `00060` | Streamflow / discharge | ft³/s |
| `00010` | Water temperature | °C |
| `00045` | Precipitation | inches |

## Example queries

- "What's the water level at the Snoqualmie River near Carnation?"
- "Show me stream gauges within 10 miles of Portland, Oregon"
- "Has the Mississippi River at St. Louis been rising this week?"
- "What's the water temperature in the Green River?"
- "Find all active gauges in California"

## License

MIT
