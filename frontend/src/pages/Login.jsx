import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import client from "../api/client"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await client.post("/auth/login", { email, password })
      login(res.data.user, res.data.access_token)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-[380px]">

        <div className="mb-12">
          <div className="text-sm font-semibold tracking-[0.18em] mb-5">PRISM</div>
          <h1 className="text-[32px] font-normal tracking-[-0.025em] leading-[1.15] mb-3">
            Sign in
          </h1>
          <p className="font-serif text-[15px] leading-relaxed text-ink-muted">
            Revenue forecasting with the accuracy shown, not assumed.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="label block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-rule-strong py-2 text-[15px] placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="mb-8">
            <label className="label block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-rule-strong py-2 text-[15px] placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-[13px] text-danger mb-5">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-bg text-[13px] font-medium py-3.5 hover:bg-ink-soft disabled:opacity-40 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-[13px] text-ink-muted mt-8">
          No account?{" "}
          <Link to="/signup" className="text-accent hover:text-accent-hover">Create one</Link>
        </p>

      </div>
    </div>
  )
}
