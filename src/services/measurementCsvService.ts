import type { SensorData } from "@/services/ProtocolParser";
import { getFs } from "@/services/filesystem";

type Stats = { avg: number | null; min: number | null; max: number | null };

function formatDatePart(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFilePart(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "") || "sensor"
  );
}

function formatStatValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return "";
  return Number(value.toFixed(2));
}

function calculateStats(
  rows: SensorData[],
  picker: (row: SensorData) => number | undefined
): Stats {
  const values = rows
    .map(picker)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );
  if (values.length === 0) {
    return { avg: null, min: null, max: null };
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function buildCsvContent(rows: SensorData[], sensorName: string) {
  const startTs = rows[0].timestamp;
  const endTs = rows[rows.length - 1].timestamp;
  const co2Stats = calculateStats(rows, (row) => row.co2);
  const temperatureStats = calculateStats(rows, (row) => row.temperature);
  const humidityStats = calculateStats(rows, (row) => row.humidity);

  const metadataRows = [
    ["Metadata", "Value"],
    ["Sensor", sensorName],
    ["Session Start", new Date(startTs).toISOString()],
    ["Session End", new Date(endTs).toISOString()],
    ["Samples", rows.length],
    ["Avg CO2 (ppm)", formatStatValue(co2Stats.avg)],
    ["Min CO2 (ppm)", formatStatValue(co2Stats.min)],
    ["Max CO2 (ppm)", formatStatValue(co2Stats.max)],
    ["Avg Temperature (C)", formatStatValue(temperatureStats.avg)],
    ["Min Temperature (C)", formatStatValue(temperatureStats.min)],
    ["Max Temperature (C)", formatStatValue(temperatureStats.max)],
    ["Avg Humidity (%)", formatStatValue(humidityStats.avg)],
    ["Min Humidity (%)", formatStatValue(humidityStats.min)],
    ["Max Humidity (%)", formatStatValue(humidityStats.max)],
  ].map((row) => row.join(","));

  const headers = [
    "Timestamp",
    "Date",
    "CO2 (ppm)",
    "Temperature (C)",
    "Humidity (%)",
  ];
  const csvRows = rows.map((row) => {
    const dateStr = new Date(row.timestamp).toISOString();
    return [
      row.timestamp,
      dateStr,
      row.co2 ?? "",
      row.temperature ?? "",
      row.humidity ?? "",
    ].join(",");
  });

  return [...metadataRows, "", headers.join(","), ...csvRows].join("\n");
}

export async function saveMeasurementsCsv(params: {
  rows: SensorData[];
  sensorName: string;
  folderPath: string;
  folderUri?: import("tauri-plugin-android-fs-api").AndroidFsUri | null;
}) {
  const { rows, sensorName, folderPath, folderUri } = params;
  if (rows.length === 0) return null;
  if (!folderPath) return null;

  const datePart = formatDatePart(rows[0].timestamp || Date.now());
  const sensorPart = sanitizeFilePart(sensorName);
  const fileName = `${datePart}-${sensorPart}-1.csv`;
  const csvContent = buildCsvContent(rows, sensorName);

  return getFs().saveTextFile({
    folder: { path: folderPath, uri: folderUri ?? null },
    fileName,
    content: csvContent,
    mimeType: "text/csv",
    // subfolder: "Measurements",
    deduplicate: true,
  });
}
