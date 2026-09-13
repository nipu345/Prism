# Sample data

Six files you can upload to Prism. Each one is shaped like a different kind
of business, so the forecasting behaves differently on each: a different
model wins, the accuracy score lands somewhere different, and the forecast
points a different direction.

All of it is synthetic. `demo_sales.csv` comes from
`scripts/generate_demo_data.py`, the other five from
`scripts/generate_sample_datasets.py`. Both use fixed seeds, so rerunning
them produces the same files.

## At a glance

| File | Business | Rows | History | Winning model | Accuracy | vs. history |
|---|---|---|---|---|---|---|
| `demo_sales.csv` | Mid-market SaaS | 4,145 | 180 days | ARIMA(2, 0, 2) | 62.8% | +0.5% |
| `saas_steady_growth.csv` | High-volume SaaS | 12,093 | 180 days | Holt-Winters | 82.5% | +50.9% |
| `retail_weekly_pattern.csv` | Coffee retailer | 8,059 | 180 days | Holt-Winters | 73.4% | −1.1% |
| `manufacturing_decline.csv` | Industrial supplier | 2,883 | 180 days | Holt-Winters | 74.1% | −28.2% |
| `enterprise_lumpy_deals.csv` | Enterprise software | 886 | 180 days | ARIMA(2, 0, 2) | 44.2% | +4.2% |
| `startup_short_history.csv` | Early-stage startup | 548 | 42 days | Holt-Winters | 68.0% | +62.3% |

Accuracy is 100 minus the backtested MAPE. "vs. history" compares the
expected forecast's daily average with the average day across the whole
file. The Methodology page in the app explains both.

## What each file is good for

### `demo_sales.csv`
The file the Methodology page walks through line by line, so start here if
you want to follow along. A steady B2B business with a mild upward trend and
a weekend dip.

### `saas_steady_growth.csv`
About 67 small subscription sales a day on average, compounding steadily.
High volume means individual deals barely move the daily total, so this is
the most forecastable file of the set: MAPE 17.46%, the only one under the
20% a common rule of thumb calls good. It also shows the biggest forecast
jump over its own history of any 180-day file (+50.9%), because a business
that grew all period sits well above its full-period average.

### `retail_weekly_pattern.csv`
A coffee retailer across three Colorado stores, busiest on weekends, the
opposite of a B2B file. Two things to look at:

- **The headers don't match Prism's names.** The columns are `Order Date`,
  `Store Location`, `SKU`, `Quantity` and `Sales Amount`. Prism recognizes
  them anyway, which is the point of the file.
- **The model choice is a near tie.** Holt-Winters scored 26.64 and ARIMA
  27.30. Check the Candidates panel: when the gap is under a point, either
  model would have been a reasonable pick.

### `manufacturing_decline.csv`
An industrial parts supplier losing volume across the whole period, with a
further step down around day 120 when a major customer leaves. It only ships
on weekdays, so 128 of the 180 days have sales and the rest count as $0.

This is the file that shows Prism forecasting a decline honestly: the
expected daily average comes in 28.2% below the file's history.

### `enterprise_lumpy_deals.csv`
About seven large contracts per business day, from small support renewals up
to a single $265,000 license. When a few big deals drive revenue, daily
totals swing hard and no model can forecast them tightly.

That's what the file is for. MAPE comes in at 55.78%, past the 50% mark that
same rule of thumb calls inaccurate, and the gap between Conservative and
Aggressive is wide. A low score here isn't Prism failing. It's Prism telling
you the data is hard to predict. It's also the only file besides the demo
where ARIMA wins.

### `startup_short_history.csv`
Six weeks of history at a startup growing fast. With only 42 days, Prism
holds back 10 days for scoring instead of the usual 14, since it keeps the
holdout to roughly a quarter of the history. Upload it to see a forecast
built from very little data.

## Worth knowing

- **The growth curve never wins on these files.** It's in the running on
  every upload, but a single smooth compounding curve can't follow daily
  swings as well as the other two models. It came closest on
  `enterprise_lumpy_deals.csv`, finishing second at 59.14 against ARIMA's
  55.78 and well ahead of Holt-Winters.
- **Conservative often reaches $0 on individual days.** Partly that's noisy
  daily data, and partly it's a known issue: when Holt-Winters or the growth
  curve wins, Prism's range comes out wider than the 80% it aims for. The
  Methodology page covers this.
- **These numbers depend on the forecasting code.** If `backend/agents.py`
  changes, rerun the files to refresh them.
