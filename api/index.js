import express from "express";


// --- Tool: tide.predictions ---
// NOAA CO-OPS tide highs/lows for a station id and date range YYYYMMDD to YYYYMMDD
server.tool("tide.predictions", {
description: "NOAA tide predictions (high/low) for a station id and date range (YYYYMMDD).",
inputSchema: {
type: "object",
properties: {
station_id: { type: "string", description: "NOAA CO-OPS station id (e.g., 8447435)" },
begin_date: { type: "string", description: "YYYYMMDD" },
end_date: { type: "string", description: "YYYYMMDD" },
time_zone: { type: "string", description: "'gmt' or 'lst_ldt'", enum: ["gmt", "lst_ldt"], default: "lst_ldt" },
units: { type: "string", description: "'english' or 'metric'", enum: ["english", "metric"], default: "metric" }
},
required: ["station_id", "begin_date", "end_date"]
},
handler: async ({ station_id, begin_date, end_date, time_zone = "lst_ldt", units = "metric" }) => {
const url = new URL("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter");
url.searchParams.set("product", "predictions");
url.searchParams.set("application", "kitesurf-mcp");
url.searchParams.set("format", "json");
url.searchParams.set("interval", "hilo");
url.searchParams.set("datum", "MLLW");
url.searchParams.set("time_zone", time_zone);
url.searchParams.set("units", units);
url.searchParams.set("begin_date", begin_date);
url.searchParams.set("end_date", end_date);
url.searchParams.set("station", station_id);


const r = await fetch(url);
if (!r.ok) throw new Error(`NOAA error ${r.status}`);
const json = await r.json();
if (json.error) throw new Error(`NOAA: ${json.error.message || "unknown error"}`);


// Normalize to a tidy list
const predictions = (json.predictions || []).map(p => ({
time: p.t,
type: p.type, // H or L
height: Number(p.v)
}));
return { station_id, begin_date, end_date, predictions };
}
});


// Discovery endpoint so hosts can see what's available
app.get("/", (_req, res) => {
res.json({
name: "Kitesurf Forecast MCP",
version: "0.1.0",
tools: ["spot.forecast", "tide.predictions"]
});
});


export default app;