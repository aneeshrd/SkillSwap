import crypto from "node:crypto";
import { appSecret } from "./secret";

/**
 * A short-lived, signed ticket that lets the WebSocket signalling server admit
 * someone to a call without sharing a database connection or session cookie
 * with the Next.js app. The app mints it; `server.js` verifies the same way.
 *
 * It carries no secret of its own — it only asserts "the app says this user
 * may join this room", and it expires in two minutes.
 */

const TTL_MS = 2 * 60 * 1000;

export interface CallTicket {
  /** session id — doubles as the room name */
  s: string;
  /** user id */
  u: string;
  /** display name shown to the other participant */
  n: string;
  /** expiry, ms since epoch */
  e: number;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

function sign(payload: string): string {
  return crypto.createHmac("sha256", appSecret()).update(payload).digest("base64url");
}

export function mintCallToken(ticket: Omit<CallTicket, "e">): string {
  const payload = b64url(JSON.stringify({ ...ticket, e: Date.now() + TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function readCallToken(token: string): CallTicket | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString()) as CallTicket;
    return ticket.e > Date.now() ? ticket : null;
  } catch {
    return null;
  }
}

/** ICE servers for the browser. STUN alone fails on restrictive networks. */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  const turnUrl = process.env.TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME ?? "",
      credential: process.env.TURN_CREDENTIAL ?? "",
    });
  }

  return servers;
}

export const hasTurn = (): boolean => Boolean(process.env.TURN_URL?.trim());

/**
 * When a call room is open: from 15 minutes before the slot until two hours
 * after it was due to end. Outside that window the page explains why.
 */
export function callWindow(scheduledAt: string, durationMinutes: number) {
  const start = new Date(scheduledAt).getTime();
  const opens = start - 15 * 60_000;
  const closes = start + durationMinutes * 60_000 + 2 * 60 * 60_000;
  const now = Date.now();
  return { opens, closes, isOpen: now >= opens && now <= closes, tooEarly: now < opens };
}
