// api/index.js
export default async function handler(req, res) {
    try {
      // figure out which sub-path was requested
      const u = new URL(req.url, `https://${req.headers.host}`);
      // For /api/index or /api/index/spot.forecast …
      const path = u.pathname.replace(/^\/api\/index/, "") || "/";
  
      // ---- Discovery (root) ----
      if (path === "/") {
        res.setHeader("content-type", "application/json");
        return res.status(200).end(
          JSON.stringify({
            name: "Kitesurf Forecast MCP",
            version: "0.1.0",
            tools: ["spot.forecast", "tide.predictions"]
          })
        );
      }
  
      // ---- /spot.forecast?lat=..&lon=..&hours=.. ----
      if (path === "/spot.forecast") {
        const lat = Number(u.searchParams.get("lat"));
        const lon = Number(u.searchParams.get("lon"));
        const hours = Math.max(1, Math.min(168, Number(u.searchParams.get("hours") ?? 48)));
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          return res.status(400).json({ error: "lat and lon are required numbers" });
        }
  
        const om = new URL("https://marine-api.open-meteo.com/v1/marine");
        om.searchParams.set("latitude", String(lat));
        om.searchParams.set("longitude", String(lon));
        om.searchParams.set(
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
        om.searchParams.set("wind_speed_unit", "kn");
        om.searchParams.set("timezone", "auto");
  
        const r = await fetch(om);
        if (!r.ok) return res.status(502).json({ error: `Open-Meteo ${r.status}` });
        const json = await r.json();
  
        const H = json.hourly || {};
        const n = Math.min(hours, (H.time || []).length);
        const out = [];
        for (let i = 0; i < n; i++) {
          out.push({
            time: H.time?.[i],
            wind_kts: H.wind_speed_10m?.[i] ?? null,
            gust_kts: H.wind_gusts_10m?.[i] ?? null,
            wind_deg: H.wind_direction_10m?.[i] ?? null,
            wave_m: H.wave_height?.[i] ?? null,
            swell_period_s: H.wave_period?.[i] ?? null,
            swell_deg: H.wave_direction?.[i] ?? null
          });
        }
        return res.status(200).json({ lat, lon, hours: out.length, hourly: out });
      }
  
      // ---- /tide.predictions?... ----
      if (path === "/tide.predictions") {
        const station_id = u.searchParams.get("station_id");
        const begin_date = u.searchParams.get("begin_date");
        const end_date = u.searchParams.get("end_date");
        const time_zone = u.searchParams.get("time_zone") ?? "lst_ldt";
        const units = u.searchParams.get("units") ?? "metric";
        if (!station_id || !begin_date || !end_date) {
          return res.status(400).json({ error: "station_id, begin_date, end_date are required" });
        }
  
        const noaa = new URL("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter");
        noaa.searchParams.set("product", "predictions");
        noaa.searchParams.set("application", "kitesurf-mcp");
        noaa.searchParams.set("format", "json");
        noaa.searchParams.set("interval", "hilo");
        noaa.searchParams.set("datum", "MLLW");
        noaa.searchParams.set("time_zone", time_zone);
        noaa.searchParams.set("units", units);
        noaa.searchParams.set("begin_date", begin_date);
        noaa.searchParams.set("end_date", end_date);
        noaa.searchParams.set("station", station_id);
  
        const r = await fetch(noaa);
        if (!r.ok) return res.status(502).json({ error: `NOAA ${r.status}` });
        const json = await r.json();
        if (json.error) return res.status(502).json({ error: json.error.message });
  
        const predictions = (json.predictions || []).map(p => ({
          time: p.t,
          type: p.type,
          height: Number(p.v)
        }));
        return res.status(200).json({ station_id, begin_date, end_date, predictions });
      }
  
      // ---- Fallback ----
      return res.status(404).json({ error: "Not found", path });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }
  