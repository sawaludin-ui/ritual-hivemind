// @ts-check
import { WebSocketServer as WSS } from "ws";

/**
 * Lightweight WebSocket server.
 * Pushes real-time state updates to connected frontend clients.
 */

export class WebSocketServer {
  /** @type {number} */
  port;
  /** @type {import("ws").WebSocketServer|null} */
  wss;
  /** @type {Set<import("ws").WebSocket>} */
  clients;

  constructor(port = 3001) {
    this.port = port;
    this.wss = null;
    this.clients = new Set();
    this.start();
  }

  start() {
    this.wss = new WSS({ port: this.port });
    console.log(`   🔌 WebSocket server on ws://localhost:${this.port}`);

    this.wss.on("connection", (ws, req) => {
      this.clients.add(ws);
      const ip = req.socket.remoteAddress ?? "unknown";

      // Send initial state on connect
      ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", () => {
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast a message to all connected clients.
   * Silently drops dead connections.
   */
  broadcast(message) {
    if (!this.wss || this.clients.size === 0) return;

    const dead = /** @type {Set<import("ws").WebSocket>} */ (new Set());
    for (const ws of this.clients) {
      try {
        ws.send(message);
      } catch {
        dead.add(ws);
      }
    }

    for (const ws of dead) {
      this.clients.delete(ws);
    }
  }

  /**
   * Send a message to a specific client.
   */
  send(ws, message) {
    try {
      ws.send(message);
    } catch {
      this.clients.delete(ws);
    }
  }

  close() {
    if (this.wss) {
      this.wss.close();
      console.log("   🔌 WebSocket server closed");
    }
  }
}
