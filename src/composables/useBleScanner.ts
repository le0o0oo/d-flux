import { computed, ref } from "vue";
import config from "@/config/config";
import { REQUIRED_SERVICE_UUID, normalizeUuid } from "@/services/bleConstants";
import {
  getScanner,
  type BleDevice,
  type ManufacturerDataMap,
} from "@/services/transport";

export type { BleDevice } from "@/services/transport";

const SCAN_TIMEOUT_MS = 5000;

export type ParsedBleDevice = {
  key: string;
  device: BleDevice;
  name: string;
  macAddress: string;
  rssi?: number;
  metadata: {
    id?: string;
    organization?: string;
    firmware?: string;
  };
};

function hasRequiredService(device: BleDevice): boolean {
  const candidates = [
    ...(device.serviceUuids ?? []),
    ...(device.uuids ?? []),
    ...(device.services ?? []),
  ].map((value) => normalizeUuid(value));

  return candidates.includes(normalizeUuid(REQUIRED_SERVICE_UUID));
}

function decodeManufacturerData(device: BleDevice): string {
  const raw = device.manufacturerData as ManufacturerDataMap | undefined;
  if (!raw) return "";

  const bytes =
    raw[config.manufacturerId] ?? raw[String(config.manufacturerId)];
  if (!bytes || bytes.length === 0) return "";

  try {
    return new TextDecoder()
      .decode(Uint8Array.from(bytes))
      .replace(/\0/g, "")
      .trim();
  } catch {
    return "";
  }
}

function parseMetadata(device: BleDevice): ParsedBleDevice["metadata"] {
  const metadataString = decodeManufacturerData(device);
  if (!metadataString) return {};

  const pairs = metadataString
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const map: Record<string, string> = {};

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = pair.slice(0, separatorIndex).trim().toUpperCase();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!value) continue;
    map[key] = value;
  }

  return {
    id: map.ID ?? map.I,
    organization: map.ORG ?? map.O,
    firmware: map.FW ?? map.F,
  };
}

function getDeviceAddress(device: BleDevice): string {
  return (
    device.address ?? device.macAddress ?? device.deviceId ?? "Unknown address"
  );
}

function getDeviceName(device: BleDevice): string {
  return device.name?.trim() || "Unknown BLE device";
}

function getDeviceKey(device: BleDevice): string {
  return `${getDeviceAddress(device)}|${getDeviceName(device)}`;
}

export function useBleScanner() {
  const scanning = ref(false);
  const scanResults = ref<BleDevice[]>([]);
  const lastScanTime = ref<Date | null>(null);

  const devices = computed<ParsedBleDevice[]>(() => {
    const strongestByKey = new Map<string, BleDevice>();

    for (const device of scanResults.value) {
      if (!hasRequiredService(device)) continue;

      const key = getDeviceKey(device);
      const existing = strongestByKey.get(key);
      if (!existing) {
        strongestByKey.set(key, device);
        continue;
      }

      const existingRssi = existing.rssi ?? -999;
      const currentRssi = device.rssi ?? -999;
      if (currentRssi > existingRssi) {
        strongestByKey.set(key, device);
      }
    }

    return Array.from(strongestByKey.values()).map((device) => ({
      key: getDeviceKey(device),
      device,
      name: getDeviceName(device),
      macAddress: getDeviceAddress(device),
      rssi: device.rssi,
      metadata: parseMetadata(device),
    }));
  });

  async function runScan() {
    if (scanning.value) return;
    scanning.value = true;

    try {
      await getScanner().scan((devices) => {
        scanResults.value = devices;
        lastScanTime.value = new Date();
      }, SCAN_TIMEOUT_MS);
    } finally {
      scanning.value = false;
    }
  }

  return {
    scanning,
    devices,
    lastScanTime,
    runScan,
    isMockMode: config.isMockMode,
    requiredServiceUuid: REQUIRED_SERVICE_UUID,
  };
}
