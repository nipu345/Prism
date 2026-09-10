import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/useAuth"

export default function Nav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout } = useAuth()

  const link = (to, label) => {
    const active = pathname.startsWith(to)
    return (
      <button
        onClick={() => navigate(to)}
        className={`text-[13px] transition-colors ${active ? "text-ink" : "text-ink-faint hover:text-ink-muted"}`}
      >
        {label}
      </button>
    )
  }

  return (
    <nav className="flex items-center justify-between px-14 h-15 border-b border-rule" style={{ height: "60px" }}>
      <div className="flex items-center gap-9">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold tracking-[0.18em]"
        >
          PRISM
        </button>
        <div className="flex gap-6.5" style={{ gap: "26px" }}>
          {link("/dashboard", "Analyses")}
          {link("/upload", "Upload")}
        </div>
      </div>
      <button
        onClick={() => { logout(); navigate("/login") }}
        className="text-xs text-ink-faint hover:text-ink-muted transition-colors"
      >
        Sign out
      </button>
    </nav>
  )
}
