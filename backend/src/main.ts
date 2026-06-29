import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { db } from './db.js';
import apiRouter from './api.js';
import { getIndexer } from './indexer.js';

const app = express();
const server = createServer(app);

// ---------- CORS ----------
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// ---------- JSON Body Parser ----------
app.use(express.json({ limit: '10mb' }));

// ---------- API Routes ----------
app.use(apiRouter);

// ---------- WebSocket Server ----------
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log('[WS] Client connected. Total:', clients.size);

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WS] Client disconnected. Total:', clients.size);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
    clients.delete(ws);
  });

  // Send connection confirmation
  ws.send(JSON.stringify({ type: 'connected', data: { timestamp: new Date().toISOString() } }));
});

function broadcast(eventName: string, data: unknown): void {
  const message = JSON.stringify({ type: eventName, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // drop failed sends silently
      }
    }
  }
}

// ---------- Start ----------
async function main(): Promise<void> {
  console.log(`[Backend] Starting Hivemind Backend v0.1.0`);
  console.log(`[Backend] Chain: ${config.chainId} | RPC: ${config.rpcUrl}`);

  // Verify DB connectivity
  try {
    await db.$connect();
    console.log('[Backend] Database connected');
  } catch (err) {
    console.error('[Backend] Database connection failed:', err);
    process.exit(1);
  }

  // Set up indexer broadcast
  const indexer = getIndexer();
  indexer.setBroadcastCallback(broadcast);

  // Start indexer (non-blocking)
  indexer.startIndexer().catch((err) => {
    console.error('[Backend] Indexer error:', err);
  });

  // Start HTTP server
  server.listen(config.port, () => {
    console.log(`[Backend] API server listening on http://localhost:${config.port}`);
    console.log(`[Backend] WebSocket server on ws://localhost:${config.port}/ws`);

    // Health check endpoint for startup confirmation
    const addr = server.address();
    if (typeof addr === 'object' && addr) {
      console.log(`[Backend] Ready! http://localhost:${addr.port}/health`);
    }
  });
}

// ---------- Graceful Shutdown ----------
function shutdown(): void {
  console.log('[Backend] Shutting down gracefully...');
  indexer?.stop();
  wss.close();
  server.close(async () => {
    await db.$disconnect();
    console.log('[Backend] Shutdown complete');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('[Backend] Forced shutdown after timeout');
    process.exit(1);
  }, 5_000).unref();
}

// Handle the variable properly — it's used in shutdown
const indexer = getIndexer();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('[Backend] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Backend] Unhandled rejection:', reason);
});

main().catch((err) => {
  console.error('[Backend] Fatal startup error:', err);
  process.exit(1);
});
