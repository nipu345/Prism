import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import client from "../api/client"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts"

// validated categorical set (dataviz-skill validator: CVD delta-E >= 8, dark
// lightness band, >=3:1 contrast on --color-bg) — keep these three hex
// values in sync with the --color-conservative/moderate/aggressive tokens
// in index.css, Recharts needs literal colors, not Tailwind classes
const SCENARIOS = [
  { key: "conservative", label: "Conservative", subtitle: "Cautious case", color: "text-conservative", bg: "bg-conservative/10 border-conservative/20", line: "#199e70" },
  { key: "moderate", label: "Moderate", subtitle: "Expected case", color: "text-moderate", bg: "bg-moderate/10 border-moderate/20", line: "#3987e5" },
  { key: "aggressive", label: "Aggressive", subtitle: "Optimistic case", color: "text-aggressive", bg: "bg-aggressive/10 border-aggressive/20", line: "#d95926" },
]

const CHART_THEME = {
  grid: "#232a42",
  tick: { fill: "#a39d8f", fontSize: 12, fontFamily: "JetBrains Mono, monospace" },
  tooltip: { backgroundColor: "#12172a", border: "2px solid #232a42", borderRadius: "0px", fontFamily: "JetBrains Mono, monospace" },
}

function StatTile({ label, value }) {
  return (
    <div className="bg-surface border-2 border-border rounded-none p-5">
      <p className="text-ink-muted text-sm">{label}</p>
      <p className="text-2xl font-semibold text-ink mt-1 font-mono">{value}</p>
    </div>
  )
}

function ModelCaption({ agent }) {
  const mape = agent.backtest?.mape
  return (
    <p className="text-xs text-ink-faint mt-2 font-mono">
      Model: <span className="text-ink-muted">{agent.model_used}</span>
      {mape !== undefined && mape !== null && (
        <> · Backtested accuracy: <span className="text-ink-muted">{(100 - mape).toFixed(1)}%</span> (MAPE {mape}%, {agent.backtest?.holdout_days}-day holdout)</>
      )}
    </p>
  )
}

function ForecastChart({ agent, color }) {
  return (
    <div className="bg-surface border-2 border-border rounded-none p-6">
      <h4 className="text-sm font-medium text-ink-muted mb-4">{agent.forecast_days}-day revenue forecast</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={agent.forecast}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis dataKey="day" tick={CHART_THEME.tick} />
          <YAxis tick={CHART_THEME.tick} />
          <Tooltip contentStyle={CHART_THEME.tooltip} />
          <Line type="monotone" dataKey="predicted_revenue" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Results() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeScenario, setActiveScenario] = useState("conservative")

  useEffect(() => {
    let ignore = false

    client.get(`/analysis/reports/${reportId}`)
      .then(res => { if (!ignore) setReport(res.data) })
      .catch(err => console.error(err))
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [reportId])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-ink-muted">Loading results...</p>
    </div>
  )

  if (!report) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-ink-muted">Report not found</p>
    </div>
  )

  const active = SCENARIOS.find(s => s.key === activeScenario)
  const agent = report[activeScenario]

  const regionData = report.conservative?.revenue_by_region
    ? Object.entries(report.conservative.revenue_by_region).map(([region, revenue]) => ({ region, revenue }))
    : []

  const productData = report.conservative?.revenue_by_product
    ? Object.entries(report.conservative.revenue_by_product).map(([product, revenue]) => ({ product, revenue }))
    : []

  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/dashboard")}>Prism</h1>
        <button onClick={() => navigate("/dashboard")} className="text-ink-muted hover:text-ink text-sm transition-colors">
          ← Back to dashboard
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold mb-2">Analysis results</h2>
        <p className="text-ink-muted mb-6">Three risk scenarios, each backed by a backtested forecasting model</p>

        {report.ai_summary && (
          <div className="bg-gradient-to-br from-accent/10 to-moderate/10 border-2 border-accent/20 rounded-none p-6 mb-8">
            <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">AI executive summary</p>
            <p className="text-ink-soft leading-relaxed">{report.ai_summary}</p>
          </div>
        )}

        {/* Scenario selector */}
        <div className="flex gap-3 mb-8">
          {SCENARIOS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveScenario(s.key)}
              className={`px-5 py-2.5 rounded-none border text-sm font-medium transition-colors ${
                activeScenario === s.key
                  ? s.bg + " " + s.color
                  : "border-border-hover text-ink-muted hover:border-accent/40"
              }`}
            >
              {s.label}
              <span className="block text-[10px] font-normal opacity-70">{s.subtitle}</span>
            </button>
          ))}
        </div>

        {!agent ? (
          <div className="text-ink-muted">No data for this scenario.</div>
        ) : agent.error ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-none p-5">
            {agent.error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-surface border-2 border-border rounded-none p-6">
              <h3 className={`text-lg font-semibold mb-1 ${active.color}`}>{agent.scenario || active.subtitle}</h3>
              <p className="text-ink-soft">{agent.insight}</p>
              {agent.plain_english && (
                <p className="text-ink-muted text-sm mt-3 pt-3 border-t border-border">
                  <span className="text-ink-faint uppercase text-[10px] tracking-wide block mb-1">In plain terms</span>
                  {agent.plain_english}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatTile label={`${agent.forecast_days}-day forecast`} value={`$${agent.forecasted_total_revenue?.toLocaleString()}`} />
              <StatTile label="Daily average" value={`$${agent.forecasted_daily_average?.toLocaleString()}`} />
              <StatTile
                label="Backtested accuracy"
                value={agent.backtest?.mape != null ? `${(100 - agent.backtest.mape).toFixed(1)}%` : "N/A"}
              />
            </div>

            <div>
              <ForecastChart agent={agent} color={active.line} />
              <ModelCaption agent={agent} />
            </div>

            {activeScenario === "conservative" && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-surface border-2 border-border rounded-none p-6">
                  <h4 className="text-sm font-medium text-ink-muted mb-4">Revenue by region</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={regionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                      <XAxis dataKey="region" tick={CHART_THEME.tick} />
                      <YAxis tick={CHART_THEME.tick} />
                      <Tooltip contentStyle={CHART_THEME.tooltip} />
                      <Bar dataKey="revenue" fill="#199e70" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-surface border-2 border-border rounded-none p-6">
                  <h4 className="text-sm font-medium text-ink-muted mb-4">Revenue by product</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={productData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                      <XAxis dataKey="product" tick={CHART_THEME.tick} />
                      <YAxis tick={CHART_THEME.tick} />
                      <Tooltip contentStyle={CHART_THEME.tooltip} />
                      <Bar dataKey="revenue" fill="#199e70" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeScenario === "aggressive" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatTile label="Anomalies found" value={agent.anomalies_found} />
                  <StatTile label="Best product" value={agent.best_performing_product ?? "—"} />
                  <StatTile label="Underperforming regions" value={agent.underperforming_regions?.length ?? 0} />
                </div>

                {agent.anomalies?.length > 0 && (
                  <div className="bg-surface border-2 border-border rounded-none p-6">
                    <h4 className="text-sm font-medium text-ink-muted mb-4">Detected anomalies (risk factors)</h4>
                    <div className="space-y-3">
                      {agent.anomalies.map((a, i) => (
                        <div key={i} className="flex items-center justify-between bg-surface-hover rounded-none px-4 py-3">
                          <div>
                            <p className="text-ink text-sm font-medium">{a.date}</p>
                            <p className="text-ink-muted text-xs">{a.product} · {a.region}</p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="text-ink text-sm">${a.revenue?.toLocaleString()}</p>
                            <p className="text-ink-muted text-xs">{a.units_sold} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {agent.underperforming_regions?.length > 0 && (
                  <div className="bg-surface border-2 border-border rounded-none p-6">
                    <h4 className="text-sm font-medium text-ink-muted mb-3">Underperforming regions</h4>
                    <div className="flex gap-2 flex-wrap">
                      {agent.underperforming_regions.map(r => (
                        <span key={r} className="bg-aggressive/10 border border-aggressive/20 text-aggressive text-sm px-3 py-1 rounded-none">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
