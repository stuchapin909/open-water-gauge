import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

// ── USGS API constants ──────────────────────────────────────────────
const USGS_IV = "https://waterservices.usgs.gov/nwis/iv/";
const USGS_DV = "https://waterservices.usgs.gov/nwis/dv/";

const PARAMS = {
  gauge_height: "00065",
  discharge: "00060",
  water_temp: "00010",
  precip: "00045",
};

const PARAM_NAMES = {
  "00065": { name: "Gage Height", unit: "ft" },
  "00060": { name: "Streamflow", unit: "ft³/s" },
  "00010": { name: "Water Temperature", unit: "°C" },
  "00045": { name: "Precipitation", unit: "in" },
};

const DEFAULT_PARAMS = Object.values(PARAMS).join(",");

// ── Helpers ─────────────────────────────────────────────────────────

function extractSiteInfo(sourceInfo) {
  const code = sourceInfo.siteCode[0].value;
  const geo = sourceInfo.geoLocation?.geogLocation;
  const tz = sourceInfo.timeZoneInfo;
  const props = {};
  for (const p of sourceInfo.siteProperty || []) {
    props[p.name] = p.value;
  }
  return {
    id: code,
    name: sourceInfo.siteName,
    lat: geo?.latitude ?? null,
    lng: geo?.longitude ?? null,
    state: props.stateCd || null,
    county: props.countyCd || null,
    huc: props.hucCd || null,
    site_type: props.siteTypeCd || null,
    timezone: tz?.defaultTimeZone?.zoneAbbreviation || null,
    uses_dst: tz?.siteUsesDaylightSavingsTime || false,
  };
}

function extractReadings(timeSeries) {
  const readings = {};
  for (const ts of timeSeries) {
    const paramCode = ts.variable.variableCode[0].value;
    const values = ts.values[0]?.value;
    if (!values || values.length === 0) continue;
    const latest = values[values.length - 1];
    const val = parseFloat(latest.value);
    if (val <= -999900) continue; // USGS no-data sentinel (-999999)
    readings[paramCode] = {
      value: val,
      unit: ts.variable.unit.unitCode,
      name: ts.variable.variableName,
      datetime: latest.dateTime,
      qualifier: latest.qualifiers?.[0] || null,
    };
  }
  return readings;
}

function formatReadings(readings) {
  const formatted = {};
  for (const [code, r] of Object.entries(readings)) {
    const info = PARAM_NAMES[code] || { name: r.name, unit: r.unit };
    formatted[info.name] = {
      value: r.value,
      unit: info.unit,
      datetime: r.datetime,
      parameter_code: code,
    };
  }
  return formatted;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchIV(params) {
  const resp = await axios.get(USGS_IV, {
    params: { format: "json", ...params },
    timeout: 15000,
  });
  return resp.data.value.timeSeries;
}

async function fetchDV(params) {
  const resp = await axios.get(USGS_DV, {
    params: { format: "json", ...params },
    timeout: 15000,
  });
  return resp.data.value.timeSeries;
}

// ── MCP Server ──────────────────────────────────────────────────────

const server = new McpServer({
  name: "openwatergauge",
  version: "1.0.0",
});

server.tool(
  "search_gauges",
  "Search USGS stream gauges by state, keyword, or site code. Returns gauge metadata with latest readings.",
  {
    state: z.string().optional().describe("Two-letter US state code (e.g. WA, CA, TX)"),
    keyword: z.string().optional().describe("Search term to match against gauge names (e.g. 'columbia', 'mississippi')"),
    site_code: z.string().optional().describe("Specific USGS site code (e.g. 12149000)"),
    parameters: z.string().optional().describe("Comma-separated USGS parameter codes. Default: 00065,00060,00010. Common: 00065=gauge height, 00060=discharge, 00010=water temp, 00045=precipitation"),
    limit: z.number().optional().describe("Max results (default 20, max 100)"),
  },
  async ({ state, keyword, site_code, parameters, limit }) => {
    const params = {
      parameterCd: parameters || DEFAULT_PARAMS,
      siteStatus: "active",
    };

    if (site_code) {
      params.sites = site_code;
    } else {
      if (state) params.stateCd = state;
      if (keyword) params.siteName = keyword;
    }

    const maxLimit = Math.min(limit || 20, 100);
    const timeSeries = await fetchIV(params);

    // Group by site (one site may have multiple time series per parameter)
    const bySite = new Map();
    for (const ts of timeSeries) {
      const code = ts.sourceInfo.siteCode[0].value;
      if (!bySite.has(code)) {
        bySite.set(code, extractSiteInfo(ts.sourceInfo));
      }
      const r = extractReadings([ts]);
      if (!bySite.get(code).readings) bySite.get(code).readings = {};
      Object.assign(bySite.get(code).readings, r);
    }

    const results = Array.from(bySite.values())
      .slice(0, maxLimit)
      .map((g) => ({ ...g, readings: formatReadings(g.readings || {}) }));

    return {
      success: true,
      total: bySite.size,
      returned: results.length,
      gauges: results,
    };
  }
);

server.tool(
  "nearby_gauges",
  "Find stream gauges near a location. Returns gauges sorted by distance with latest readings.",
  {
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    radius_mi: z.number().optional().describe("Search radius in miles (default 25, max 100)"),
    limit: z.number().optional().describe("Max results (default 10, max 50)"),
  },
  async ({ lat, lng, radius_mi, limit }) => {
    const radius = Math.min(radius_mi || 25, 100);
    const maxLimit = Math.min(limit || 10, 50);

    const latDelta = radius / 69;
    const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180));

    const bbox = [
      (lng - lngDelta).toFixed(4),
      (lat - latDelta).toFixed(4),
      (lng + lngDelta).toFixed(4),
      (lat + latDelta).toFixed(4),
    ].join(",");

    const timeSeries = await fetchIV({
      bBox: bbox,
      parameterCd: DEFAULT_PARAMS,
      siteType: "ST",
      siteStatus: "active",
    });

    const bySite = new Map();
    for (const ts of timeSeries) {
      const code = ts.sourceInfo.siteCode[0].value;
      if (!bySite.has(code)) {
        bySite.set(code, extractSiteInfo(ts.sourceInfo));
      }
      const r = extractReadings([ts]);
      if (!bySite.get(code).readings) bySite.get(code).readings = {};
      Object.assign(bySite.get(code).readings, r);
    }

    const results = Array.from(bySite.values())
      .map((g) => ({
        ...g,
        distance_mi: Math.round(haversine(lat, lng, g.lat, g.lng) * 100) / 100,
        readings: formatReadings(g.readings || {}),
      }))
      .filter((g) => g.distance_mi <= radius)
      .sort((a, b) => a.distance_mi - b.distance_mi)
      .slice(0, maxLimit);

    return {
      success: true,
      query: { lat, lng, radius_mi: radius },
      total_found: bySite.size,
      returned: results.length,
      gauges: results,
    };
  }
);

server.tool(
  "get_reading",
  "Get current real-time readings from one or more USGS stream gauges.",
  {
    site_codes: z.string().describe("Comma-separated USGS site codes (e.g. '12149000,12148500')"),
    parameters: z.string().optional().describe("Comma-separated parameter codes. Default: 00065,00060,00010. Common: 00065=gauge height, 00060=discharge, 00010=water temp, 00045=precipitation"),
  },
  async ({ site_codes, parameters }) => {
    const codes = site_codes.split(",").map((s) => s.trim()).filter(Boolean);
    if (codes.length === 0) {
      return { success: false, error: "No site codes provided" };
    }

    const timeSeries = await fetchIV({
      sites: codes.join(","),
      parameterCd: parameters || DEFAULT_PARAMS,
    });

    const bySite = new Map();
    for (const ts of timeSeries) {
      const code = ts.sourceInfo.siteCode[0].value;
      if (!bySite.has(code)) {
        bySite.set(code, extractSiteInfo(ts.sourceInfo));
      }
      const r = extractReadings([ts]);
      if (!bySite.get(code).readings) bySite.get(code).readings = {};
      Object.assign(bySite.get(code).readings, r);
    }

    const gauges = Array.from(bySite.values()).map((g) => ({
      ...g,
      readings: formatReadings(g.readings || {}),
    }));

    return {
      success: true,
      requested: codes.length,
      found: gauges.length,
      gauges,
    };
  }
);

server.tool(
  "get_history",
  "Get historical daily average readings for a gauge over a date range.",
  {
    site_code: z.string().describe("USGS site code (e.g. 12149000)"),
    parameter: z.string().optional().describe("USGS parameter code (default: 00060 discharge). Common: 00060=discharge, 00065=gauge height, 00010=water temp"),
    start_date: z.string().optional().describe("Start date YYYY-MM-DD (default: 30 days ago)"),
    end_date: z.string().optional().describe("End date YYYY-MM-DD (default: today)"),
  },
  async ({ site_code, parameter, start_date, end_date }) => {
    if (!site_code) return { success: false, error: "site_code is required" };

    const paramCode = parameter || "00060";
    const endDate = end_date || new Date().toISOString().split("T")[0];
    const startDate = start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const timeSeries = await fetchDV({
      sites: site_code,
      parameterCd: paramCode,
      startDT: startDate,
      endDT: endDate,
      statCd: "00003",
    });

    if (timeSeries.length === 0) {
      return {
        success: true,
        site_code,
        parameter: paramCode,
        period: `${startDate} to ${endDate}`,
        message: "No historical data available for this gauge/parameter/period",
        values: [],
      };
    }

    const ts = timeSeries[0];
    const values = ts.values[0]?.value || [];
    const paramInfo = PARAM_NAMES[paramCode] || { name: paramCode, unit: "unknown" };

    return {
      success: true,
      gauge: extractSiteInfo(ts.sourceInfo),
      parameter: paramInfo,
      period: `${startDate} to ${endDate}`,
      count: values.length,
      values: values.map((v) => ({
        date: v.dateTime.split("T")[0],
        value: parseFloat(v.value),
      })),
    };
  }
);

server.tool(
  "get_gauge_info",
  "Get detailed metadata for a single USGS stream gauge station.",
  {
    site_code: z.string().describe("USGS site code (e.g. 12149000)"),
  },
  async ({ site_code }) => {
    if (!site_code) return { success: false, error: "site_code is required" };

    const timeSeries = await fetchIV({
      sites: site_code,
      parameterCd: DEFAULT_PARAMS,
    });

    if (timeSeries.length === 0) {
      return { success: false, error: `Gauge ${site_code} not found or inactive` };
    }

    const availableParams = timeSeries.map((ts) => {
      const code = ts.variable.variableCode[0].value;
      const info = PARAM_NAMES[code] || {};
      return {
        code,
        name: info.name || ts.variable.variableName,
        unit: info.unit || ts.variable.unit.unitCode,
        has_data: (ts.values[0]?.value || []).length > 0,
      };
    });

    const site = extractSiteInfo(timeSeries[0].sourceInfo);
    const readings = extractReadings(timeSeries);

    return {
      success: true,
      gauge: site,
      available_parameters: availableParams,
      current_readings: formatReadings(readings),
    };
  }
);

export { server };
