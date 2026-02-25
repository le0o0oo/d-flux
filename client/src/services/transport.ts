import type { BleDevice as PluginBleDevice } from "@mnlphlp/plugin-blec";
import config from "@/config/config";

// ─── Shared types ───────────────────────────────────────────────────────────

export type ManufacturerDataMap = Record<
  string | number,
  number[] | Uint8Array | undefined
>;

/**
 * Extended BLE device type that covers fields from various platforms.
 * The plugin's BleDevice has `name`, `address`, `isBonded` as required,
 * plus optional `serviceData`, `manufacturerData`, `rssi`.
 * We extend with additional optional fields used across platforms.
 */
export type BleDevice = PluginBleDevice & {
  macAddress?: string;
  deviceId?: string;
  uuids?: string[];
  serviceUuids?: string[];
  services?: string[];
  manufacturerData?: ManufacturerDataMap;
};

// ─── Transport interfaces ───────────────────────────────────────────────────

export interface ConnectParams {
  address: string;
  deviceName?: string;
  onDisconnect: () => void;
  onData: (chunk: string) => void;
}

export interface BleTransport {
  connect(params: ConnectParams): Promise<void>;
  send(message: string): Promise<void>;
  disconnect(): Promise<void>;
}

export interface ScanProvider {
  scan(
    onResults: (devices: BleDevice[]) => void,
    timeoutMs: number
  ): Promise<void>;
}

// ─── Factory (lazy singletons) ──────────────────────────────────────────────

import { MockBleTransport, MockScanProvider } from "./mockBleTransport";
import { RealBleTransport, RealScanProvider } from "./realBleTransport";

let _transport: BleTransport | null = null;
let _scanner: ScanProvider | null = null;

export function getTransport(): BleTransport {
  if (!_transport) {
    _transport = config.isMockMode
      ? new MockBleTransport()
      : new RealBleTransport();
  }
  return _transport;
}

export function getScanner(): ScanProvider {
  if (!_scanner) {
    _scanner = config.isMockMode
      ? new MockScanProvider()
      : new RealScanProvider();
  }
  return _scanner;
}
