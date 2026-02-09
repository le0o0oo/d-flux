import { EventType } from "@/utils/connectionsManager";

export default function parsePayload(payload: string): { [key: string]: string } {
  // Payload: key1=value1;key2=value2;...
  const payloadTokens = payload.replace("\n", "").replace("\r", "").split(";");
  return payloadTokens.reduce((acc, token) => {
    const [key, value] = token.split("=");
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: string });
}