"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import type { DailyAir, DailyHealth } from "@/types/data";

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat ${url}`);
        return res.json() as Promise<T>;
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

function getCsv<T>(url: string, map: (row: Record<string, unknown>) => T): Promise<T[]> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Gagal memuat ${url}`);
          return res.text();
        })
        .then(
          (text) =>
            new Promise<T[]>((resolve, reject) => {
              Papa.parse<Record<string, unknown>>(text, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                complete: (result) => resolve(result.data.map(map)),
                error: reject,
              });
            }),
        ),
    );
  }
  return cache.get(url) as Promise<T[]>;
}

const num = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const str = (value: unknown): string => (value == null ? "" : String(value));

function mapDailyAir(row: Record<string, unknown>): DailyAir {
  return {
    date: str(row.date),
    station_id: str(row.station_id),
    valid_hours: num(row.valid_hours) ?? 0,
    is_stuck: false,
    pm25: num(row.pm25),
    pm25_lenient: null,
    pm10: null,
    so2: null,
    co: null,
    o3: null,
    no2: null,
    temperature_c: null,
    humidity_pct: null,
    wind_speed_ms: null,
    wind_direction_deg: null,
    completeness_pct: num(row.completeness_pct) ?? 0,
    ispu: num(row.ispu),
    category: str(row.category),
    exceed_55: num(row.exceed_55) ?? 0,
    episode: num(row.episode) ?? 0,
    island: str(row.island),
    site_type: str(row.site_type),
  };
}

function mapDailyHealth(row: Record<string, unknown>): DailyHealth {
  return {
    date: str(row.date),
    time: 0,
    hospital_id: "",
    station_id: str(row.station_id),
    dow: "",
    is_weekend: 0,
    temp_c: 0,
    dptp_c: 0,
    rhum_pct: 0,
    resp: num(row.resp) ?? 0,
    resp_under5: num(row.resp_under5) ?? 0,
    resp_over60: num(row.resp_over60) ?? 0,
    asthma: num(row.asthma) ?? 0,
    copd: num(row.copd) ?? 0,
    cvd: num(row.cvd) ?? 0,
    death: num(row.death) ?? 0,
    island: str(row.island),
  };
}

type LoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

function useAsync<T>(loader: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null, loading: true });
    loader()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : "Terjadi kesalahan",
            loading: false,
          });
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

export function useJson<T>(path: string) {
  return useAsync(() => getJson<T>(path));
}

export function useDailyAir() {
  return useAsync(() => getCsv("/data/daily_air.csv", mapDailyAir));
}

export function useDailyHealth() {
  return useAsync(() => getCsv("/data/daily_health.csv", mapDailyHealth));
}
