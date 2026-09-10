import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import client from "../api/client"
import Nav from "../components/Nav"

const MODELS = [
  { name: "ARIMA", desc: "Reads recent days, removes trend, corrects from its own past errors." },
  { name: "Holt-Winters", desc: "Weighted average tracking trend direction and weekly seasonality." },
  { name: "Growth curve", desc: "Fits compound growth to your history by numerical optimization." },
  { name: "Isolation Forest", desc: "Flags individual sales that stand apart from the rest." },
]

export default function Dashboard() {
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

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <div className="max-w-[1180px] mx-auto px-14 pt-14 pb-20">

        <header className="flex items-end justify-between mb-12">
          <h1 className="text-[38px] font-normal tracking-[-0.025em] leading-[1.1]">Analyses</h1>
          <button
            onClick={() => navigate("/upload")}
            className="bg-ink text-bg text-[13px] font-medium px-5 py-2.5 hover:bg-ink-soft transition-colors"
          >
            New analysis
          </button>
        </header>

        <div className="grid grid-cols-[1fr_320px] gap-16 items-start">

          <div>
            {loading ? (
              <p className="text-ink-muted text-sm">Loading…</p>
            ) : uploads.length === 0 ? (
              <div className="border-t border-rule-strong pt-10">
                <p className="text-ink-muted text-sm mb-5">
                  No analyses yet. Upload a CSV of past sales to generate your first forecast.
                </p>
                <button
                  onClick={() => navigate("/upload")}
                  className="bg-ink text-bg text-[13px] font-medium px-5 py-2.5 hover:bg-ink-soft transition-colors"
                >
                  Upload a file
                </button>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pb-2.5 border-b border-rule-strong"><span className="label">Source file</span></th>
                    <th className="text-right pb-2.5 pl-4 border-b border-rule-strong"><span className="label">Records</span></th>
                    <th className="text-right pb-2.5 pl-4 border-b border-rule-strong"><span className="label">Uploaded</span></th>
                    <th className="text-right pb-2.5 pl-4 border-b border-rule-strong"><span className="label">Status</span></th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(upload => {
                    const ready = upload.report_id && upload.report_status === "complete"
                    return (
                      <tr
                        key={upload.id}
                        onClick={() => ready && navigate(`/results/${upload.report_id}`)}
                        className={ready ? "cursor-pointer group" : ""}
                      >
                        <td className="py-3.5 border-b border-rule text-sm font-medium">
                          <span className={ready ? "group-hover:text-accent transition-colors" : ""}>
                            {upload.filename}
                          </span>
                        </td>
                        <td className="tnum py-3.5 pl-4 border-b border-rule text-right text-[13px] text-ink-muted">
                          {upload.row_count?.toLocaleString()}
                        </td>
                        <td className="tnum py-3.5 pl-4 border-b border-rule text-right text-[13px] text-ink-muted">
                          {new Date(upload.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 pl-4 border-b border-rule text-right text-[13px]">
                          {ready ? (
                            <span className="text-accent">View →</span>
                          ) : upload.report_id ? (
                            <span className="text-ink-faint">Processing…</span>
                          ) : (
                            <span className="text-ink-faint">No report</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <aside>
            <div className="label mb-4">Method</div>
            <p className="font-serif text-sm leading-relaxed text-ink-soft mb-5">
              Every upload is fit with three candidate models. Each is scored against days
              held back from its own training data, and only the most accurate one produces
              your forecast.
            </p>

            <div className="border-t border-rule">
              {MODELS.map(m => (
                <div key={m.name} className="py-2.5 border-b border-rule-soft">
                  <div className="text-[13px] font-medium mb-1">{m.name}</div>
                  <div className="text-xs text-ink-muted leading-snug">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-rule-strong mt-4 pt-3">
              <div className="label mb-2">Reading accuracy</div>
              <p className="text-xs text-ink-muted leading-relaxed">
                A score of <span className="tnum text-ink font-medium">62.8%</span> means that on
                14 recent days the model never saw, its guesses were off by{" "}
                <span className="tnum">37.2%</span> on average.
              </p>
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}
