import { useState } from "react"
import { useNavigate } from "react-router-dom"
import client from "../api/client"

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

      const uploadId = uploadRes.data.upload_id

      const analysisRes = await client.post(`/analysis/analyze/${uploadId}`, {})

      navigate(`/results/${analysisRes.data.report_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/dashboard")}>Prism</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold mb-2">New analysis</h2>
        <p className="text-ink-muted mb-8">
          Upload your company sales data to generate cautious, expected, and optimistic revenue forecasts
        </p>

        <div className="bg-surface rounded-xl p-6 border border-border mb-6">
          <p className="text-sm font-medium text-ink-soft mb-3">Expected columns</p>
          <div className="flex flex-wrap gap-2">
            {["date", "revenue", "units_sold", "product", "region"].map(col => (
              <span key={col} className="bg-surface-hover text-ink-soft text-xs font-mono px-3 py-1 rounded-full">
                {col}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-3">Column names will be auto-detected if they differ</p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-border-hover hover:border-accent/50"
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
            <div>
              <p className="text-ink font-medium">{file.name}</p>
              <p className="text-ink-muted text-sm mt-1 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-ink-soft font-medium">Drop your CSV or Excel file here</p>
              <p className="text-ink-faint text-sm mt-1">or click to browse</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mt-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full mt-6 bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Running analysis..." : "Run analysis"}
        </button>

        {loading && (
          <p className="text-xs text-ink-faint mt-3 text-center">
            This can take a couple of minutes — we're backtesting several
            forecasting models against your data and picking whichever one
            is actually most accurate, not just running one fixed formula.
          </p>
        )}
      </div>
    </div>
  )
}