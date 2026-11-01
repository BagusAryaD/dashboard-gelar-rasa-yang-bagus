export type Station = {
  station_id: string;
  sensor_id: string;
  hospital_id: string;
  name: string;
  city: string;
  province: string;
  region: string;
  island: string;
  site_type: string;
  lat: number;
  lon: number;
  baseline_pm25: number;
  traffic: number;
  distance_road: number;
  status: "ok" | "flagged" | "excluded";
  status_reason: string;
  pm25_mean: number | null;
  pm25_max: number | null;
  valid_days: number;
  episode_days: number;
  exceed_days: number;
  completeness: number;
};

export type DailyAir = {
  date: string;
  station_id: string;
  valid_hours: number;
  is_stuck: boolean;
  pm25: number | null;
  pm25_lenient: number | null;
  pm10: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  no2: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  wind_speed_ms: number | null;
  wind_direction_deg: number | null;
  completeness_pct: number;
  ispu: number | null;
  category: string;
  exceed_55: number;
  episode: number;
  island: string;
  site_type: string;
};

export type DailyHealth = {
  date: string;
  time: number;
  hospital_id: string;
  station_id: string;
  dow: string;
  is_weekend: number;
  temp_c: number;
  dptp_c: number;
  rhum_pct: number;
  resp: number;
  resp_under5: number;
  resp_over60: number;
  asthma: number;
  copd: number;
  cvd: number;
  death: number;
  island: string;
};

export type Summary = {
  period: { start: string; end: string; days: number };
  stations: number;
  hospitals: number;
  pm25_mean: number;
  episode_days: number;
  exceed_days: number;
  resp_total: number;
  resp_under5_total: number;
  resp_over60_total: number;
  death_total: number;
  sep_oct_resp: Record<string, number>;
  peak_day: { date: string; station_id: string; pm25: number; ispu: number; category: string } | null;
  top_episodes: { date: string; station_id: string; pm25: number; ispu: number; category: string }[];
  nationalDaily: { date: string; pm25: number | null; station_count: number }[];
};

export type Monthly = {
  national: { month: string; pm25: number; pm25_median: number; station_days: number }[];
  byIsland: { month: string; island: string; pm25: number }[];
  byStation: { month: string; station_id: string; pm25: number }[];
  health: { month: string; resp: number; cvd: number; death: number; asthma: number; copd: number; resp_under5: number; resp_over60: number }[];
};

export type Temporal = {
  hourDow: { island: string; hour: number; dow: number; pm25: number }[];
  diurnalByType: { site_type: string; hour: number; pm25: number }[];
  stationHour: { station_id: string; hour: number; pm25: number }[];
  stationHourDay: { station_id: string; hour: number; day_type: string; pm25: number }[];
};

export type Windrose = Record<
  string,
  { counts: number[][]; total: number; speed_bins: string[] }
>;

export type Correlations = {
  station: { station_id: string; temp: number | null; rh: number | null; wind: number | null; n: number }[];
  pollutants: { labels: string[]; matrix: (number | null)[][] };
  site: (number | null)[][];
  siteLabels: string[];
  siteType: { site_type: string; baseline_pm25: number }[];
};

export type Lag = {
  aggregate: { lag: number; outcome: string; raw: number | null; anomaly: number | null; n: number }[];
  byStation: { station_id: string; n: number; resp_under5: number | null; resp_over60: number | null; resp: number | null }[];
};

export type DQ = {
  qcTotals: Record<string, number>;
  rows: number;
  validRows: number;
  station: {
    station_id: string;
    rows: number;
    valid_pct: number;
    stuck_hours: number;
    stuck_ranges: { from: string; to: string; hours: number }[];
    units: Record<string, string>;
    flags: Record<string, number>;
    completeness: number;
  }[];
  completeness: { station_id: string; month: string; pct: number }[];
  exclusions: { station_id: string; from: string; to: string; reason: string }[];
  conversions: { file: string; parameter: string; from: string; factor: string }[];
};

export type Priority = {
  station_id: string;
  name: string;
  island: string;
  score: number;
  recommendation: string;
  pm25_mean: number;
  baseline_pm25: number;
  episode_days: number;
  valid_days: number;
  health_burden: number;
  completeness: number;
  pm25_mean_n: number;
  baseline_pm25_n: number;
  episode_rate_n: number;
  health_burden_n: number;
  completeness_n: number;
  redundancy: number;
};
