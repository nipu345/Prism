# Prism

2026

Python · JavaScript · React · FastAPI · Supabase · Gemini

An AI-powered revenue forecasting tool I developed for small and mid-sized businesses. Upload your sales history and Prism gives you three forecasts for the next 30 days: a cautious one, an expected one and an optimistic one. Before any model is allowed to forecast, Prism tests it against your own recent sales, so every forecast comes with a measured accuracy score. Prism also flags unusual sales that could move your numbers and writes a plain-English summary of what's driving the outlook. All of it comes from one CSV or Excel upload.

**[Try it live → prism-olive-eta.vercel.app](https://prism-olive-eta.vercel.app)**

> The server runs on a free plan and goes to sleep after 15 minutes without traffic. If nobody has used it in a while, your first click (usually signing up) can take 30–60 seconds. After that it runs at normal speed.

## What you get

- **Three forecasts instead of one.** The cautious forecast is the number to budget around, so a slow month doesn't catch you off guard. The expected forecast is the one to plan around. The optimistic forecast shows what's achievable if your current trend holds.
- **An accuracy score you can trust.** Before forecasting, Prism hides your last two weeks of sales, has each model predict them blind, and checks the guesses against what really happened. The model that does best makes your forecast, and you see its score. If the score is low, Prism tells you so.
- **The best model for your data, picked for you.** Prism tries several forecasting methods (ARIMA, Holt-Winters and a growth-curve fit) and keeps whichever one wins on your data. You don't need to know which to choose.
- **Unusual sales, flagged.** Prism checks every individual sale and points out the ones that don't look like the rest, such as an unusually large deal or an unusually quiet day.
- **A summary in plain English.** Gemini writes a short summary of your outlook, the kind of thing you'd otherwise ask an analyst for. Gemini only sees summary numbers, never your raw sales data.
- **An email when your report is ready.** You don't have to wait on the page while Prism works.

## How to use it

1. **Sign up** at [prism-olive-eta.vercel.app](https://prism-olive-eta.vercel.app). Teammates from the same company can see each other's reports.
2. **Upload your sales.** Use a CSV or Excel file with one row per sale. Prism looks for a date, a revenue amount, and optionally units sold, product and region. Your column names don't have to match exactly: headers like `Order Date` or `Sales Amount` are recognized automatically.
3. **Read your results.** Switch between the Conservative, Moderate and Aggressive tabs. Each tab shows the 30-day forecast, the model that produced it and its accuracy score. The Conservative tab adds a breakdown by region and product. The Aggressive tab lists the unusual sales Prism found.
4. **If a term is unfamiliar,** open the **Methodology** page in the app. It explains how each model works and walks through a results screen line by line.

## No data of your own? Try a sample

[`sample_data/`](sample_data/) has six ready-to-upload files. Each one is shaped like a different kind of business, so each gives a different result:

| File | What it's like |
|---|---|
| `demo_sales.csv` | A steady B2B business. Start here: the Methodology page walks through this file. |
| `saas_steady_growth.csv` | A fast-growing subscription business. This is the most predictable file in the set. |
| `retail_weekly_pattern.csv` | A coffee shop chain that's busiest on weekends. Its column names don't match Prism's, and it still works. |
| `manufacturing_decline.csv` | A supplier losing customers. Prism forecasts the decline honestly. |
| `enterprise_lumpy_deals.csv` | A business with a few huge contracts. Prism shows a low accuracy score here because big, irregular deals are hard to predict. |
| `startup_short_history.csv` | A startup with only six weeks of history. |

Details on each file are in [`sample_data/README.md`](sample_data/README.md).

## Your data stays yours

Every upload and report is tied to your company, and the server checks this on every request. Nobody outside your company can open your reports, even with a direct link to one.

## How it's built

| Piece | Built with |
|---|---|
| Website | React, Vite, Tailwind CSS and Recharts, hosted on Vercel |
| Forecasting server | FastAPI with pandas, statsmodels, SciPy and scikit-learn, hosted on Render |
| Accounts, database and file storage | Supabase |
| Written summaries | Google Gemini (`gemini-2.5-flash`) |
| "Report ready" emails | A small Node and Express service using Nodemailer, hosted on Render |

The forecasting code is in [`backend/agents.py`](backend/agents.py). Run `pytest` in `backend/` to see it tested against real model fits.

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

<details>
<summary><strong>Running Prism yourself</strong></summary>

**Backend**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

**Notifications (optional)**

```bash
cd notifications
npm install
npm start
```

To deploy, use [`render.yaml`](render.yaml) for the backend and notifications, and [`frontend/vercel.json`](frontend/vercel.json) for the frontend. Both deploy automatically on every push to `main`.

The AI summary needs this SQL run once in the Supabase SQL editor. Without it, Prism skips the summary and everything else still works:

```sql
alter table reports add column if not exists ai_summary text;
```

**Environment variables**

| Service | Variable | Required | Notes |
|---|---|---|---|
| backend | `SUPABASE_URL`, `SUPABASE_KEY` | yes | In Supabase under Project Settings → API |
| backend | `CORS_ORIGINS` | no | Comma-separated. Defaults to `http://localhost:5173` |
| backend | `GEMINI_API_KEY` | no | Get a free key at aistudio.google.com/apikey. Without it, Prism skips the summary |
| backend | `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| backend | `NOTIFY_SERVICE_URL`, `NOTIFY_SERVICE_API_KEY` | no | If the email service can't be reached, Prism skips the email |
| backend | `FRONTEND_URL` | no | Used to build the link in notification emails |
| frontend | `VITE_API_URL` | no | Defaults to `http://127.0.0.1:8000` |
| notifications | `SMTP_HOST`/`PORT`/`USER`/`PASS`, `FROM_EMAIL` | no | If these aren't set, emails go to a free Ethereal test inbox |
| notifications | `NOTIFY_API_KEY` | no | Must match the backend's `NOTIFY_SERVICE_API_KEY` |

</details>
