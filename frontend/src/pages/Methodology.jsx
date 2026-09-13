import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import Nav from "../components/Nav"

// The worked example in section 04 is real output from
// sample_data/demo_sales.csv. If backend/agents.py changes how forecasts are
// built, re-run that file and update the figures here to match.

const TOC = [
  { id: "what-its-for", n: "01", title: "What Prism is for" },
  { id: "how-its-built", n: "02", title: "How a forecast is built" },
  {
    id: "models", n: "03", title: "The models",
    children: [
      { id: "arima", title: "ARIMA" },
      { id: "holt-winters", title: "Holt-Winters" },
      { id: "growth-curve", title: "Growth curve" },
      { id: "isolation-forest", title: "Isolation Forest" },
    ],
  },
  { id: "reading-results", n: "04", title: "Reading a results screen" },
  { id: "glossary", n: "05", title: "Glossary" },
]

function Section({ id, n, title, children }) {
  return (
    <section id={id} className="scroll-mt-10 mb-24">
      <div className="label mb-3">{n}</div>
      <h2 className="text-[30px] font-normal tracking-[-0.02em] leading-tight mb-8 pb-5 border-b border-rule-strong">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Sub({ id, children }) {
  return (
    <h3 id={id} className="scroll-mt-10 text-[20px] font-medium tracking-[-0.01em] mt-14 mb-4">
      {children}
    </h3>
  )
}

function Kicker({ children }) {
  return <div className="label mt-8 mb-3">{children}</div>
}

function P({ children }) {
  return <p className="font-serif text-[17px] leading-[1.7] text-ink-soft mb-5 max-w-[66ch]">{children}</p>
}

function Small({ children }) {
  return <p className="text-[13px] leading-relaxed text-ink-muted mb-5 max-w-[72ch]">{children}</p>
}

function Formula({ caption, children }) {
  return (
    <figure className="my-7 border-l-2 border-ink pl-5 py-1">
      <div className="font-serif text-[16px] leading-[2] text-ink">{children}</div>
      {caption && <figcaption className="text-xs text-ink-faint mt-2 leading-relaxed max-w-[70ch]">{caption}</figcaption>}
    </figure>
  )
}

function Rows({ head, rows }) {
  return (
    <table className="w-full border-collapse my-6">
      {head && (
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} className="text-left pb-2.5 pr-6 border-b border-rule-strong">
                <span className="label">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map(([term, desc], i) => (
          <tr key={i}>
            <td className="align-top w-[200px] py-3 pr-6 border-t border-rule text-[13px] font-medium">{term}</td>
            <td className="align-top py-3 border-t border-rule text-[14px] leading-relaxed text-ink-soft">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Steps({ steps }) {
  return (
    <ol className="my-8">
      {steps.map(([title, body], i) => (
        <li key={title} className="grid grid-cols-[48px_1fr] gap-4 py-5 border-t border-rule">
          <span className="tnum text-[22px] tracking-[-0.02em] text-ink-faint leading-none pt-0.5">{i + 1}</span>
          <div>
            <div className="text-[15px] font-medium mb-1.5">{title}</div>
            <div className="text-[14px] leading-relaxed text-ink-soft max-w-[64ch]">{body}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

// mirrors how a figure looks on the results screen, with its meaning beside it
function Readout({ label, value, sub, children }) {
  return (
    <div className="grid grid-cols-[210px_1fr] gap-10 py-6 border-t border-rule">
      <div>
        <div className="label mb-2">{label}</div>
        {value != null && <div className="tnum text-[22px] tracking-[-0.02em] leading-tight">{value}</div>}
        {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
      </div>
      <div className="text-[14px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  )
}

function Group({ children }) {
  return (
    <div className="label mt-14 mb-1" style={{ color: "var(--color-ink)" }}>
      {children}
    </div>
  )
}

export default function Methodology() {
  const { hash } = useLocation()

  // arriving from a link like /methodology#reading-results
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" })
  }, [hash])

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <div className="max-w-[1180px] mx-auto px-14 pt-14 pb-24">

        <header className="mb-16">
          <div className="label mb-3.5">Methodology</div>
          <h1 className="text-[38px] font-normal tracking-[-0.025em] leading-[1.1] mb-5">
            How Prism works, and how to read it
          </h1>
          <p className="font-serif text-[18px] leading-[1.7] text-ink-soft max-w-[62ch]">
            What the tool is for, how each model reaches its numbers, and what every figure on a
            results screen means. Written to be read front to back, or dipped into when a number
            doesn’t make sense.
          </p>
        </header>

        <div className="grid grid-cols-[200px_1fr] gap-16">

          <aside className="self-start sticky top-10">
            <div className="label mb-4">Contents</div>
            <ol>
              {TOC.map(s => (
                <li key={s.id} className="mb-3">
                  <a href={`#${s.id}`} className="flex gap-3 text-[13px] text-ink-muted hover:text-ink transition-colors">
                    <span className="tnum text-ink-faint">{s.n}</span>
                    {s.title}
                  </a>
                  {s.children && (
                    <ol className="mt-2 ml-7 space-y-1.5">
                      {s.children.map(c => (
                        <li key={c.id}>
                          <a href={`#${c.id}`} className="text-[12px] text-ink-faint hover:text-ink-muted transition-colors">
                            {c.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </aside>

          <article className="min-w-0">

            {/* ------------------------------------------------------------ 01 */}
            <Section id="what-its-for" n="01" title="What Prism is for">
              <P>
                Prism turns a spreadsheet of past sales into a 30-day revenue forecast. Instead of one
                number, it gives a range — a cautious figure, an expected figure and an optimistic one —
                and tells you how accurate the model actually was when it was tested on your own recent
                history.
              </P>

              <Sub>Decisions it’s built for</Sub>
              <Rows rows={[
                ["Budget and cash planning", "Plan spending against the Conservative total. It’s a deliberate floor, so a budget built on it survives a slow month."],
                ["Targets and quotas", "Moderate is the model’s best single estimate — the number to set a target around."],
                ["Hiring, inventory, spend", "Use the width of the range. A narrow range supports committing early; a wide one says keep the decision reversible."],
                ["How far to trust a forecast", "The accuracy score is measured on days the model never saw. A low score isn’t a malfunction — it’s the tool telling you this data is hard to predict."],
                ["Unusual activity", "The anomaly list surfaces individual sales that are out of pattern: a large one-off deal, an unusually small order, a sale on an odd day."],
                ["Where revenue comes from", "Region and product totals show the mix behind the numbers."],
              ]} />

              <Sub>What it doesn’t do</Sub>
              <Rows rows={[
                ["Know about the outside world", "Prism only sees your file. Planned promotions, price changes, a customer you’re about to lose or the wider economy aren’t in the data, so they aren’t in the forecast."],
                ["Plan beyond 30 days", "Every forecast covers the next 30 days, one day at a time."],
                ["Work from a few days of history", "It needs at least 14 days of daily data. The model that learns weekly patterns needs three weeks of training data, and a few months is better."],
                ["Pin down lumpy revenue", "When a handful of large deals drive revenue, daily totals swing hard and no model forecasts them tightly. Prism shows that as a low accuracy score and a wide range rather than hiding it."],
              ]} />

              <Sub>What your file needs</Sub>
              <Small>
                One row per sale is ideal. Prism adds up revenue for each calendar day, and days with no
                rows count as $0. CSV and Excel both work. Headers don’t have to match exactly — each column
                is recognized by a keyword in its header:
              </Small>
              <Rows
                head={["Column", "Recognized from a header containing"]}
                rows={[
                  ["date", "“date” or “time”"],
                  ["revenue", "“revenue”, “sales” or “amount”"],
                  ["units_sold", "“unit”, “quantity” or “qty”"],
                  ["product", "“product”, “item” or “sku”"],
                  ["region", "“region”, “location” or “area”"],
                ]}
              />
              <Small>
                Each header is checked against these rules from top to bottom and takes the first one it
                fits. A header like “Sales Region” contains “sales”, so it would be read as revenue — rename
                it “Region” if that happens.
              </Small>
            </Section>

            {/* ------------------------------------------------------------ 02 */}
            <Section id="how-its-built" n="02" title="How a forecast is built">
              <P>
                Every upload runs the same six steps. The idea at the center is simple: don’t trust a model
                because it sounds sophisticated — make it prove itself on your recent history first.
              </P>

              <Steps steps={[
                ["Build a daily series", "Revenue is summed by calendar day, and gaps are filled with $0, so every model sees a complete, evenly spaced timeline."],
                ["Hold back the most recent days", "The latest days are set aside and hidden from the models: 14 days for any history of 56 days or longer, otherwise a quarter of the history, and never fewer than 3."],
                ["Fit three candidate models", "ARIMA, Holt-Winters and a growth curve are each trained on everything before the held-back days."],
                ["Score them blind", "Each model forecasts the held-back days, and its misses are measured with MAPE — the average percentage error. The lowest MAPE wins. If MAPE can’t be computed because every held-back day was $0, RMSE decides instead."],
                ["Refit the winner", "The winning model is retrained on the full history, held-back days included, and forecasts the next 30 days."],
                ["Draw the range", "An 80% range is built around each day’s forecast. Its lower edge becomes Conservative, the forecast itself becomes Moderate, and its upper edge becomes Aggressive. Nothing goes below $0."],
              ]} />

              <Small>
                For ARIMA, the range is the model’s own statistical forecast interval. The other two models
                don’t produce one, so Prism builds it from the size of the misses they made while being
                scored:
              </Small>
              <Formula caption="σ is the standard deviation of the model’s misses on the held-back days, h is how many days ahead, and 1.28 is the multiplier for an 80% range. The cap at twice the holdout length stops the range from growing without limit across 30 days.">
                range = forecast ± 1.28 · σ · √min(h, 2 × holdout)
              </Formula>
              <Small>
                One honest caveat: 80% is what this formula aims for, not what it achieves. Tested against
                30 days of revenue the models had never seen, across the sample files, Holt-Winters and
                growth-curve ranges held the actual figure more than 9 days in 10. That’s because σ already
                reflects misses up to 14 days ahead, and the √h factor then widens it again. The ranges err
                wide, which is part of why Conservative often reaches $0. ARIMA’s own interval landed closer
                to target on average.
              </Small>

              <Sub>Running alongside the forecast</Sub>
              <Rows rows={[
                ["Anomaly scan", "Isolation Forest looks at individual sales rather than daily totals, and flags the most unusual 3%. It has no effect on the forecast."],
                ["Written summary", "If configured, Google’s Gemini turns the finished figures into a short summary and a plain-English translation. It receives summary figures, not your raw data, and it explains the forecast — it never calculates any of it."],
              ]} />
            </Section>

            {/* ------------------------------------------------------------ 03 */}
            <Section id="models" n="03" title="The models">
              <P>
                Three models compete to make the forecast, and a fourth works separately on anomalies. No
                model is best everywhere: each makes a different assumption about how revenue behaves, and
                the scoring step picks whichever assumption fits your data.
              </P>

              {/* ARIMA */}
              <Sub id="arima">ARIMA</Sub>
              <Kicker>In plain terms</Kicker>
              <P>
                ARIMA predicts each day from the few days before it, and corrects itself using how wrong
                its last few predictions were. If yesterday’s forecast came in low, today’s gets nudged up.
              </P>
              <Kicker>How it works</Kicker>
              <P>
                The name spells out its three parts. <em>AutoRegressive</em>: each day is a weighted
                combination of the previous <em>p</em> days. <em>Integrated</em>: before modeling, the series
                can be differenced <em>d</em> times — replaced by its day-to-day changes — so that a steady
                drift doesn’t dominate. <em>Moving Average</em>: the forecast also weighs the model’s last
                <em> q</em> errors. A model is written ARIMA(<em>p</em>, <em>d</em>, <em>q</em>).
              </P>
              <Formula caption="y′ is daily revenue after differencing d times. The φ weights apply to past values, the θ weights to past errors ε, and c is a constant.">
                y′<sub>t</sub> = c + φ<sub>1</sub>y′<sub>t−1</sub> + … + φ<sub>p</sub>y′<sub>t−p</sub>
                {" "}+ θ<sub>1</sub>ε<sub>t−1</sub> + … + θ<sub>q</sub>ε<sub>t−q</sub> + ε<sub>t</sub>
              </Formula>
              <Kicker>In Prism</Kicker>
              <Small>
                Prism tries every combination of <em>p</em> from 0 to 2, <em>d</em> from 0 to 1 and
                {" "}<em>q</em> from 0 to 2 except <em>p</em> = <em>q</em> = 0 — sixteen versions — and keeps the
                one with the lowest AIC. AIC rewards a good fit but charges for every extra parameter, so a
                more complicated version only wins if it’s genuinely better:
              </Small>
              <Formula caption="k is the number of fitted parameters and L̂ is how probable the observed data is under the model. Lower AIC is better.">
                AIC = 2k − 2 ln L̂
              </Formula>
              <Small>
                That best ARIMA then competes with the other two models on MAPE. The order search runs again
                when the winner is refit on the full history, so the order shown under Method can
                occasionally differ from the one listed under Candidates.
              </Small>
              <Small><strong className="font-medium text-ink">Tends to win</strong> when each day’s revenue is genuinely predictable from the days just before it.</Small>

              {/* Holt-Winters */}
              <Sub id="holt-winters">Holt-Winters</Sub>
              <Kicker>In plain terms</Kicker>
              <P>
                Holt-Winters keeps three running estimates — the current level of revenue, which way it’s
                trending, and how each weekday usually differs from average — and updates all three as each
                new day arrives, trusting recent days more than old ones.
              </P>
              <Kicker>How it works</Kicker>
              <P>
                Each estimate is an exponentially weighted average. The smoothing weights α, β and γ set how
                quickly the level, trend and weekly pattern respond to new data. A damping factor φ, between
                0 and 1, makes the trend flatten out across the forecast instead of extending in a straight
                line forever.
              </P>
              <Formula caption="ℓ is the level, b the trend, s the weekly pattern and y actual revenue. The forecast for a day h ahead uses the most recent estimate for that day’s weekday.">
                <div className="grid grid-cols-[84px_1fr] gap-x-4">
                  <span className="font-sans text-xs text-ink-faint self-center">Level</span>
                  <span>ℓ<sub>t</sub> = α(y<sub>t</sub> − s<sub>t−7</sub>) + (1 − α)(ℓ<sub>t−1</sub> + φb<sub>t−1</sub>)</span>
                  <span className="font-sans text-xs text-ink-faint self-center">Trend</span>
                  <span>b<sub>t</sub> = β(ℓ<sub>t</sub> − ℓ<sub>t−1</sub>) + (1 − β)φb<sub>t−1</sub></span>
                  <span className="font-sans text-xs text-ink-faint self-center">Season</span>
                  <span>s<sub>t</sub> = γ(y<sub>t</sub> − ℓ<sub>t−1</sub> − φb<sub>t−1</sub>) + (1 − γ)s<sub>t−7</sub></span>
                  <span className="font-sans text-xs text-ink-faint self-center">Forecast</span>
                  <span>ŷ<sub>t+h</sub> = ℓ<sub>t</sub> + (φ + φ² + … + φ<sup>h</sup>)b<sub>t</sub> + s<sub>weekday(t+h)</sub></span>
                </div>
              </Formula>
              <Kicker>In Prism</Kicker>
              <Small>
                An additive, damped trend, plus an additive 7-day season when there are at least 21 days of
                training data. With less, the season is dropped and it runs as Holt’s linear trend. The
                weights are fitted automatically to minimize error on the training data.
              </Small>
              <Small><strong className="font-medium text-ink">Tends to win</strong> on data with a steady trend and a consistent weekly rhythm.</Small>

              {/* Growth curve */}
              <Sub id="growth-curve">Growth curve</Sub>
              <Kicker>In plain terms</Kicker>
              <P>
                The growth curve assumes revenue compounds like interest — growing by a steady percentage
                rather than a steady dollar amount — and finds the single smooth curve that best matches your
                history.
              </P>
              <Kicker>How it works</Kicker>
              <P>
                It fits the curve below by nonlinear least squares: the three parameters are adjusted until
                the total squared distance between the curve and your actual daily revenue is as small as it
                can be. <em>b</em> is the daily growth rate — <em>b</em> = 0.004 means about 0.4% a day, or
                roughly 13% over 30 days.
              </P>
              <Formula caption="t is the day number, a sets the starting scale, b is the daily growth rate and c is a baseline offset.">
                revenue(t) = a · e<sup>b·t</sup> + c
              </Formula>
              <Kicker>In Prism</Kicker>
              <Small>
                Fitted with scipy’s curve_fit, with <em>b</em> limited to between −1 and 1 and <em>a</em> kept
                non-negative so the search stays stable. On the results screen it’s listed as “Log-linear
                Growth (curve_fit)”. Its range is built from its misses while being scored.
              </Small>
              <Small><strong className="font-medium text-ink">Tends to win</strong> on sustained, compounding growth with little day-to-day noise. On bumpy or flat data it scores poorly, because one smooth curve can’t follow the swings — in the worked example below, it came last.</Small>

              {/* Isolation Forest */}
              <Sub id="isolation-forest">Isolation Forest</Sub>
              <Kicker>In plain terms</Kicker>
              <P>
                Isolation Forest finds sales that don’t look like the others by trying to separate each one
                from the rest with random cuts. Ordinary sales sit in crowded territory and take many cuts to
                isolate; unusual ones get cut loose quickly.
              </P>
              <Kicker>How it works</Kicker>
              <P>
                It builds 100 random trees. Each tree takes a sample of up to 256 sales and keeps splitting it
                on a randomly chosen feature, at a random value, until every sale stands alone. The number of
                splits needed, averaged across the trees, becomes an anomaly score:
              </P>
              <Formula caption="h(x) is the number of splits it took to isolate sale x in one tree, E[h(x)] averages that across all trees, and c(n) adjusts for sample size. Scores close to 1 mean unusual.">
                s(x) = 2<sup>−E[h(x)] / c(n)</sup>
              </Formula>
              <Kicker>In Prism</Kicker>
              <Rows rows={[
                ["Looks at", "Each individual sale: revenue, units sold, day of the week and month."],
                ["Flags", "The 3% of sales with the highest scores."],
                ["Changes the forecast?", "No. It’s a separate lens on the same file."],
              ]} />
              <Small>
                The 3% is a quota, not a test. Any file will have about 3% of its rows flagged, so the count on
                its own doesn’t mean anything is wrong — look at which sales are on the list.
              </Small>
            </Section>

            {/* ------------------------------------------------------------ 04 */}
            <Section id="reading-results" n="04" title="Reading a results screen">
              <P>
                This walks the results screen from top to bottom. Every figure is real output from
                sample_data/demo_sales.csv — 4,145 sales across 180 days — so you can upload that file and
                follow along.
              </P>

              <Group>Header</Group>
              <Readout label="Records" value="4,145">
                The number of rows in your file: individual sales, not days. This file covers 180 days.
              </Readout>

              <Group>The forecast</Group>
              <Readout label="Conservative" value="$46,263">
                The sum of the lower edge of the 80% range for each of the next 30 days. Treat it as a floor.
                It assumes every single day comes in low, which almost never happens all at once, so the
                realistic range for the full month is narrower than the gap between Conservative and
                Aggressive. It sits far below the others here because daily revenue in this file is noisy:
                on 8 of the 30 days, the lower edge reaches $0.
              </Readout>
              <Readout label="Moderate" value="$164,502">
                The sum of the winning model’s best estimate for each day. This is the number to plan
                around.
              </Readout>
              <Readout label="Aggressive" value="$288,173">
                The sum of the upper edge of the range for each day. Like Conservative, it assumes every day
                lands at the same edge — read it as a ceiling on upside, not a target.
              </Readout>
              <Readout label="Daily average" value="$5,483.42" sub="Moderate">
                The 30-day total divided by 30, shown for each scenario.
              </Readout>
              <Readout label="vs. historical daily average" value="+0.5%" sub="Moderate">
                How the forecast’s daily average compares with average daily revenue across your whole
                uploaded history — $5,458.61 here. +0.5% means the model expects the next month to look much
                like the last six, on average. Because it compares against all of your history rather than
                just the latest month, a business that has grown steadily will usually show a positive
                figure.
              </Readout>
              <Readout label="Projected daily revenue">
                Each line is one scenario, day by day over the next 30 days, and the distance between the
                lines is the model’s uncertainty. For some models that gap widens the further out you look.
                For an ARIMA with <em>d</em> = 0, like this one, it settles into a roughly constant width:
                here, about $8,250 between Conservative and Aggressive on both day 1 and day 30.
              </Readout>
              <Readout label="Analysis">
                A short written summary produced by Google’s Gemini from the finished figures. If it isn’t
                available, you’ll see the model’s own generated sentence instead. When there’s a note beneath
                it, that’s a plain-English translation of the technical sentence.
              </Readout>

              <Group>Method</Group>
              <Readout label="Model" value="ARIMA(2, 0, 2)">
                The model that won the scoring step. Read the numbers as (<em>p</em>, <em>d</em>, <em>q</em>): it
                looks at the previous 2 days, uses revenue as-is without differencing, and corrects using its
                last 2 errors.
              </Readout>
              <Readout label="Backtested accuracy" value="62.8%">
                100 minus MAPE. On the 14 held-back days, this model’s forecasts missed actual revenue by
                37.21% on average, so accuracy reads 62.8%.
              </Readout>
              <Formula caption="Summed over the n held-back days that had revenue.">
                MAPE = (100 ÷ n) · Σ |actual − predicted| ÷ actual
              </Formula>
              <Small>
                Two things worth knowing about MAPE. It judges each miss relative to that day’s revenue, so
                a $500 miss on a $1,000 day counts as 50% while the same miss on a $10,000 day counts as 5% —
                files with many slow days score lower. And if MAPE goes above 100%, accuracy shows as a
                negative number: the typical miss was bigger than the revenue itself.
              </Small>
              <Small>
                For a sense of scale, a widely cited rule of thumb (Lewis, 1982) calls MAPE under 10% highly
                accurate, 10–20% good, 20–50% reasonable and over 50% inaccurate. Daily revenue is harder to
                forecast than the monthly or quarterly totals such scales usually describe, so expect higher
                MAPE here.
              </Small>
              <Readout label="Holdout" value="14 days">
                How many of the most recent days were held back for scoring.
              </Readout>
              <Readout
                label="Candidates"
                value={
                  <div className="text-[13px] leading-[1.8] tracking-normal">
                    <div className="flex justify-between gap-4"><span>ARIMA(2, 0, 2)</span><span>37.21</span></div>
                    <div className="flex justify-between gap-4 text-ink-faint"><span>Holt-Winters</span><span>49.37</span></div>
                    <div className="flex justify-between gap-4 text-ink-faint"><span>Growth curve</span><span>87.04</span></div>
                  </div>
                }
              >
                Every model that was scored, with its MAPE on the same held-back days — lower is better. The
                gaps show how clear-cut the choice was: ARIMA beat Holt-Winters by about 12 points, and the
                growth curve trailed well behind because this revenue doesn’t follow one smooth curve.
              </Readout>

              <Group>Your history</Group>
              <Readout label="Revenue by region" value="$472,480" sub="North America">
                Total revenue in each region across your whole uploaded history — what already happened,
                not what’s forecast.
              </Readout>
              <Readout label="Revenue by product" value="$455,910" sub="Enterprise Plan">
                The same, by product.
              </Readout>
              <Readout label="Anomalies" value="125 flagged">
                The individual sales Isolation Forest scored as most unusual, with the first eight listed.
                125 of 4,145 rows is about 3% — the quota described above, not a sign that something is
                wrong.
              </Readout>
            </Section>

            {/* ------------------------------------------------------------ 05 */}
            <Section id="glossary" n="05" title="Glossary">
              <Rows rows={[
                ["80% range", "The band each day’s forecast is built to catch actual revenue in about 8 days out of 10. That’s the target: in testing, Holt-Winters and growth-curve ranges ran wider than it (see How a forecast is built)."],
                ["AIC", "Akaike Information Criterion. Scores a model’s fit while penalizing extra parameters; used to choose between ARIMA versions. Lower is better."],
                ["Backtest", "Testing a model on past data it wasn’t trained on, to measure how it would actually have performed."],
                ["Contamination", "The share of rows Isolation Forest is told to flag. Prism uses 3%."],
                ["Damped trend", "A trend that gradually flattens across the forecast instead of continuing in a straight line."],
                ["Differencing", "Replacing each day’s value with its change from the day before, which removes a steady drift."],
                ["Holdout", "The most recent days, hidden from the models while they’re being scored."],
                ["MAPE", "Mean Absolute Percentage Error: the average size of a model’s misses, as a percentage of actual revenue."],
                ["Point forecast", "A model’s single best estimate for a day. Summed over 30 days, it’s the Moderate figure."],
                ["Refit", "Retraining the winning model on the full history, held-back days included, before it forecasts."],
                ["RMSE", "Root Mean Squared Error: the typical miss in dollars, weighting large misses heavily. Used only to decide when MAPE can’t be computed."],
                ["Seasonality", "A pattern that repeats on a fixed cycle — in Prism, the day of the week."],
              ]} />
            </Section>

          </article>
        </div>
      </div>
    </div>
  )
}
