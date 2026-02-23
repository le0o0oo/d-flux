import {
  ProtocolCommandType,
  ProtocolEventType,
} from "@/services/ProtocolParser";
import { REQUIRED_SERVICE_UUID } from "@/services/bleConstants";
import config from "@/config/config";
import type {
  BleDevice,
  BleTransport,
  ConnectParams,
  ManufacturerDataMap,
  ScanProvider,
} from "@/services/transport";

// ─── Mock BLE transport ─────────────────────────────────────────────────────

export class MockBleTransport implements BleTransport {
  private onData: ((chunk: string) => void) | null = null;
  private streamingTimer: ReturnType<typeof setInterval> | null = null;
  private acquiring = false;

  async connect(params: ConnectParams): Promise<void> {
    this.stopStreaming();
    this.onData = params.onData;

    const id = params.address || "MOCK";
    const name = params.deviceName || "Mock Sensor";
    this.emit(`WHOIS ID=${id};NAME=${name};ORG=TestLab;FW=1.0.0`);
    this.emit("ACQUISITION_STATE 0");
  }

  async send(message: string): Promise<void> {
    const trimmed = message.trim();

    if (trimmed.startsWith(ProtocolCommandType.START_ACQUISITION)) {
      this.startStreaming();
      this.emit("ACQUISITION_STATE 1");
    } else if (trimmed.startsWith(ProtocolCommandType.STOP_ACQUISITION)) {
      this.stopStreaming();
      this.emit("ACQUISITION_STATE 0");
    } else if (trimmed.startsWith(ProtocolCommandType.GET_ACQUISITION_STATE)) {
      this.emit(`ACQUISITION_STATE ${this.acquiring ? "1" : "0"}`);
    } else if (trimmed.startsWith(ProtocolCommandType.GET_SETTINGS)) {
      this.emit(`${ProtocolEventType.SETTINGS} multiplier=1.0;offset=0.0`);
    }
  }

  async disconnect(): Promise<void> {
    this.stopStreaming();
    this.onData = null;
  }

  private emit(line: string) {
    this.onData?.(`${line}\n`);
  }

  private startStreaming() {
    this.stopStreaming();
    this.acquiring = true;

    this.streamingTimer = setInterval(() => {
      const co2 = (400 + Math.random() * 200).toFixed(1);
      const temp = (22 + Math.random() * 3).toFixed(1);
      const hum = (40 + Math.random() * 8).toFixed(1);
      this.emit(`DATA CO2=${co2};TMP=${temp};HUM=${hum}`);
    }, 1000);
  }

  private stopStreaming() {
    if (this.streamingTimer) {
      clearInterval(this.streamingTimer);
      this.streamingTimer = null;
    }
    this.acquiring = false;
  }
}

// ─── Mock scan provider ─────────────────────────────────────────────────────

const MOCK_SCAN_DELAY_MS = 350;

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

export class MockScanProvider implements ScanProvider {
  async scan(
    onResults: (devices: BleDevice[]) => void,
    _timeoutMs: number,
  ): Promise<void> {
    await wait(MOCK_SCAN_DELAY_MS);
    onResults(createMockDevices());
  }
}
