import { useState } from "react"
import { useNavigate } from "react-router-dom"
import client from "../api/client"
import Nav from "../components/Nav"

const COLUMNS = [
  { name: "date", desc: "Any parseable date format" },
  { name: "revenue", desc: "Amount per sale" },
  { name: "units_sold", desc: "Quantity per sale" },
  { name: "product", desc: "Product or SKU name" },
  { name: "region", desc: "Territory or location" },
]

export default function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await client.post("/uploads/upload", formData)
      const analysisRes = await client.post(`/analysis/analyze/${uploadRes.data.upload_id}`, {})
      navigate(`/results/${analysisRes.data.report_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <div className="max-w-[840px] mx-auto px-14 pt-14 pb-20">

        <header className="mb-12">
          <h1 className="text-[38px] font-normal tracking-[-0.025em] leading-[1.1] mb-3">New analysis</h1>
          <p className="font-serif text-[17px] leading-[1.7] text-ink-soft max-w-[58ch]">
            Upload past sales and Prism will fit three forecasting models to it, score each
            against days held back from training, and project the next 30 days in three
            scenarios.
          </p>
        </header>

        <div className="label mb-4">Expected columns</div>
        <table className="w-full border-collapse mb-12">
          <tbody>
            {COLUMNS.map(col => (
              <tr key={col.name}>
                <td className="w-[160px] py-2.5 border-t border-rule-soft text-[13px] font-medium">{col.name}</td>
                <td className="py-2.5 border-t border-rule-soft text-[13px] text-ink-muted">{col.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-ink-faint -mt-10 mb-12">
          Column names are matched automatically if yours differ.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
          className={`border border-dashed py-20 text-center cursor-pointer transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-rule hover:border-ink-faint"
          }`}
        >
          <input
            id="fileInput"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => setFile(e.target.files[0])}
          />
          {file ? (
            <>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="tnum text-xs text-ink-faint mt-1.5">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Drop a CSV or Excel file here</p>
              <p className="text-xs text-ink-faint mt-1.5">or click to browse</p>
            </>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-danger mt-5 pt-4 border-t border-rule">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full mt-8 bg-ink text-bg text-[13px] font-medium py-3.5 hover:bg-ink-soft disabled:opacity-30 transition-colors"
        >
          {loading ? "Running analysis…" : "Run analysis"}
        </button>

        {loading && (
          <p className="text-xs text-ink-faint mt-4 text-center leading-relaxed max-w-[52ch] mx-auto">
            This can take a couple of minutes. Three models are being fit and scored against
            held-out days before either produces a forecast.
          </p>
        )}

      </div>
    </div>
  )
}
