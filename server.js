/**
 * Custom Next.js server.
 *
 * Next handles every HTTP request as usual. On top of it we run a small
 * WebSocket signalling service at /ws/call, which does one job: relay WebRTC
 * offers, answers and ICE candidates between the two students in a session.
 *
 * Media never passes through here. Once the peers have exchanged candidates
 * they talk directly (or via a TURN relay, if one is configured).
 */

const crypto = require("node:crypto");
const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";

// Fail at boot, not at the first signup, if production is misconfigured.
if (!dev) {
  const secret = (process.env.SESSION_SECRET || "").trim();
  if (secret.length < 16) {
    console.error(
      "\n  SESSION_SECRET is missing or too short.\n" +
        "  Set it before starting:  fly secrets set SESSION_SECRET=\"$(openssl rand -hex 32)\"\n"
    );
    process.exit(1);
  }
}

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ---------------------------------------------------------------- tickets
// Must stay byte-for-byte compatible with src/lib/call-token.ts.
function verifyTicket(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  if (typeof token !== "string") return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(payload).digest("base64url")
  );
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString());
    return ticket.e > Date.now() ? ticket : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ rooms
/** @type {Map<string, Map<string, {socket: import('ws').WebSocket, name: string}>>} */
const rooms = new Map();

const send = (socket, message) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

function leave(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(userId);
  for (const peer of room.values()) send(peer.socket, { type: "peer-left" });
  if (room.size === 0) rooms.delete(roomId);
}

// A session only ever has two people in it.
const MAX_PER_ROOM = 2;

function join(socket, ticket) {
  const roomId = ticket.s;
  const userId = ticket.u;
  const room = rooms.get(roomId) ?? new Map();
  rooms.set(roomId, room);

  // Reconnect from the same person replaces their old socket rather than
  // filling the room with a ghost.
  const existing = room.get(userId);
  if (existing) {
    try {
      existing.socket.close(4000, "replaced by a newer connection");
    } catch {
      /* already gone */
    }
    room.delete(userId);
  }

  if (room.size >= MAX_PER_ROOM) {
    send(socket, { type: "full" });
    socket.close(4003, "room is full");
    return;
  }

  const others = [...room.entries()];
  room.set(userId, { socket, name: ticket.n });

  socket.roomId = roomId;
  socket.userId = userId;

  const peer = others[0];
  send(socket, {
    type: "joined",
    self: { id: userId, name: ticket.n },
    peer: peer ? { id: peer[0], name: peer[1].name } : null,
    // The person already waiting makes the offer; the arriver answers.
    initiator: false,
  });

  if (peer) {
    send(peer[1].socket, {
      type: "peer-joined",
      peer: { id: userId, name: ticket.n },
      initiator: true,
    });
  }
}

function relay(socket, message) {
  const room = rooms.get(socket.roomId);
  if (!room) return;
  for (const [id, peer] of room) {
    if (id !== socket.userId) send(peer.socket, message);
  }
}

// ------------------------------------------------------------------- boot
app.prepare().then(() => {
  // Only available once prepare() has resolved.
  const upgradeHandler = app.getUpgradeHandler();

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
      return;
    }
    handle(req, res, parse(req.url, true));
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  wss.on("connection", (socket, ticket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    join(socket, ticket);

    socket.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      // Only signalling traffic is relayed, and only within the room the
      // ticket admitted this socket to.
      if (["offer", "answer", "ice", "bye", "state"].includes(message?.type)) {
        relay(socket, { ...message, from: socket.userId });
      }
    });

    socket.on("close", () => leave(socket.roomId, socket.userId));
    socket.on("error", () => leave(socket.roomId, socket.userId));
  });

  server.on("upgrade", (req, socket, head) => {
    const { pathname, query } = parse(req.url, true);

    if (pathname !== "/ws/call") {
      // Next's own dev websocket (HMR) and anything else it owns.
      upgradeHandler(req, socket, head);
      return;
    }

    const ticket = verifyTicket(query.token);
    if (!ticket) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, ticket));
  });

  // Drop sockets that stopped answering, so rooms don't hold ghosts.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, 30_000);
  wss.on("close", () => clearInterval(heartbeat));

  server.listen(port, hostname, () => {
    console.info(`SkillSwap ready on http://${hostname}:${port} (signalling at /ws/call)`);
  });
});
