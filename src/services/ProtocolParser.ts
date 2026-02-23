export enum ProtocolEventType {
  WHOIS = "WHOIS",
  DATA = "DATA",
  ACQUISITION_STATE = "ACQUISITION_STATE",
  ERROR = "ERROR",
  SETTINGS = "SETTINGS",
}

export enum ProtocolCommandType {
  START_ACQUISITION = "START_ACQUISITION",
  STOP_ACQUISITION = "STOP_ACQUISITION",
  GET_ACQUISITION_STATE = "GET_ACQUISITION_STATE",
  WHOIS = "WHOIS",
  DISCONNECT = "DISCONNECT",
  GET_SETTINGS = "GET_SETTINGS",
  SET_SETTINGS = "SET_SETTINGS",
}

export interface SensorData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  co2?: number;
  temperature?: number;
  humidity?: number;
  timestamp: number;
}

export interface DeviceSettings {
  co2Offset: number;
  co2Multiplier: number;
}

export class ProtocolParser {
  /**
   * Parses a raw line from the device protocol stream.
   * Expected format: "EVENT_TYPE PAYLOAD"
   */
  static parseLine(
    line: string,
  ): { type: ProtocolEventType; payload: string } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(" ");
    const typeStr = parts[0];
    const payload = parts.slice(1).join(" ");

    if (
      Object.values(ProtocolEventType).includes(typeStr as ProtocolEventType)
    ) {
      return { type: typeStr as ProtocolEventType, payload };
    }

    console.warn(`Unknown event type received: ${typeStr}`);
    return null;
  }

  /**
   * Parses the payload for DATA events.
   * Expected format: "key1=value1;key2=value2;..."
   * Example: "CO2=400;TMP=24.5;HUM=40"
   */
  static parseDataPayload(payload: string): SensorData {
    const tokens = payload.split(";");
    const data: any = {
      timestamp: Date.now(),
    };

    tokens.forEach((token) => {
      const [key, value] = token.split("=");
      if (!key || !value) return;

      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;

      switch (key) {
        case "CO2":
          data.co2 = numValue;
          break;
        case "TMP":
          data.temperature = numValue;
          break;
        case "HUM":
          data.humidity = numValue;
          break;
      }
    });

    return data as SensorData;
  }

  static parseSettingsPayload(payload: string): DeviceSettings {
    const tokens = payload.split(";");
    const data = {
      co2Offset: 0,
      co2Multiplier: 1,
    };

    tokens.forEach((token) => {
      const [key, value] = token.split("=");
      if (!key || !value) return;

      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;

      switch (key) {
        case "multiplier":
          data.co2Multiplier = numValue;
          break;
        case "offset":
          data.co2Offset = numValue;
          break;
      }
    });

    return data;
  }
}
