import type { SensorData } from "@/services/ProtocolParser";
import { linearRegression } from "@/services/linearRegression";
import { getFs, type FolderRef } from "@/services/filesystem";
import type { GpsLocation } from "@/services/gpsProvider";
import config from "@/config/config";
import { useSettingsStore } from "@/stores/settingsStore";

const FILE_NAME = "flux_data.csv";

const CSV_HEADER = [
  "Timestamp",
  "Date",
  "Sensor",
  "Longitude",
  "Latitude",
  "CO₂ Slope",
  "CO₂ R²",
  "CO₂ Min",
  "CO₂ Max",
  "Temperature Min",
  "Temperature Max",
  "Humidity Min",
  "Humidity Max",
  "CO2 Multiplier",
  "CO2 Offset",
].join(",");

export interface FluxRow {
  timestamp: number;
  date: string;
  sensorName: string;
  longitude: number;
  latitude: number;
  co2Slope: number;
  co2R2: number;
  co2Min: number;
  co2Max: number;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  co2Multiplier: number;
  co2Offset: number;
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function minMax(data: SensorData[], key: "co2" | "temperature" | "humidity") {
  const vals = data.map((d) => Number(d[key])).filter(Number.isFinite);
  if (vals.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function buildFluxRow(
  data: SensorData[],
  brushSelection: [number, number],
  gpsLocation: GpsLocation,
  sensorName: string,
): FluxRow | null {
  const lo = Math.min(...brushSelection);
  const hi = Math.max(...brushSelection);

  const selected = data.filter((d) => {
    const ts = Number(d.timestamp);
    return Number.isFinite(ts) && ts >= lo && ts <= hi;
  });

  if (selected.length < 2) return null;

  const co2Points = selected
    .filter((d) => Number.isFinite(Number(d.co2)))
    .map((d) => ({ x: Number(d.timestamp), y: Number(d.co2) }));

  const regression = linearRegression(co2Points);
  if (!regression) return null;

  const co2 = minMax(selected, "co2");
  const temp = minMax(selected, "temperature");
  const hum = minMax(selected, "humidity");
  const now = new Date();
  const settingsStore = useSettingsStore();
  const co2Multiplier =
    settingsStore.deviceSettings.settings.co2CalibrationMultiplier;
  const co2Offset = settingsStore.deviceSettings.settings.co2CalibrationOffset;

  const dataLongitude = +meanOf(selected.map((d) => d.longitude ?? 0));
  const dataLatitude = +meanOf(selected.map((d) => d.latitude ?? 0));

  // Use current GPS location if data coordinates are 0,0 (no GPS fix at recording time)
  const hasValidDataCoords = dataLongitude !== 0 || dataLatitude !== 0;
  const longitude = hasValidDataCoords ? dataLongitude : gpsLocation.longitude;
  const latitude = hasValidDataCoords ? dataLatitude : gpsLocation.latitude;

  return {
    timestamp: now.getTime(),
    date: now.toISOString(),
    sensorName,
    longitude,
    latitude,
    co2Slope: +(regression.slope * 1000).toFixed(
      config.measurementCards.co2.slopePrecision,
    ),
    co2R2: regression.rSquared,
    co2Min: co2.min,
    co2Max: co2.max,
    tempMin: temp.min,
    tempMax: temp.max,
    humMin: hum.min,
    humMax: hum.max,
    co2Multiplier,
    co2Offset,
  };
}

function formatRow(row: FluxRow): string {
  return [
    row.timestamp,
    row.date,
    row.sensorName,
    row.longitude,
    row.latitude,
    row.co2Slope,
    row.co2R2,
    row.co2Min,
    row.co2Max,
    row.tempMin,
    row.tempMax,
    row.humMin,
    row.humMax,
    row.co2Multiplier,
    row.co2Offset,
  ].join(",");
}

async function appendRow(folder: FolderRef, row: FluxRow): Promise<string> {
  const fs = getFs();
  const existing = await fs.readTextFile({ folder, fileName: FILE_NAME });
  const line = formatRow(row);

  let content: string;
  if (existing?.trim()) {
    content = existing.trimEnd() + "\n" + line + "\n";
  } else {
    content = CSV_HEADER + "\n" + line + "\n";
  }

  return fs.writeTextFile({
    folder,
    fileName: FILE_NAME,
    content,
    mimeType: "text/csv",
  });
}

export async function saveFluxData(params: {
  data: SensorData[];
  brushSelection: [number, number];
  folder: FolderRef;
  gpsLocation: GpsLocation;
  sensorName: string;
}): Promise<string> {
  const { data, brushSelection, folder, gpsLocation, sensorName } = params;

  const row = buildFluxRow(data, brushSelection, gpsLocation, sensorName);
  if (!row) throw new Error("Not enough data in selection");

  return appendRow(folder, row);
}

function parseRow(line: string): FluxRow | null {
  const cols = line.split(",");
  if (cols.length < 13) return null;

  const parsedMultiplier = Number(cols[13] ?? 1);
  const parsedOffset = Number(cols[14] ?? 0);

  const row: FluxRow = {
    timestamp: Number(cols[0]),
    date: cols[1],
    sensorName: String(cols[2]),
    longitude: Number(cols[3]),
    latitude: Number(cols[4]),
    co2Slope: Number(cols[5]),
    co2R2: Number(cols[6]),
    co2Min: Number(cols[7]),
    co2Max: Number(cols[8]),
    tempMin: Number(cols[9]),
    tempMax: Number(cols[10]),
    humMin: Number(cols[11]),
    humMax: Number(cols[12]),
    co2Multiplier: Number.isFinite(parsedMultiplier) ? parsedMultiplier : 1,
    co2Offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
  };

  if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude))
    return null;

  return row;
}

export async function loadFluxData(folder: FolderRef): Promise<FluxRow[]> {
  const raw = await getFs().readTextFile({ folder, fileName: FILE_NAME });
  if (!raw) return [];

  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  return lines
    .slice(1)
    .map(parseRow)
    .filter((r): r is FluxRow => r !== null);
}
