import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import client from "../api/client"
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts"
import Nav from "../components/Nav"

// validated for a LIGHT surface by the dataviz validator — keep in sync with
// the --color-conservative/moderate/aggressive tokens in index.css (Recharts
// needs literal colors, not Tailwind classes)
const SCENARIOS = [
  { key: "conservative", label: "Conservative", color: "#15855e" },
  { key: "moderate", label: "Moderate", color: "#2a78d6" },
  { key: "aggressive", label: "Aggressive", color: "#c9501f" },
]

const CHART = {
  grid: "#eeece7",
  axis: { fill: "#9a9a9f", fontSize: 10, fontFamily: "Instrument Sans, sans-serif" },
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e6e4df",
    borderRadius: "0px",
    fontSize: "12px",
    fontFamily: "Instrument Sans, sans-serif",
  },
}

const money = (n) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`)
const money2 = (n) => (n == null ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

function Label({ children, className = "" }) {
  return <div className={`label ${className}`}>{children}</div>
}

export default function Results() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    client.get(`/analysis/reports/${reportId}`)
      .then(res => { if (!ignore) setReport(res.data) })
      .catch(err => console.error(err))
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [reportId])

  if (loading) return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <p className="text-ink-muted px-14 py-14 text-sm">Loading results…</p>
    </div>
  )

  if (!report) return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <p className="text-ink-muted px-14 py-14 text-sm">Report not found.</p>
    </div>
  )

  const moderate = report.moderate
  const failed = !moderate || moderate.error

  if (failed) return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <div className="max-w-[1180px] mx-auto px-14 py-14">
        <h1 className="text-3xl font-normal tracking-tight mb-4">Analysis incomplete</h1>
        <p className="text-ink-muted text-sm max-w-xl leading-relaxed">
          {moderate?.error || "This report has no forecast data."}
        </p>
      </div>
    </div>
  )

  const conservative = report.conservative
  const aggressive = report.aggressive
  const histAvg = conservative?.mean_daily_revenue

  // one row per forecast day, all three scenarios side by side
  const chartData = (moderate.forecast || []).map((point, i) => ({
    day: point.day,
    date: point.date,
    conservative: conservative?.forecast?.[i]?.predicted_revenue,
    moderate: point.predicted_revenue,
    aggressive: aggressive?.forecast?.[i]?.predicted_revenue,
  }))

  const byKey = { conservative, moderate, aggressive }
  const vsHistorical = (agent) =>
    histAvg && agent?.forecasted_daily_average != null
      ? (agent.forecasted_daily_average / histAvg - 1) * 100
      : null

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <div className="max-w-[1180px] mx-auto px-14 pt-14 pb-20">

        <header className="flex items-end justify-between mb-14">
          <div>
            <Label className="mb-3.5">Revenue forecast · next {moderate.forecast_days} days</Label>
            <h1 className="text-[38px] font-normal tracking-[-0.025em] leading-[1.1]">
              {report.filename || "Analysis"}
            </h1>
          </div>
          <div className="tnum text-xs text-ink-faint text-right leading-[1.7]">
            {report.row_count != null && <>{report.row_count.toLocaleString()} records<br /></>}
            {report.uploaded_at && <>Uploaded {new Date(report.uploaded_at).toLocaleDateString()}</>}
          </div>
        </header>

        {/* the three scenarios, side by side — no tabs */}
        <div className="grid grid-cols-3 mb-4" style={{ gap: "52px" }}>
          {SCENARIOS.map(s => (
            <div key={s.key}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-2 h-2 inline-block" style={{ background: s.color }} />
                <span className="label" style={{ color: "var(--color-ink)" }}>{s.label}</span>
              </div>
              <div className="tnum text-[40px] font-normal tracking-[-0.03em] leading-none">
                {money(byKey[s.key]?.forecasted_total_revenue)}
              </div>
            </div>
          ))}
        </div>

        <table className="w-full border-collapse mb-14">
          <tbody>
            <tr>
              <td className="w-[180px] py-3.5 border-t border-rule text-xs text-ink-faint">Daily average</td>
              {SCENARIOS.map(s => (
                <td key={s.key} className="tnum py-3.5 border-t border-rule text-right text-[13px]">
                  {money2(byKey[s.key]?.forecasted_daily_average)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3.5 border-t border-rule text-xs text-ink-faint">vs. historical daily average</td>
              {SCENARIOS.map(s => {
                const delta = vsHistorical(byKey[s.key])
                return (
                  <td key={s.key} className="tnum py-3.5 border-t border-rule text-right text-[13px]">
                    {delta == null ? "—" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}%`}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>

        <Label className="mb-5">Projected daily revenue</Label>
        <div className="mb-14">
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={CHART.axis} tickLine={false} axisLine={{ stroke: "#dedbd4" }} />
              <YAxis
                tick={CHART.axis}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={CHART.tooltip}
                formatter={(v, name) => [money2(v), name]}
                labelFormatter={d => `Day ${d}`}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                iconType="plainline"
                wrapperStyle={{ fontSize: "11px", fontFamily: "Instrument Sans, sans-serif" }}
              />
              {SCENARIOS.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={s.key === "moderate" ? 2 : 1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-16 items-start mb-14">
          <div>
            <Label className="mb-4">Analysis</Label>
            {report.ai_summary ? (
              <p className="font-serif text-[17px] leading-[1.7] text-ink-soft max-w-[60ch]">
                {report.ai_summary}
              </p>
            ) : (
              <p className="font-serif text-[17px] leading-[1.7] text-ink-soft max-w-[60ch]">
                {moderate.insight}
              </p>
            )}
            {moderate.plain_english && (
              <p className="text-[13px] leading-relaxed text-ink-muted max-w-[62ch] mt-5 pt-5 border-t border-rule-soft">
                {moderate.plain_english}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-4">
              <Label>Method</Label>
              <button
                onClick={() => navigate("/methodology#reading-results")}
                className="text-[11px] text-accent hover:text-accent-hover transition-colors"
              >
                What these numbers mean →
              </button>
            </div>
            <div className="flex justify-between items-baseline pb-3.5 border-b border-rule mb-3.5">
              <span className="text-sm">{moderate.model_used}</span>
              {moderate.backtest?.mape != null && (
                <span className="tnum text-[22px] font-normal tracking-[-0.02em] text-accent">
                  {(100 - moderate.backtest.mape).toFixed(1)}%
                </span>
              )}
            </div>
            {moderate.backtest?.mape != null && (
              <p className="text-xs text-ink-faint leading-relaxed mb-6">
                Backtested accuracy — on {moderate.backtest.holdout_days} recent days the model
                never saw, its guesses were off by {moderate.backtest.mape}% on average.
              </p>
            )}

            {moderate.candidate_scores?.length > 0 && (
              <>
                <Label className="mb-3">Candidates</Label>
                {moderate.candidate_scores.map((c, i) => (
                  <div
                    key={c.name}
                    className={`flex justify-between py-2 border-t border-rule-soft text-xs ${i === 0 ? "text-ink" : "text-ink-faint"}`}
                  >
                    <span>{c.label}</span>
                    <span className="tnum">{c.mape ?? "—"}</span>
                  </div>
                ))}
                <p className="text-[11px] text-ink-faint mt-2.5 leading-snug">MAPE, lower is better.</p>
              </>
            )}
          </div>
        </div>

        {/* supporting detail, previously buried behind the conservative/aggressive tabs */}
        <div className="grid grid-cols-2 gap-16 items-start pt-10 border-t border-rule">
          <div>
            <Label className="mb-4">Revenue by region</Label>
            <table className="w-full border-collapse">
              <tbody>
                {Object.entries(conservative?.revenue_by_region || {}).map(([region, revenue]) => (
                  <tr key={region}>
                    <td className="py-2.5 border-t border-rule-soft text-[13px]">{region}</td>
                    <td className="tnum py-2.5 border-t border-rule-soft text-right text-[13px] text-ink-muted">
                      {money(revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Label className="mb-4 mt-10">Revenue by product</Label>
            <table className="w-full border-collapse">
              <tbody>
                {Object.entries(conservative?.revenue_by_product || {}).map(([product, revenue]) => (
                  <tr key={product}>
                    <td className="py-2.5 border-t border-rule-soft text-[13px]">{product}</td>
                    <td className="tnum py-2.5 border-t border-rule-soft text-right text-[13px] text-ink-muted">
                      {money(revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <Label className="mb-4">
              Anomalies — {aggressive?.anomalies_found ?? 0} flagged
            </Label>
            <p className="text-xs text-ink-faint leading-relaxed mb-4 max-w-[52ch]">
              Individual sales that stand apart from the rest on revenue, units, day of week
              and month. These are the events most likely to move a forecast.
            </p>
            <table className="w-full border-collapse">
              <tbody>
                {(aggressive?.anomalies || []).slice(0, 8).map((a, i) => (
                  <tr key={i}>
                    <td className="tnum py-2.5 border-t border-rule-soft text-[13px] text-ink-muted whitespace-nowrap">
                      {a.date}
                    </td>
                    <td className="py-2.5 border-t border-rule-soft text-[13px] pl-4">
                      {a.product} · {a.region}
                    </td>
                    <td className="tnum py-2.5 border-t border-rule-soft text-right text-[13px]">
                      {money(a.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(aggressive?.anomalies?.length || 0) > 8 && (
              <p className="text-[11px] text-ink-faint mt-2.5">
                Showing 8 of {aggressive.anomalies.length}.
              </p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-ink-faint mt-14 pt-5 border-t border-rule tnum">
          {moderate.model_used}
          {moderate.backtest?.mape != null && <> · MAPE {moderate.backtest.mape}% · {moderate.backtest.holdout_days}-day holdout</>}
          {" · "}
          <button onClick={() => navigate("/dashboard")} className="text-accent hover:text-accent-hover">
            Back to analyses
          </button>
        </p>

      </div>
    </div>
  )
}
