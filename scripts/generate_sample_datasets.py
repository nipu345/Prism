"""Generates five extra sample datasets in sample_data/, each shaped like a
different kind of business so the forecasting behaves differently on each.

Deterministic (a fixed seed per file), so the files are reproducible and
what sample_data/README.md says about each one stays true. demo_sales.csv
comes from generate_demo_data.py and is left untouched.

Run from the repo root:
    backend/venv/bin/python scripts/generate_sample_datasets.py
"""

import math

import numpy as np
import pandas as pd

OUT_DIR = "sample_data"
END_DATE = pd.Timestamp("2026-08-31")

# weekday multipliers run Monday..Sunday
PROFILES = [
    {
        # many small subscription sales, compounding steadily
        "file": "saas_steady_growth.csv",
        "seed": 11,
        "days": 180,
        "deals_per_day": 55,
        "trend": lambda i, n: math.exp(0.004 * i),
        "weekday": [1.0, 1.0, 1.0, 1.0, 0.95, 0.5, 0.45],
        "products": {"Starter": (19, 0.40), "Team": (79, 0.35), "Business": (249, 0.18), "Enterprise": (899, 0.07)},
        "regions": {"US West": 0.35, "US East": 0.30, "Europe": 0.25, "APAC": 0.10},
        "units": (1.4, 0.6),
        "price_noise": 0.05,
        "spikes": [(95, "Enterprise", 24, 21576.00, "US East")],
    },
    {
        # coffee retailer: weekend PEAKS (the opposite of B2B), and headers
        # that don't match the standard names, to exercise column matching
        "file": "retail_weekly_pattern.csv",
        "seed": 22,
        "days": 180,
        "deals_per_day": 40,
        "trend": lambda i, n: 1 + 0.08 * i / n,
        "weekday": [0.75, 0.70, 0.80, 0.95, 1.25, 1.65, 1.35],
        "products": {
            "Espresso Machine": (349, 0.08),
            "Burr Grinder": (129, 0.14),
            "Whole Bean 1kg": (24, 0.45),
            "Paper Filters": (6, 0.23),
            "Gooseneck Kettle": (59, 0.10),
        },
        "regions": {"Denver": 0.45, "Boulder": 0.35, "Fort Collins": 0.20},
        "units": (1.6, 0.8),
        "price_noise": 0.03,
        "spikes": [(110, "Espresso Machine", 30, 9420.00, "Denver")],
        "headers": {
            "date": "Order Date",
            "region": "Store Location",
            "product": "SKU",
            "units_sold": "Quantity",
            "revenue": "Sales Amount",
        },
    },
    {
        # industrial supplier losing volume, with a step down when a major
        # customer leaves around day 120. Closed on weekends: no rows at all,
        # which Prism counts as $0 days. (A trickle of tiny weekend orders
        # would make MAPE explode — a normal miss on a $40 day is thousands
        # of percent — and misrepresent how a B2B file actually looks.)
        "file": "manufacturing_decline.csv",
        "seed": 33,
        "days": 180,
        "deals_per_day": 30,
        "trend": lambda i, n: (1 - 0.35 * i / n) * (0.8 if i >= 120 else 1.0),
        "weekday": [1.0, 1.0, 1.0, 1.0, 0.9, 0.0, 0.0],
        "products": {
            "Bearing Assembly": (42, 0.35),
            "Hydraulic Valve": (186, 0.20),
            "Gear Set": (95, 0.30),
            "Sensor Module": (310, 0.15),
        },
        "regions": {"Midwest": 0.40, "Southeast": 0.25, "Northeast": 0.20, "Texas": 0.15},
        "units": (35, 8),
        "price_noise": 0.04,
    },
    {
        # a handful of large contracts per business day with heavy-tailed
        # values: lumpy enough that accuracy is visibly poor, but dense enough
        # to be forecastable at all (at ~1 contract every other day, MAPE
        # passed 200% and accuracy read as a negative number)
        "file": "enterprise_lumpy_deals.csv",
        "seed": 44,
        "days": 180,
        "deals_per_day": 6,
        "trend": lambda i, n: 1 + 0.25 * i / n,
        "weekday": [1.0, 1.05, 1.05, 1.0, 0.9, 0.0, 0.0],
        "products": {
            "Platform License": (16000, 0.35),
            "Implementation": (6000, 0.30),
            "Support Renewal": (3000, 0.35),
        },
        "regions": {"North America": 0.55, "EMEA": 0.30, "LATAM": 0.15},
        "units": (1, 0),
        "lumpy_sigma": 0.7,
        "spikes": [(60, "Platform License", 1, 265000.00, "North America")],
    },
    {
        # six weeks of history at an early-stage startup growing fast
        "file": "startup_short_history.csv",
        "seed": 55,
        "days": 42,
        "deals_per_day": 9,
        "trend": lambda i, n: math.exp(0.022 * i),
        "weekday": [1.0, 1.0, 1.0, 1.0, 0.95, 0.6, 0.55],
        "products": {"Pro Plan": (29, 0.7), "Team Plan": (99, 0.3)},
        "regions": {"United States": 0.8, "Canada": 0.2},
        "units": (1.5, 0.7),
        "price_noise": 0.04,
    },
]


def build(profile: dict) -> pd.DataFrame:
    rng = np.random.default_rng(profile["seed"])
    n = profile["days"]
    dates = pd.date_range(end=END_DATE, periods=n, freq="D")

    products = list(profile["products"])
    prices = np.array([profile["products"][p][0] for p in products], dtype=float)
    product_p = np.array([profile["products"][p][1] for p in products], dtype=float)
    product_p /= product_p.sum()
    regions = list(profile["regions"])
    region_p = np.array(list(profile["regions"].values()), dtype=float)
    region_p /= region_p.sum()
    units_mean, units_sd = profile["units"]

    rows = []
    for i, date in enumerate(dates):
        expected_deals = profile["deals_per_day"] * profile["trend"](i, n) * profile["weekday"][date.dayofweek]
        for _ in range(rng.poisson(expected_deals)):
            k = rng.choice(len(products), p=product_p)
            units = max(1, int(round(rng.normal(units_mean, units_sd))))
            if "lumpy_sigma" in profile:
                noise = rng.lognormal(0, profile["lumpy_sigma"])
            else:
                noise = max(0.5, rng.normal(1, profile["price_noise"]))
            rows.append({
                "date": date.date().isoformat(),
                "revenue": round(max(1.0, prices[k] * units * noise), 2),
                "units_sold": units,
                "product": products[k],
                "region": regions[rng.choice(len(regions), p=region_p)],
            })

    # one-off outliers, placed well before the last weeks so they sit in the
    # training data rather than in the days held back for scoring
    for day, product, units, revenue, region in profile.get("spikes", []):
        rows.append({
            "date": dates[day].date().isoformat(),
            "revenue": revenue,
            "units_sold": units,
            "product": product,
            "region": region,
        })

    df = pd.DataFrame(rows).sort_values("date", kind="stable").reset_index(drop=True)
    df = df[["date", "revenue", "units_sold", "product", "region"]]
    if "headers" in profile:
        df = df.rename(columns=profile["headers"])
        df = df[["Order Date", "Store Location", "SKU", "Quantity", "Sales Amount"]]
    return df


def main():
    for profile in PROFILES:
        df = build(profile)
        path = f"{OUT_DIR}/{profile['file']}"
        df.to_csv(path, index=False)
        date_col = df.columns[0]
        print(f"{path}: {len(df):,} rows across {df[date_col].nunique()} days")


if __name__ == "__main__":
    main()
