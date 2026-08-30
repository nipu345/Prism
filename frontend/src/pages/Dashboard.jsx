import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import client from "../api/client"

const MODELS = [
  { name: "ARIMA", desc: "Predicts from a few recent days' actual values, a trend-stripping step, and self-correction from its own past errors." },
  { name: "Holt-Winters", desc: "A weighted moving average that separately tracks trend direction and repeating weekly patterns." },
  { name: "Log-linear growth", desc: "Fits a compound-growth curve to your history using numerical optimization (scipy.optimize.curve_fit)." },
  { name: "Isolation Forest", desc: "Not a forecaster — flags individual sales that look statistically unusual compared to the rest." },
]

function ModelsSidebar() {
  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-10 space-y-6">
        <div className="bg-surface border-2 border-border rounded-none p-5">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">How Prism forecasts</p>
          <div className="space-y-4">
            {MODELS.map(m => (
              <div key={m.name}>
                <p className="text-sm font-mono font-medium text-ink-soft">{m.name}</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-4 pt-4 border-t border-border leading-relaxed">
            Only one gets used per report — whichever backtests most
            accurately against your own data.
          </p>
        </div>

        <div className="bg-surface border-2 border-border rounded-none p-5">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">Sample output, decoded</p>
          <div className="bg-bg border border-border rounded-none p-3 font-mono text-xs text-ink-soft leading-relaxed">
            Model: ARIMA(2, 0, 2)<br />
            Backtested accuracy: 62.8%<br />
            (MAPE 37.21%, 14-day holdout)
          </div>
          <ul className="text-xs text-ink-muted mt-3 space-y-2 leading-relaxed">
            <li><span className="text-ink-soft font-mono">(2, 0, 2)</span> — looks at the last 2 days, no trend-stripping needed, self-corrects on the last 2 errors</li>
            <li><span className="text-ink-soft font-mono">MAPE</span> — average error % on 14 real days the model never saw while guessing</li>
            <li><span className="text-ink-soft font-mono">accuracy</span> — just 100% minus MAPE</li>
          </ul>
        </div>
      </div>
    </aside>
  )
}

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    client.get("/uploads/list")
      .then(res => { if (!ignore) setUploads(res.data) })
      .catch(err => console.error(err))
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Prism</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/upload")}
            className="bg-accent hover:bg-accent-hover text-bg text-sm font-semibold px-4 py-2 rounded-none transition-colors"
          >
            New analysis
          </button>
          <button
            onClick={handleLogout}
            className="text-ink-muted hover:text-ink text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
        <ModelsSidebar />

        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold mb-2">Your analyses</h2>
          <p className="text-ink-muted mb-8">Upload company sales data to generate risk-scenario revenue forecasts</p>

          {loading ? (
            <div className="text-ink-muted">Loading...</div>
          ) : uploads.length === 0 ? (
            <div className="border border-dashed border-border-hover rounded-none p-16 text-center">
              <p className="text-ink-muted text-lg mb-4">No analyses yet</p>
              <button
                onClick={() => navigate("/upload")}
                className="bg-accent hover:bg-accent-hover text-bg font-semibold px-6 py-2.5 rounded-none transition-colors"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {uploads.map(upload => (
                <div
                  key={upload.id}
                  className="bg-surface border-2 border-border rounded-none p-5 flex items-center justify-between hover:border-border-hover transition-colors"
                >
                  <div>
                    <p className="font-medium text-ink">{upload.filename}</p>
                    <p className="text-sm text-ink-muted mt-1">{upload.row_count} rows · {new Date(upload.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  {upload.report_id ? (
                    <button
                      onClick={() => navigate(`/results/${upload.report_id}`)}
                      className="text-accent hover:text-accent-hover text-sm font-medium transition-colors"
                    >
                      View results →
                    </button>
                  ) : (
                    <span className="text-ink-faint text-sm">No report yet</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
