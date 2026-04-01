# Privacy & Security

## What data does the server collect?

Nothing. The server runs locally on your machine. It makes HTTPS requests to `waterservices.usgs.gov` and returns the results. No telemetry, no analytics, no phone-home. The source code is open -- you can verify this yourself.

## What data does the USGS collect?

The USGS may log requests from your IP address. This is the same as visiting waterdata.usgs.gov directly. We have no control over their logging. The USGS is a federal science agency -- their data collection practices are governed by federal law.

## Can the server access private networks?

No. The server only communicates with `waterservices.usgs.gov`. There is no user-supplied URL, no SSRF risk, no ability to make requests to arbitrary endpoints. Unlike a camera server where users provide image URLs, every request here goes to a fixed, known USGS endpoint.

## Can the server access my webcam or microphone?

No. The MCP server runs as a local subprocess. It has no access to your hardware.

## Is this surveillance?

No. The server reads publicly available environmental data published by the U.S. Geological Survey. It's the same data available on the USGS website -- just structured for AI agents instead of human browsers.

## Is the data accurate?

Real-time readings are marked as provisional by the USGS and subject to revision. This is standard practice -- field instruments need calibration and quality control. The USGS runs its own validation processes. Historical daily values are more reliable as they've been through USGS quality control.

## What if the USGS API goes down?

The USGS Water Services API is maintained by the federal government and has high uptime. If it does go down, tool calls will return an error message. No stale or cached data is served.

## Security architecture

| Aspect | Detail |
|---|---|
| Network access | Outbound HTTPS only, to `waterservices.usgs.gov` |
| User-supplied URLs | None -- all requests go to fixed USGS endpoints |
| SSRF risk | None -- no URL injection possible |
| Data storage | None -- no local database, no cache |
| Authentication | None required by USGS |
| Telemetry | None |
| Dependencies | `@modelcontextprotocol/sdk`, `axios`, `zod` |
