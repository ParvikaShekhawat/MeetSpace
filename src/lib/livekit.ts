import { AccessToken } from "livekit-server-sdk";

export function isLiveKitConfigured(): boolean {
  return !!(
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    process.env.LIVEKIT_URL
  );
}

export async function createLiveKitToken(
  roomName: string,
  participantName: string,
  participantIdentity: string
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "2h",
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

export function getLiveKitUrl(): string | null {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || null;
}
