"""ETL for the Gelar Rasa 2026 air quality dashboard.

Reads the raw CSVs, normalizes units, applies QC rules, and writes compact
static files consumed by the Next.js app into dashboard/public/data/.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

POLLUTANTS = ["pm25", "pm10", "so2", "co", "o3", "no2"]
PPM_FACTORS = {"so2": 2620.0, "co": 1145.0, "o3": 1960.0, "no2": 1880.0}
DATE_START = pd.Timestamp("2024-01-01")
DATE_END = pd.Timestamp("2026-10-14")

ORDER = [
    "JKT-01", "JKT-02", "JKT-03", "KTG-01", "KTG-02", "BGR-01", "BGR-02",
    "YKY-01", "IDP-01", "KTB-01", "PKU-01", "JMB-01", "BTM-01", "BGL-01",
    "SRG-01", "MLG-01", "MRS-01", "PLU-01", "STG-01", "PKN-01", "PLB-01",
    "PSW-01", "MER-01", "MDN-01", "SM2-01", "BJB-01", "JMB-02",
]

ISLAND_BY_PROVINCE = {
    "DKI Jakarta": "Jawa", "Jawa Barat": "Jawa", "Jawa Tengah": "Jawa",
    "D.I. Yogyakarta": "Jawa", "Jawa Timur": "Jawa", "Banten": "Jawa",
    "Aceh": "Sumatra", "Sumatera Utara": "Sumatra", "Sumatera Barat": "Sumatra",
    "Riau": "Sumatra", "Jambi": "Sumatra", "Sumatera Selatan": "Sumatra",
    "Bengkulu": "Sumatra", "Lampung": "Sumatra", "Kepulauan Riau": "Sumatra",
    "Kalimantan Barat": "Kalimantan", "Kalimantan Tengah": "Kalimantan",
    "Kalimantan Selatan": "Kalimantan", "Kalimantan Timur": "Kalimantan",
    "Kalimantan Utara": "Kalimantan",
    "Sulawesi Utara": "Sulawesi", "Sulawesi Tengah": "Sulawesi",
    "Sulawesi Selatan": "Sulawesi", "Sulawesi Tenggara": "Sulawesi",
    "Sulawesi Barat": "Sulawesi", "Gorontalo": "Sulawesi",
    "Papua": "Papua", "Papua Barat": "Papua", "Papua Selatan": "Papua",
    "Papua Tengah": "Papua", "Papua Pegunungan": "Papua",
    "Papua Barat Daya": "Papua",
}


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if not math.isfinite(float(value)) else round(float(value), 3)
    if isinstance(value, (pd.Timestamp,)):
        return value.strftime("%Y-%m-%d")
    if value is pd.NaT or value is None:
        return None
    return value


def dump_json(name: str, payload) -> None:
    path = OUT / name
    path.write_text(json.dumps(clean(payload), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote {name} ({path.stat().st_size / 1024:.0f} KB)")


def ispu_pm25(series: pd.Series) -> pd.Series:
    c = series
    conditions = [
        c <= 35, (c > 35) & (c <= 75), (c > 75) & (c <= 115),
        (c > 115) & (c <= 150), (c > 150) & (c <= 250), c > 250,
    ]
    lo = [0, 35, 75, 115, 150, 250]
    hi = [35, 75, 115, 150, 250, 500]
    ilo = [0, 51, 101, 151, 201, 301]
    ihi = [50, 100, 150, 200, 300, 500]
    out = pd.Series(np.nan, index=c.index)
    for cond, a, b, ia, ib in zip(conditions, lo, hi, ilo, ihi):
        out = out.mask(cond & out.isna(), ia + (c - a) / (b - a) * (ib - ia))
    return out


def ispu_category(v: float) -> str:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "Tidak ada data"
    if v <= 50:
        return "Baik"
    if v <= 100:
        return "Sedang"
    if v <= 150:
        return "Tidak Sehat"
    if v <= 200:
        return "Sangat Tidak Sehat"
    return "Berbahaya"


def load_master() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    sites = pd.read_csv(ROOT / "sites.csv")
    sensors = pd.read_csv(ROOT / "sensors.csv")
    hospitals = pd.read_csv(ROOT / "hospitals.csv").sort_values("hospital_id").reset_index(drop=True)
    sensors = sensors.sort_values("sensor_id").reset_index(drop=True)
    sites["code"] = sites["location_id"].str.replace("LOC-", "", regex=False)
    sites = sites.set_index("code").loc[ORDER].reset_index()
    sites["island"] = sites["provinsi"].map(ISLAND_BY_PROVINCE).fillna("Lainnya")
    sites["hospital_id"] = hospitals["hospital_id"].values
    sites["sensor_id"] = sensors["sensor_id"].values
    sites["hospital_name"] = hospitals["nama_rumah_sakit"].values
    sites["hospital_class"] = hospitals["kelas_faskes"].values
    sites["hospital_beds"] = hospitals["kapasitas_tempat_tidur"].values
    return sites, sensors, hospitals


def read_aqms(path: Path, station: pd.Series) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    raw = pd.read_csv(path, dtype=str, low_memory=False)
    qc_counts = raw["qc_flag"].fillna("UNKNOWN").value_counts().to_dict()
    ts = pd.to_datetime(raw["timestamp_start"], errors="coerce")
    ts = ts.where(ts.dt.year >= 2023)
    raw["ts"] = ts.dt.floor("h")
    raw = raw[raw["ts"].notna()].copy()

    values: dict[str, pd.Series] = {}
    units: dict[str, str] = {}
    for p in POLLUTANTS:
        ug = f"{p}_ug_m3"
        ppm = f"{p}_ppm"
        if ug in raw.columns:
            col, unit = ug, "ug/m3"
        elif ppm in raw.columns:
            col, unit = ppm, "ppm"
        else:
            values[p] = pd.Series(np.nan, index=raw.index)
            units[p] = "missing"
            continue
        s = pd.to_numeric(raw[col], errors="coerce")
        if unit == "ppm":
            s = s * (1000.0 if p in ("pm25", "pm10") else PPM_FACTORS[p])
        values[p] = s
        units[p] = unit

    for col in ["temperature_c", "humidity_pct", "wind_speed_ms", "wind_direction_deg"]:
        values[col] = pd.to_numeric(raw[col], errors="coerce")

    df = pd.DataFrame({"ts": raw["ts"], "qc": raw["qc_flag"].fillna("UNKNOWN")})
    for k, v in values.items():
        df[k] = v.values
    df["valid"] = df["qc"].eq("VALID")
    df["lenient"] = df["qc"].isin(["VALID", "SUSPECT"])
    df = df.drop_duplicates(subset=["ts"], keep="first").sort_values("ts").set_index("ts")

    # Resample to hourly (PLB-01 logs every 15 minutes during haze season).
    hourly = pd.DataFrame(index=df.index)
    for p in POLLUTANTS:
        hourly[p] = df[p].where(df["valid"]).resample("h").mean()
        hourly[p + "_lenient"] = df[p].where(df["lenient"]).resample("h").mean()
    for c in ["temperature_c", "humidity_pct", "wind_speed_ms", "wind_direction_deg"]:
        hourly[c] = df[c].where(df["valid"]).resample("h").mean()

    # Stuck sensor detection: same PM2.5 value for 6+ consecutive hours.
    s = hourly["pm25"]
    run = s.ne(s.shift()).cumsum()
    sizes = s.groupby(run).transform("size")
    hourly["stuck"] = (sizes >= 6) & s.notna()
    hourly.loc[hourly["stuck"], "pm25"] = np.nan
    hourly.loc[hourly["stuck"], "pm25_lenient"] = np.nan

    hourly["station_id"] = station["code"]
    hourly["island"] = station["island"]
    hourly["site_type"] = station["site_type"]

    # Daily aggregation: at least 18 valid hours required.
    hourly = hourly.reset_index()
    hourly["date"] = hourly["ts"].dt.normalize()
    agg = hourly.groupby("date").agg(
        valid_hours=("pm25", lambda x: int(x.notna().sum())),
        is_stuck=("stuck", "max"),
    )
    for p in POLLUTANTS:
        agg[p] = hourly.groupby("date")[p].mean()
        agg[p + "_lenient"] = hourly.groupby("date")[p + "_lenient"].mean()
    for c in ["temperature_c", "humidity_pct", "wind_speed_ms", "wind_direction_deg"]:
        agg[c] = hourly.groupby("date")[c].mean()

    full = pd.date_range(DATE_START, DATE_END, freq="D")
    agg = agg.reindex(full)
    agg["valid_hours"] = agg["valid_hours"].fillna(0).astype(int)
    agg["is_stuck"] = agg["is_stuck"].fillna(False).astype(bool)
    agg["completeness_pct"] = (agg["valid_hours"] / 24 * 100).clip(0, 100)
    low = agg["valid_hours"] < 6
    for p in POLLUTANTS:
        agg.loc[low, p] = np.nan

    agg = agg.reset_index().rename(columns={"index": "date"})
    agg["date"] = agg["date"].dt.strftime("%Y-%m-%d")
    agg["station_id"] = station["code"]
    agg["ispu"] = ispu_pm25(agg["pm25"])
    agg["category"] = agg["ispu"].apply(ispu_category)
    agg["exceed_55"] = (agg["pm25"] > 55).fillna(False).astype(int)
    agg["episode"] = (agg["pm25"] > 75).fillna(False).astype(int)

    info = {
        "qc_counts": {str(k): int(v) for k, v in qc_counts.items()},
        "rows": int(len(raw)),
        "units": units,
        "stuck_hours": int(hourly["stuck"].sum()),
        "stuck_ranges": [],
    }
    stuck_ts = hourly.loc[hourly["stuck"], "ts"].sort_values()
    if len(stuck_ts):
        groups = (stuck_ts.diff() > pd.Timedelta(hours=1)).cumsum()
        for _, grp in stuck_ts.groupby(groups):
            if len(grp) >= 6:
                info["stuck_ranges"].append({
                    "from": grp.iloc[0].strftime("%Y-%m-%d"),
                    "to": grp.iloc[-1].strftime("%Y-%m-%d"),
                    "hours": int(len(grp)),
                })
    return agg, hourly, info


def main() -> None:
    print("Loading master tables...")
    sites, sensors, hospitals = load_master()
    health = pd.read_csv(ROOT / "HLT-01_health_outcomes_daily.csv", parse_dates=["date"])
    health = health.rename(columns={
        "resp_admissions_under5": "resp_under5",
        "resp_admissions_over60": "resp_over60",
        "asthma_emergency_cases": "asthma",
        "copd_admissions": "copd",
    })
    health["date_dt"] = health["date"]
    health["idx"] = health["hospital_id"].str.extract(r"(\d+)").astype(int)
    station_by_idx = {i + 1: code for i, code in enumerate(ORDER)}
    health["station_id"] = health["idx"].map(station_by_idx)
    meta = sites.set_index("code")
    health["island"] = health["station_id"].map(meta["island"])
    health["is_weekend"] = health["dow"].isin(["Saturday", "Sunday"]).astype(int)
    health["date"] = health["date"].dt.strftime("%Y-%m-%d")
    health = health[[
        "date", "time", "hospital_id", "station_id", "dow", "is_weekend",
        "temp_c", "dptp_c", "rhum_pct", "resp", "resp_under5", "resp_over60",
        "asthma", "copd", "cvd", "death", "island",
    ]]
    health_out = health[[
        "date", "station_id", "resp", "resp_under5", "resp_over60",
        "asthma", "copd", "cvd", "death", "island",
    ]]
    health_out.to_csv(OUT / "daily_health.csv", index=False, float_format="%.2f")
    print(f"  wrote daily_health.csv ({len(health)} rows)")

    daily_frames = []
    hourly_frames = []
    dq_info = {}
    print("Processing 27 AQMS files...")
    for code in ORDER:
        path = next(ROOT.glob(f"{code}_*_AQMS.csv"))
        daily, hourly, info = read_aqms(path, sites[sites["code"] == code].iloc[0])
        daily_frames.append(daily)
        hourly_frames.append(hourly[["ts", "station_id", "island", "site_type", "pm25", "temperature_c", "humidity_pct", "wind_speed_ms", "wind_direction_deg", "stuck"]])
        dq_info[code] = info
        print(f"  {code}: {len(daily)} days, {info['rows']} rows, stuck {info['stuck_hours']}h")

    daily_air = pd.concat(daily_frames, ignore_index=True)
    hourly_all = pd.concat(hourly_frames, ignore_index=True)
    daily_air["island"] = daily_air["station_id"].map(sites.set_index("code")["island"])
    daily_air["site_type"] = daily_air["station_id"].map(sites.set_index("code")["site_type"])
    daily_air_out = daily_air[[
        "date", "station_id", "valid_hours", "pm25", "ispu", "category",
        "exceed_55", "episode", "completeness_pct", "island", "site_type",
    ]].copy()
    daily_air_out["pm25"] = daily_air_out["pm25"].round(2)
    daily_air_out["ispu"] = daily_air_out["ispu"].round(1)
    daily_air_out["completeness_pct"] = daily_air_out["completeness_pct"].round(1)
    daily_air_out.to_csv(OUT / "daily_air.csv", index=False)
    print(f"  wrote daily_air.csv ({len(daily_air)} rows)")
    daily_air["date_dt"] = pd.to_datetime(daily_air["date"])
    daily_air["month"] = daily_air["date_dt"].dt.strftime("%Y-%m")
    daily_air["year"] = daily_air["date_dt"].dt.year

    # ---------- Stations ----------
    station_metrics = daily_air.groupby("station_id").agg(
        pm25_mean=("pm25", "mean"), pm25_max=("pm25", "max"),
        valid_days=("pm25", "count"), episode_days=("episode", "sum"),
        exceed_days=("exceed_55", "sum"), completeness=("completeness_pct", "mean"),
    )
    station_rows = []
    for _, row in sites.iterrows():
        code = row["code"]
        m = station_metrics.loc[code]
        status, reason = "ok", ""
        if code == "JMB-02":
            status, reason = "excluded", "Telemetri rusak, hanya 122 jam valid"
        elif code == "BJB-01":
            status, reason = "flagged", "Sensor macet 306 hari"
        elif code == "MDN-01":
            status, reason = "flagged", "Gap data 3.632 jam"
        elif code == "MER-01":
            status, reason = "flagged", "Banyak data hilang"
        elif code == "PLB-01":
            status, reason = "flagged", "Resolusi 15 menit pada Sep-Okt"
        station_rows.append({
            "station_id": code,
            "sensor_id": row["sensor_id"],
            "hospital_id": row["hospital_id"],
            "name": f"{row['kecamatan']}, {row['kota_kabupaten']}",
            "city": row["kota_kabupaten"],
            "province": row["provinsi"],
            "region": row["region_group"],
            "island": row["island"],
            "site_type": row["site_type"],
            "lat": row["latitude_dd"],
            "lon": row["longitude_dd"],
            "baseline_pm25": row["baseline_pm25"],
            "traffic": row["traffic_intensity_per_h"],
            "distance_road": row["distance_to_road_m"],
            "status": status,
            "status_reason": reason,
            "pm25_mean": m["pm25_mean"],
            "pm25_max": m["pm25_max"],
            "valid_days": int(m["valid_days"]),
            "episode_days": int(m["episode_days"]),
            "exceed_days": int(m["exceed_days"]),
            "completeness": m["completeness"],
        })
    stations = pd.DataFrame(station_rows)
    dump_json("stations.json", stations.to_dict(orient="records"))

    # ---------- Monthly / yearly ----------
    monthly_national = daily_air.groupby("month").agg(
        pm25=("pm25", "mean"), pm25_median=("pm25", "median"),
        station_days=("pm25", "count"),
    ).reset_index()
    monthly_island = daily_air.groupby(["month", "island"])["pm25"].mean().reset_index()
    monthly_station = daily_air.groupby(["month", "station_id"])["pm25"].mean().reset_index()
    health["date_dt"] = pd.to_datetime(health["date"])
    health["month"] = health["date_dt"].dt.strftime("%Y-%m")
    health_daily_national = health.groupby("date")[["resp", "cvd", "death", "asthma", "copd", "resp_under5", "resp_over60"]].sum().reset_index()
    health_daily_national["date_dt"] = pd.to_datetime(health_daily_national["date"])
    health_daily_national["month"] = health_daily_national["date_dt"].dt.strftime("%Y-%m")
    health_monthly = health_daily_national.groupby("month")[["resp", "cvd", "death", "asthma", "copd", "resp_under5", "resp_over60"]].mean().reset_index()
    dump_json("monthly.json", {
        "national": monthly_national.to_dict(orient="records"),
        "byIsland": monthly_island.to_dict(orient="records"),
        "byStation": monthly_station.to_dict(orient="records"),
        "health": health_monthly.to_dict(orient="records"),
    })

    yearly = daily_air.groupby(["year", "station_id"])["pm25"].mean().reset_index()
    dump_json("yearly.json", yearly.to_dict(orient="records"))

    # ---------- Temporal profiles ----------
    h = hourly_all.dropna(subset=["pm25"]).copy()
    h["hour"] = h["ts"].dt.hour
    h["dow"] = h["ts"].dt.dayofweek
    h["day_type"] = np.where(h["dow"] < 5, "kerja", "libur")
    hour_dow = h.groupby(["island", "hour", "dow"])["pm25"].mean().reset_index()
    diurnal_type = h.groupby(["site_type", "hour"])["pm25"].mean().reset_index()
    station_hour = h.groupby(["station_id", "hour"])["pm25"].mean().reset_index()
    station_hour_day = h.groupby(["station_id", "hour", "day_type"])["pm25"].mean().reset_index()
    dump_json("temporal.json", {
        "hourDow": hour_dow.to_dict(orient="records"),
        "diurnalByType": diurnal_type.to_dict(orient="records"),
        "stationHour": station_hour.to_dict(orient="records"),
        "stationHourDay": station_hour_day.to_dict(orient="records"),
    })

    # ---------- Wind rose ----------
    w = hourly_all.dropna(subset=["wind_direction_deg", "wind_speed_ms"]).copy()
    w["dir"] = ((w["wind_direction_deg"] % 360 + 11.25) // 22.5).astype(int) % 16
    speed_bins = [0, 1, 2, 4, 6, 100]
    w["speed_bin"] = pd.cut(w["wind_speed_ms"], bins=speed_bins, labels=False, right=False)
    windrose = {}
    for code, g in w.groupby("station_id"):
        counts = np.zeros((16, len(speed_bins) - 1), dtype=int)
        for (d, b), n in g.groupby(["dir", "speed_bin"]).size().items():
            if pd.notna(b):
                counts[int(d), int(b)] = int(n)
        windrose[code] = {
            "counts": counts.tolist(),
            "total": int(counts.sum()),
            "speed_bins": ["<1", "1-2", "2-4", "4-6", ">6"],
        }
    dump_json("windrose.json", windrose)

    # ---------- Correlations ----------
    corr_station = []
    for code, g in h.groupby("station_id"):
        g2 = g.dropna(subset=["temperature_c", "humidity_pct", "wind_speed_ms"])
        corr_station.append({
            "station_id": code,
            "temp": g2["pm25"].corr(g2["temperature_c"]),
            "rh": g2["pm25"].corr(g2["humidity_pct"]),
            "wind": g2["pm25"].corr(g2["wind_speed_ms"]),
            "n": int(len(g2)),
        })
    pollutant_cols = POLLUTANTS
    hp = hourly_all.dropna(subset=["pm25"])
    pmat = daily_air[pollutant_cols].corr().round(3)
    site_corr = sites[["baseline_pm25", "traffic_intensity_per_h", "distance_to_road_m"]].corr().round(3)
    site_type_mean = sites.groupby("site_type")["baseline_pm25"].mean().sort_values(ascending=False).reset_index()
    dump_json("correlations.json", {
        "station": corr_station,
        "pollutants": {
            "labels": pollutant_cols,
            "matrix": pmat.where(pd.notna(pmat), None).values.tolist(),
        },
        "site": site_corr.where(pd.notna(site_corr), None).values.tolist(),
        "siteLabels": ["baseline", "traffic", "jarak jalan"],
        "siteType": site_type_mean.to_dict(orient="records"),
    })

    # ---------- Health link + lag ----------
    link = daily_air[["date", "station_id", "pm25"]].merge(
        health[["date", "station_id", "resp", "cvd", "death", "asthma", "copd", "resp_under5", "resp_over60"]],
        on=["date", "station_id"], how="inner",
    )
    link["date_dt"] = pd.to_datetime(link["date"])
    link["month"] = link["date_dt"].dt.strftime("%Y-%m")
    outcomes = ["resp", "resp_under5", "resp_over60", "asthma", "copd", "cvd", "death"]
    for col in ["pm25"] + outcomes:
        link[col + "_anom"] = link[col] - link.groupby(["station_id", "month"])[col].transform("mean")
    link = link.sort_values(["station_id", "date"]).reset_index(drop=True)

    agg_rows = []
    for lag in range(0, 8):
        link["pm_lag"] = link.groupby("station_id")["pm25"].shift(lag)
        link["pm_lag_anom"] = link.groupby("station_id")["pm25_anom"].shift(lag)
        for outcome in outcomes:
            rs, ra = [], []
            for code, g in link.groupby("station_id"):
                if len(g.dropna(subset=["pm_lag", outcome])) < 200:
                    continue
                rs.append(g["pm_lag"].corr(g[outcome]))
                ra.append(g["pm_lag_anom"].corr(g[outcome + "_anom"]))
            agg_rows.append({
                "lag": lag, "outcome": outcome,
                "raw": float(np.nanmean(rs)) if rs else None,
                "anomaly": float(np.nanmean(ra)) if ra else None,
                "n": len(rs),
            })
    by_station = []
    for code, g in link.groupby("station_id"):
        row = {"station_id": code, "n": int(len(g))}
        for outcome in ["resp_under5", "resp_over60", "resp"]:
            row[outcome] = g["pm25_anom"].corr(g[outcome + "_anom"])
        by_station.append(row)
    dump_json("lag.json", {"aggregate": agg_rows, "byStation": by_station})

    # ---------- National KPIs and episodes ----------
    national_daily = daily_air.groupby("date").agg(pm25=("pm25", "mean"), stations=("pm25", "count")).reset_index()
    national_daily["date_dt"] = pd.to_datetime(national_daily["date"])
    top_episodes = daily_air.dropna(subset=["pm25"]).nlargest(15, "pm25")[["date", "station_id", "pm25", "ispu", "category"]].to_dict(orient="records")
    sep_oct = health_daily_national.copy()
    sep_oct["year"] = sep_oct["date_dt"].dt.year
    sep_oct = sep_oct[sep_oct["date_dt"].dt.month.isin([9, 10])].groupby("year")["resp"].mean()
    summary = {
        "period": {"start": "2024-01-01", "end": "2026-10-14", "days": int(daily_air["date"].nunique())},
        "stations": int(len(sites)),
        "hospitals": int(len(hospitals)),
        "pm25_mean": float(daily_air["pm25"].mean()),
        "episode_days": int(daily_air["episode"].sum()),
        "exceed_days": int(daily_air["exceed_55"].sum()),
        "resp_total": int(health["resp"].sum()),
        "resp_under5_total": int(health["resp_under5"].sum()),
        "resp_over60_total": int(health["resp_over60"].sum()),
        "death_total": int(health["death"].sum()),
        "sep_oct_resp": {int(k): float(v) for k, v in sep_oct.items()},
        "peak_day": top_episodes[0] if top_episodes else None,
        "top_episodes": top_episodes,
        "nationalDaily": national_daily[["date", "pm25", "stations"]].rename(columns={"stations": "station_count"}).to_dict(orient="records"),
    }
    dump_json("summary.json", summary)

    # ---------- Data quality ----------
    qc_totals: dict[str, int] = {}
    for info in dq_info.values():
        for k, v in info["qc_counts"].items():
            qc_totals[k] = qc_totals.get(k, 0) + v
    completeness = daily_air.groupby(["station_id", "month"]).agg(
        valid_hours=("valid_hours", "sum"),
        days=("date", "count"),
    ).reset_index()
    completeness["pct"] = (completeness["valid_hours"] / (completeness["days"] * 24) * 100).clip(0, 100)
    exclusions = []
    for code in ORDER:
        info = dq_info[code]
        if code == "JMB-02":
            exclusions.append({"station_id": code, "from": "2024-01-01", "to": "2026-10-14", "reason": "Telemetri rusak; hanya 122 jam valid"})
        for rng in info["stuck_ranges"]:
            exclusions.append({"station_id": code, "from": rng["from"], "to": rng["to"], "reason": f"Nilai PM2.5 identik {rng['hours']} jam"})
    dq = {
        "qcTotals": qc_totals,
        "rows": int(sum(i["rows"] for i in dq_info.values())),
        "validRows": int(qc_totals.get("VALID", 0)),
        "station": [
            {
                "station_id": code,
                "rows": dq_info[code]["rows"],
                "valid_pct": 100 * dq_info[code]["qc_counts"].get("VALID", 0) / dq_info[code]["rows"],
                "stuck_hours": dq_info[code]["stuck_hours"],
                "stuck_ranges": dq_info[code]["stuck_ranges"],
                "units": dq_info[code]["units"],
                "flags": dq_info[code]["qc_counts"],
                "completeness": float(stations.loc[stations["station_id"] == code, "completeness"].iloc[0]),
            }
            for code in ORDER
        ],
        "completeness": completeness[["station_id", "month", "pct"]].to_dict(orient="records"),
        "exclusions": exclusions,
        "conversions": [
            {"file": "BJB-01 / MDN-01 / PSW-01", "parameter": "PM2.5, PM10", "from": "ppm (mg/m3)", "factor": "x1000"},
            {"file": "BJB-01 / MDN-01 / PSW-01", "parameter": "SO2", "from": "ppm", "factor": "x2620"},
            {"file": "BJB-01 / MDN-01 / PSW-01", "parameter": "CO", "from": "ppm", "factor": "x1145"},
            {"file": "BJB-01 / MDN-01 / PSW-01", "parameter": "O3", "from": "ppm", "factor": "x1960"},
            {"file": "BJB-01 / MDN-01 / PSW-01", "parameter": "NO2", "from": "ppm", "factor": "x1880"},
        ],
    }
    dump_json("dq.json", dq)

    # ---------- Priority score ----------
    health_by_station = health.groupby("station_id")["resp"].mean()
    pr = stations.copy()
    pr["health_burden"] = pr["station_id"].map(health_by_station)
    pr["episode_rate"] = pr["episode_days"] / pr["valid_days"].replace(0, np.nan)
    # Use the observed station mean, not the site-character baseline, so the
    # score reflects what the monitor actually recorded during 2024-2026.
    for col in ["pm25_mean", "baseline_pm25", "episode_rate", "health_burden", "completeness"]:
        lo, hi = pr[col].min(), pr[col].max()
        pr[col + "_n"] = (pr[col] - lo) / (hi - lo) if hi > lo else 0
    pr["redundancy"] = pr["station_id"].isin(["KTG-01", "KTG-02"]).astype(float)
    pr["score"] = 100 * (
        0.30 * pr["pm25_mean_n"] + 0.25 * pr["episode_rate_n"] +
        0.25 * pr["health_burden_n"] + 0.10 * (1 - pr["completeness_n"]) +
        0.10 * pr["redundancy"]
    )
    pr["recommendation"] = np.select(
        [pr["score"] >= 55, pr["score"] >= 40], ["Prioritas tinggi", "Pantau & perkuat"], "Cukup memadai"
    )
    dump_json("priority.json", pr[[
        "station_id", "name", "island", "score", "recommendation",
        "pm25_mean", "baseline_pm25", "episode_days", "valid_days", "health_burden", "completeness",
        "pm25_mean_n", "baseline_pm25_n", "episode_rate_n", "health_burden_n", "completeness_n", "redundancy",
    ]].sort_values("score", ascending=False).to_dict(orient="records"))

    print("\nDone.")
    print(f"  national PM2.5 mean: {summary['pm25_mean']:.2f}")
    print(f"  episode days (station-days >75): {summary['episode_days']}")
    print(f"  top station: {stations.sort_values('pm25_mean', ascending=False).iloc[0]['station_id']}")


if __name__ == "__main__":
    main()
