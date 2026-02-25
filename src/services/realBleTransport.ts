import {
  connect as bleConnect,
  disconnect as bleDisconnect,
  getConnectionUpdates,
  listServices,
  sendString,
  startScan,
  subscribeString,
  unsubscribe,
  type BleService,
} from "@mnlphlp/plugin-blec";
import { REQUIRED_SERVICE_UUID, normalizeUuid } from "@/services/bleConstants";
import type {
  BleDevice,
  BleTransport,
  ConnectParams,
  ScanProvider,
} from "@/services/transport";
import { ProtocolCommandType } from "./ProtocolParser";

// ─── BLE characteristic constants ───────────────────────────────────────────

const PROP_WRITE = 0x08;
const PROP_WRITE_WITHOUT_RESPONSE = 0x04;
const PROP_NOTIFY = 0x10;
const PROP_INDICATE = 0x20;

const KNOWN_WRITE_UUID = "7b6b12cd-ca54-46a6-b3f4-3a848a3ed00b";
const KNOWN_NOTIFY_UUID = "907bac5d-92ed-4d90-905e-a3a7b9899f21";

type CharacteristicRef = {
  characteristic: string;
  service?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function hasAnyProperty(value: number, flags: number[]): boolean {
  return flags.some((flag) => (value & flag) === flag);
}

function resolveCharacteristics(services: BleService[]): {
  write: CharacteristicRef | null;
  notify: CharacteristicRef | null;
} {
  const normalizedRequiredService = normalizeUuid(REQUIRED_SERVICE_UUID);
  const targetService = services.find(
    (s) => normalizeUuid(s.uuid) === normalizedRequiredService,
  );
  if (!targetService) return { write: null, notify: null };

  let write: CharacteristicRef | null = null;
  let notify: CharacteristicRef | null = null;

  for (const characteristic of targetService.characteristics) {
    const uuid = normalizeUuid(characteristic.uuid);
    if (uuid === KNOWN_WRITE_UUID) {
      write = {
        characteristic: characteristic.uuid,
        service: targetService.uuid,
      };
    }
    if (uuid === KNOWN_NOTIFY_UUID) {
      notify = {
        characteristic: characteristic.uuid,
        service: targetService.uuid,
      };
    }
  }

  // Fallback to property-based detection (works on desktop)
  if (!write || !notify) {
    for (const characteristic of targetService.characteristics) {
      if (
        !notify &&
        hasAnyProperty(characteristic.properties, [PROP_NOTIFY, PROP_INDICATE])
      ) {
        notify = {
          characteristic: characteristic.uuid,
          service: targetService.uuid,
        };
      }
      if (
        !write &&
        hasAnyProperty(characteristic.properties, [
          PROP_WRITE,
          PROP_WRITE_WITHOUT_RESPONSE,
        ])
      ) {
        write = {
          characteristic: characteristic.uuid,
          service: targetService.uuid,
        };
      }
    }
  }

  return { write, notify };
}

// ─── Real BLE transport ─────────────────────────────────────────────────────

export class RealBleTransport implements BleTransport {
  private listenersBound = false;
  private connected = false;
  private writeCharacteristic: string | null = null;
  private notifyCharacteristic: string | null = null;
  private currentOnDisconnect: (() => void) | null = null;

  private fireDisconnect() {
    if (!this.connected) return;
    this.connected = false;
    const cb = this.currentOnDisconnect;
    this.currentOnDisconnect = null;
    cb?.();
  }

  async connect(params: ConnectParams): Promise<void> {
    // Clean up stale state from any previous connection
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.connected = false;
    this.currentOnDisconnect = params.onDisconnect;

    // Bind global connection listener once
    if (!this.listenersBound) {
      this.listenersBound = true;
      await getConnectionUpdates((connected) => {
        if (!connected) this.fireDisconnect();
      });
    }

    await bleConnect(params.address, () => {
      this.fireDisconnect();
    });

    // Connection is now established -- disconnects from this point are real
    this.connected = true;

    const servicesResult = await listServices(params.address);
    const services = Array.isArray(servicesResult) ? servicesResult : [];

    const { write, notify } = resolveCharacteristics(services);
    if (!write || !notify) {
      throw new Error("Unable to find BLE read/write characteristics");
    }

    this.writeCharacteristic = write.characteristic;
    this.notifyCharacteristic = notify.characteristic;

    await subscribeString(this.notifyCharacteristic, (data: string) => {
      params.onData(data);
    });
    await this.send(ProtocolCommandType.GET_SETTINGS);
  }

  async send(message: string): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error("Not connected: no write characteristic");
    }
    await sendString(this.writeCharacteristic, message, "withoutResponse");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await this.send(ProtocolCommandType.DISCONNECT);

    try {
      if (this.notifyCharacteristic) {
        await unsubscribe(this.notifyCharacteristic);
      }
    } catch {
      // best-effort unsubscribe
    }

    try {
      await bleDisconnect();
    } finally {
      this.writeCharacteristic = null;
      this.notifyCharacteristic = null;
    }
  }
}

// ─── Real scan provider ─────────────────────────────────────────────────────

export class RealScanProvider implements ScanProvider {
  async scan(
    onResults: (devices: BleDevice[]) => void,
    timeoutMs: number,
  ): Promise<void> {
    await startScan((devices) => {
      onResults(devices as BleDevice[]);
    }, timeoutMs);
  }
}
