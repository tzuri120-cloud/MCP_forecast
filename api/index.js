import express from "express";
import fetch from "cross-fetch";

const app = express();
app.use(express.json());

// Root: discovery
app.get("/", (_req, res) => {
  res.json({
    name: "Kitesurf Forecast MCP",
    version: "0.1.0",
    tools: ["spot.forecast", "tide.predictions"]
  });
});

// GET /spot.forecast?lat=41.39&lon=-70.51&hours=24
app.get("/spot.forecast", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const hours = Math.max(1, Math.min(168, Number(req.query.hours ?? 48)));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: "lat and lon are required numbers" });
    }

    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
      "hourly",
      [
        "wind_speed_10m",
        "wind_gusts_10m",
        "wind_direction_10m",
        "wave_height",
        "wave_direction",
        "wave_period"
      ].join(",")
    );
    url.searchParams.set("wind_speed_unit", "kn");
    url.searchParams.set("timezone", "auto");

    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: `Open-Meteo ${r.status}` });
    const json = await r.json();

    const H = json.hourly || {};
    const n = Math.min(hours, (H.time || []).length);
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        time: H.time?.[i],
        wind_kts: H.wind_speed_10m?.[i] ?? null,
        gust_kts: H.wind_gusts_10m?.[i] ?? null,
        wind_deg: H.wind_direction_10m?.[i] ?? null,
        wave_m: H.wave_height?.[i] ?? null,
        swell_period_s: H.wave_period?.[i] ?? null,
        swell_deg: H.wave_direction?.[i] ?? null
      });
    }
    res.json({ lat, lon, hours: rows.length, hourly: rows });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// GET /tide.predictions?station_id=8447435&begin_date=20250928&end_date=20251001&time_zone=lst_ldt&units=metric
app.get("/tide.predictions", async (req, res) => {
  try {
    const { station_id, begin_date, end_date } = req.query;
    const time_zone = req.query.time_zone ?? "lst_ldt";
    const units = req.query.units ?? "metric";
    if (!station_id || !begin_date || !end_date) {
      return res.status(400).json({ error: "station_id, begin_date, end_date are required" });
    }

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
    if (!r.ok) return res.status(502).json({ error: `NOAA ${r.status}` });
    const json = await r.json();
    if (json.error) return res.status(502).json({ error: json.error.message });

    const predictions = (json.predictions || []).map(p => ({
      time: p.t,
      type: p.type, // H or L
      height: Number(p.v)
    }));
    res.json({ station_id, begin_date, end_date, predictions });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

export default app;
