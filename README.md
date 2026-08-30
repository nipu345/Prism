# Prism

Upload your company's sales history and get back three revenue forecasts —
cautious, expected, and optimistic — instead of one number you're just
expected to trust. Each one comes with a real, measured accuracy score,
plus an AI-written summary of what's driving the outlook.

## Try it live

**[prism-olive-eta.vercel.app](https://prism-olive-eta.vercel.app)** — sign
up, upload `sample_data/demo_sales.csv` (or your own sales data), and see
all three forecasts for yourself.

The backend runs on Render's free tier, which spins down after 15 minutes
with no traffic. If it's been idle, the first request (usually sign-up)
can take 30-60 seconds to wake back up — not a bug, just what free hosting
costs. Everything's instant again once it's warm.

## Why Prism

Most forecasting tools hand you a single number and expect you to trust it.
A business owner planning next quarter needs more than that — they need to
know what happens if things go worse than hoped, what a realistic month
looks like, and what's achievable if current trends hold. Prism answers all
three from one upload:

- **A cautious estimate** — what to budget around, so a slow month doesn't catch you off guard
- **An expected estimate** — the number worth actually planning around
- **An optimistic estimate** — what's achievable if things keep trending the way they have been

And instead of just asking you to trust those numbers, every forecast comes
with its own accuracy score — measured by testing the model against your
*own* recent sales history before it's ever allowed to predict the future.
If that accuracy is low, you'll see it, and know to treat the range as a
wider guess rather than a sure thing. That's the difference between a
forecast you can actually make decisions with and one you're just hoping is
right.

## How it works, one idea at a time

Each of these is a separate, simple idea — together they're what produces a
results screen. The precise technical version of all of this is further
down, in [The technical pipeline](#the-technical-pipeline).

**The three scenarios.** Revenue forecasting is never exact, so instead of
one guess, Prism produces a range: a lower number, a middle number, and a
higher number, based on how much the model's own confidence varies. The
lower end becomes your *conservative* forecast, the middle becomes
*moderate*, and the higher end becomes *aggressive* — three ways to plan
for the same underlying prediction.

**Model selection.** There's more than one reasonable way to forecast a
trend, and no single method wins on every dataset. So instead of
committing to one, Prism tries a few different forecasting approaches on
your data and keeps whichever one actually performs best — a step you'd
otherwise have to do by hand.

**Backtesting.** "Performs best" has to be provable, not assumed. Before
trusting any model, Prism hides your two most recent weeks of real sales
data, has each candidate model predict those days blind, then compares the
guesses to what actually happened. It's a practice exam with a known
answer key — only the model that scores well on it gets used for your real
forecast.

**Anomaly detection.** Separately from forecasting, Prism scans every
individual sale — not just daily totals — for ones that look statistically
unusual compared to the rest of your data: an unusually large deal, an
unusually quiet day. These show up as flagged risk factors alongside the
optimistic forecast, since they're the kind of events that could swing an
outlook either way.

**AI executive summary.** Once the numbers exist, Prism sends the *summary
stats* (not your raw data) to Google's Gemini model and asks for a short,
plain-English paragraph explaining the outlook — the kind of write-up
you'd otherwise ask an analyst for. This step is optional and never
required for the forecast itself to work.

**Email notification.** When your report finishes, a small separate
service emails you a link to it, so you don't have to sit and wait on the
page.

## Architecture

| Piece | What it does |
|---|---|
| **Frontend** — React + Vite + Tailwind + Recharts | Auth, CSV/Excel upload, and the results dashboard with per-scenario charts |
| **Backend** — FastAPI (`backend/`) | Verifies who you are, stores files, and runs the forecasting pipeline |
| **Forecasting engine** — `backend/agents.py` | Model selection + backtesting + the three scenario forecasts (see below) |
| **Gemini narrative layer** — `backend/llm.py` | Optional; turns the three forecasts into a plain-English summary |
| **Notifications** — Node + Express + Nodemailer (`notifications/`) | A separate service the backend calls (best-effort, never blocks analysis) after a report finishes |
| **Supabase** | Postgres database, auth, and file storage — the one piece Prism doesn't run itself |

The frontend only ever talks to the FastAPI backend; the backend is the
only thing that talks to Supabase, Gemini, and the notification service.
None of the optional pieces (Gemini, notifications) can break the core
forecast — both fail silently and let the analysis complete regardless.

**Hosting:** frontend on Vercel, backend (and notifications, if deployed)
on Render — both free-tier, both auto-deploy from `main` on every push. See
`render.yaml` and `frontend/vercel.json`.

## The technical pipeline

Uploading a file with `date`, `revenue`, `units_sold`, `product`, `region`
columns (auto-detected from close matches) runs this pipeline per report:

1. **Model selection.** Three candidate forecasters are fit on a holdout
   split of your daily revenue series:
   - ARIMA, grid-searched over `(p,d,q) ∈ {0,1,2}³` and picked by lowest AIC
   - Holt-Winters / Holt linear trend exponential smoothing (`statsmodels`)
   - A log-linear growth curve fit via `scipy.optimize.curve_fit`
   (`agents.select_and_forecast`, `agents.backtest_candidates`)
2. **Backtesting.** Each candidate is scored against the actual held-out
   days (MAPE / RMSE / MAE); the lowest-MAPE model wins and is refit on the
   full series for the real 30-day forecast. The winning model and its
   backtested accuracy are shown on every scenario tab — this is real,
   computed accuracy, not a hardcoded number.
3. **Scenario forecasts.** The winning model's confidence band becomes the
   three agents: **conservative** = lower bound, **moderate** = point
   forecast, **aggressive** = upper bound. Each agent also carries its own
   supporting analysis — conservative breaks down revenue by region/product,
   aggressive runs an Isolation Forest over revenue/units/day-of-week/month
   to flag anomalous sales events that could swing the optimistic case.
4. **AI summary.** If `GEMINI_API_KEY` is set, the three structured forecasts
   are sent to Gemini for a short plain-English executive summary. If it's
   not set (or the call fails/times out), the report still completes —
   this step never blocks the ML pipeline.

Run `pytest` in `backend/` to see this exercised against real
statsmodels/scipy/scikit-learn fits on deterministic synthetic data
(risk-ordering, backtest sanity checks, graceful degradation on thin data).

### Meet the models

Four different models are in play — three compete against each other during
backtesting to forecast revenue, and a fourth runs separately to catch
anomalies:

**ARIMA (AutoRegressive Integrated Moving Average)** — a decades-old,
widely used statistical forecasting method. It predicts each day using
(1) the actual values from a few recent days, (2) a trend-stripping step
so a steady upward or downward slope doesn't confuse the model, and (3) a
self-correction step based on how wrong its own recent predictions were.
Written as `ARIMA(p, d, q)` — `p` = how many past days it looks at, `d` =
how many times the trend gets stripped out, `q` = how many past errors it
corrects for. Tends to win when there's real day-to-day momentum in the
data — today's revenue is genuinely predictable from yesterday's.

**Holt-Winters / Holt Linear Trend (exponential smoothing)** — a "smart
moving average." A plain average weighs every past day equally; this
weighs recent days more heavily, and separately tracks whether revenue is
trending up or down and whether there's a repeating weekly pattern (a dip
every weekend, for example). Tends to win on data with a clear, steady
trend and consistent seasonality.

**Log-linear growth curve (`scipy.optimize.curve_fit`)** — assumes revenue
grows roughly the way compound interest does, and uses numerical
optimization to find the exact growth rate that best matches your history.
Tends to win on data with strong, consistent compounding growth and
comparatively little day-to-day noise.

**Isolation Forest (anomaly detection)** — not a forecaster at all. It's a
separate machine learning model that looks at every individual sale (not
daily totals) and isolates the ones that stand apart from the rest based
on revenue, units sold, day of week, and month. Those are the entries
flagged as anomalies on the aggressive tab — real outliers found
algorithmically, not picked out by hand.

Only one of the first three ever gets used for your actual forecast —
whichever wins the backtest described above — so the model name you see
on a results screen depends entirely on your data, not on which one
sounds the most impressive.

### Decoding a results screen

Every scenario tab shows a line like `Model: ARIMA(2, 0, 2) · Backtested
accuracy: 62.8% (MAPE 37.21%, 14-day holdout)`. Term by term:

| You see | It means |
|---|---|
| `ARIMA(p, d, q)` | ARIMA won the backtest. `p` = how many past days it directly looks at, `d` = how many times the trend was stripped out before modeling, `q` = how much it self-corrects based on its own recent prediction errors. `(2, 0, 2)` = looks at the last 2 days, uses the raw numbers as-is, self-corrects using the last 2 errors. |
| `AIC` (used to pick the order) | A score for comparing candidate ARIMA orders that rewards a better fit but penalizes needless complexity, so it won't pick an overly elaborate model just because it fits training data slightly better. |
| `holdout` | The most recent N days of your real data, deliberately hidden from the model during the accuracy test — like exam questions the model never studied from. |
| `MAPE` | Mean Absolute Percentage Error — averaged over every holdout day, `\|predicted − actual\| ÷ actual`. 37% MAPE means the model's guess was off by ~37% of the true value, on average, on days it hadn't seen. |
| `Backtested accuracy` | Just `100% − MAPE`, shown as a friendlier "how right" framing of the same measured number. |
| `Confidence band / scenario range` | The spread between the cautious and optimistic forecasts — how uncertain the winning model is about the future, wider when your data is noisier. |
| `Anomalies` (Isolation Forest) | Individual sales that look statistically unusual across revenue/units/day-of-week/month compared to the rest of your data — found algorithmically, not flagged by hand. |

## Running it locally

The live version above is the fastest way to try it, but here's how to run
it yourself if you want to read the code, make changes, or just poke at it
locally. It's three separate pieces (backend, frontend, and an optional
notifications service), so it's a few more steps than a typical single-app
clone. Backend first:

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your SUPABASE_URL and SUPABASE_KEY
uvicorn main:app --reload
```

If you want the AI summary feature to actually save, run this once in the
Supabase SQL editor. Not required — it just gets skipped without it:

```sql
alter table reports add column if not exists ai_summary text;
```

Then the frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

And notifications, if you care about the "email me when it's ready" step —
skip this one and everything else still works fine:

```bash
cd notifications
npm install
cp .env.example .env   # no real SMTP needed, it fakes an inbox for you
npm start
```

To try it out, sign up, then upload `sample_data/demo_sales.csv` (fake
B2B sales data, ~180 days, regenerate it with
`python scripts/generate_demo_data.py` if you want a different draw). You
should get all three forecasts, a backtested accuracy score, and if you set
it up, an AI summary and a notification email.

## Environment variables

| Service | Variable | Required | Notes |
|---|---|---|---|
| backend | `SUPABASE_URL`, `SUPABASE_KEY` | yes | Project Settings → API |
| backend | `CORS_ORIGINS` | no | comma-separated, defaults to `http://localhost:5173` |
| backend | `GEMINI_API_KEY` | no | free key at aistudio.google.com/apikey, summary is skipped without it |
| backend | `GEMINI_MODEL` | no | defaults to `gemini-2.5-flash` |
| backend | `NOTIFY_SERVICE_URL`, `NOTIFY_SERVICE_API_KEY` | no | notification is skipped if unreachable |
| backend | `FRONTEND_URL` | no | used to build the link inside notification emails |
| frontend | `VITE_API_URL` | no | defaults to `http://127.0.0.1:8000` |
| notifications | `SMTP_HOST`/`PORT`/`USER`/`PASS`, `FROM_EMAIL` | no | unset means it uses a free Ethereal test inbox |
| notifications | `NOTIFY_API_KEY` | no | shared secret with the backend's `NOTIFY_SERVICE_API_KEY` |

## Security notes

- Every upload and report is scoped to the caller's company (looked up
  server-side from their Supabase login, not something the client can
  fake), not just checked against who uploaded it. Teammates at the same
  company can see each other's analyses, but a report ID from a different
  company gets a 403. This wasn't always true — I found and fixed a real
  bug here where any logged-in user could view any other company's report
  just by guessing the ID.
- `backend/venv` is gitignored now. If it was ever committed in an earlier
  snapshot and you're planning to make this repo public, worth scrubbing
  it from history first (`git filter-repo`) and rotating any keys that
  might have been sitting near it.
