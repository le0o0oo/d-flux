import type { SensorData } from "@/services/ProtocolParser";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

type Stats = { avg: number | null; min: number | null; max: number | null };

function formatDatePart(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "") || "sensor";
}

function formatStatValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return "";
  return Number(value.toFixed(2));
}

function calculateStats(rows: SensorData[], picker: (row: SensorData) => number | undefined): Stats {
  const values = rows
    .map(picker)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
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

  const headers = ["Timestamp", "Date", "CO2 (ppm)", "Temperature (C)", "Humidity (%)"];
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

async function getNextCsvFilePath(folderPath: string, datePart: string, sensorPart: string) {
  let index = 1;
  while (true) {
    const fileName = `${datePart}-${sensorPart}-${index}.csv`;
    const filePath = await join(folderPath, fileName);
    if (!(await exists(filePath))) {
      return filePath;
    }
    index += 1;
  }
}

export async function saveMeasurementsCsv(params: {
  rows: SensorData[];
  sensorName: string;
  folderPath: string;
}) {
  const { rows, sensorName, folderPath } = params;
  if (rows.length === 0) return null;
  if (!folderPath) return null;

  if (!(await exists(folderPath))) {
    await mkdir(folderPath, { recursive: true });
  }

  const datePart = formatDatePart(rows[0].timestamp || Date.now());
  const sensorPart = sanitizeFilePart(sensorName);
  const filePath = await getNextCsvFilePath(folderPath, datePart, sensorPart);
  const csvContent = buildCsvContent(rows, sensorName);
  await writeTextFile(filePath, csvContent);
  return filePath;
}
