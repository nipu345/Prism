import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import client from "../api/client"

export default function Signup() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await client.post("/auth/signup", {
        email,
        password,
        company_name: companyName
      })
      navigate("/login")
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-ink tracking-tight">Prism</h1>
          <p className="text-ink-muted mt-2">Sales intelligence for modern teams</p>
        </div>
        <div className="bg-surface rounded-2xl p-8 border border-border">
          <h2 className="text-xl font-semibold text-ink mb-6">Create your account</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-ink-muted mb-1 block">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full bg-surface-hover border border-border-hover rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                placeholder="Acme Inc."
                required
              />
            </div>
            <div>
              <label className="text-sm text-ink-muted mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface-hover border border-border-hover rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="text-sm text-ink-muted mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-hover border border-border-hover rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-bg font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p className="text-ink-muted text-sm text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:text-accent-hover">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}