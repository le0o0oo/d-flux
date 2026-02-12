import { computed, ref } from "vue";
import { startScan } from "@mnlphlp/plugin-blec";
import type { BleDevice as PluginBleDevice } from "@mnlphlp/plugin-blec";
import config from "@/config/config";

const REQUIRED_SERVICE_UUID = "db594551-159c-4da8-b59e-1c98587348e1";
const SCAN_TIMEOUT_MS = 5000;
const MOCK_SCAN_DELAY_MS = 350;

type ManufacturerDataMap = Record<
  string | number,
  number[] | Uint8Array | undefined
>;

export type BleDevice = PluginBleDevice & {
  address?: string;
  macAddress?: string;
  deviceId?: string;
  rssi?: number;
  uuids?: string[];
  serviceUuids?: string[];
  services?: string[];
  manufacturerData?: ManufacturerDataMap;
};

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

function normalizeUuid(value: string): string {
  return value.trim().toLowerCase();
}

function hasRequiredService(device: BleDevice): boolean {
  const candidates = [
    ...(device.serviceUuids ?? []),
    ...(device.uuids ?? []),
    ...(device.services ?? []),
  ].map((value) => normalizeUuid(value));

  return candidates.includes(normalizeUuid(REQUIRED_SERVICE_UUID));
}

function decodeManufacturerData(device: BleDevice): string {
  const raw = device.manufacturerData;
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

function mockManufacturerData(metadata: string): ManufacturerDataMap {
  return {
    [config.manufacturerId]: Array.from(new TextEncoder().encode(metadata)),
  };
}

function createMockDevices(): BleDevice[] {
  return [
    {
      name: "Mock Sensor A",
      address: "AA:BB:CC:DD:EE:01",
      macAddress: "AA:BB:CC:DD:EE:01",
      rssi: -58,
      serviceUuids: [REQUIRED_SERVICE_UUID],
      manufacturerData: mockManufacturerData("ID=MOCK_A;ORG=TestLab;FW=1.0.0"),
      isBonded: false,
    } as BleDevice,
    {
      name: "Mock Sensor B",
      address: "AA:BB:CC:DD:EE:02",
      macAddress: "AA:BB:CC:DD:EE:02",
      rssi: -73,
      serviceUuids: [REQUIRED_SERVICE_UUID],
      manufacturerData: mockManufacturerData("ID=MOCK_B;ORG=TestLab;FW=1.1.0"),
      isBonded: false,
    } as BleDevice,
  ];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useBleScanner() {
  const scanning = ref(false);
  const scanResults = ref<BleDevice[]>([]);
  const lastScanTime = ref<Date | null>(null);
  const isMockMode = import.meta.env.VITE_USE_MOCK === "true";

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
      if (isMockMode) {
        await wait(MOCK_SCAN_DELAY_MS);
        scanResults.value = createMockDevices();
        lastScanTime.value = new Date();
        return;
      }

      await startScan((devices: BleDevice[]) => {
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
    isMockMode,
    requiredServiceUuid: REQUIRED_SERVICE_UUID,
  };
}
