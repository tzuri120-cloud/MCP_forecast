# MCP_forecast

# Kitesurf Forecast MCP
Minimal MCP server exposing two tools:
- spot.forecast{lat, lon, hours?} → Open-Meteo Marine hourly wind & waves (knots, meters)
- tide.predictions{station_id, begin_date, end_date, time_zone?, units?} → NOAA CO-OPS tide highs/lows


## Deploy (Vercel)
1) Fork/clone → push to GitHub.
2) Go to vercel.com → New Project → Import your repo.
3) Build output is the default (Node on serverless). No env vars required.
4) On success you get: https://<your-app>.vercel.app


## Test
- Browser: open the root URL to see discovery JSON.
- cURL example (forecast):
curl "https://<your-app>.vercel.app/api/index.js" # should be handled by routes


## Use in MCP host
### Claude Desktop `mcp.json`
{
"mcpServers": {
"kitesurf-mcp": { "url": "https://<your-app>.vercel.app" }
}
}


Then ask: "Using kitesurf-mcp, call spot.forecast for lat=41.39, lon=-70.51, hours=24".


### ChatGPT (MCP beta)
Add a custom MCP server → URL: https://<your-app>.vercel.app


## Notes
- Open-Meteo returns wind in knots when `wind_speed_unit=kn`.
- NOAA tides require a station id; find one at tidesandcurrents.noaa.gov.