"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Lightweight WebSocket hook for the Hivemind indexer.
 *
 * Replaces heavy useReadContract chains with a single WS connection
 * that receives the full state snapshot every poll cycle.
 *
 * Usage:
 *   const { state, connected, error } = useIndexer();
 *   // state.tasks, state.agents, state.activeTasks, etc.
 */

const WS_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"
    : "";

export interface IndexerAgent {
  address: string;
  name: string;
  capabilities: string[];
  reputation: number;
  tasksCompleted: number;
  totalEarned: string;
  active: boolean;
}

export interface IndexerTask {
  id: number;
  creator: string;
  prompt: string;
  bounty: string;
  minAgents: number;
  maxAgents: number;
  minSubmissions: number;
  deadline: number;
  status: number; // 0=Open, 1=Executing, 2=Synthesizing, 3=Complete, 4=Failed
  claimedAgents: string[];
  submissionsCount: number;
  verifiedCount: number;
  isComplete: boolean;
  isActive: boolean;
  synthesis: {
    score: number;
    report: string;
    synth: string;
  } | null;
}

export interface IndexerState {
  taskCount: number;
  activeTasks: number;
  completeTasks: number;
  knownAgents: number;
  lastBlock: number;
  tasks: IndexerTask[];
  agents: IndexerAgent[];
}

interface UseIndexerReturn {
  /** Full state from the indexer, or null if not yet connected */
  state: IndexerState | null;
  /** Whether the WebSocket is connected */
  connected: boolean;
  /** Last error message, if any */
  error: string | null;
}

export function useIndexer(): UseIndexerReturn {
  const [state, setState] = useState<IndexerState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!WS_URL) {
      setError("WebSocket URL not configured");
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;
    let mounted = true;

    function connect() {
      if (!mounted) return;

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!mounted) return;
        setConnected(true);
        setError(null);
        reconnectDelay = 1000; // reset on successful connect
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "state" && msg.data) {
            setState(msg.data);
          }
        } catch {
          // skip malformed messages
        }
      };

      ws.onerror = () => {
        if (!mounted) return;
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        // Exponential backoff reconnect
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
          connect();
        }, reconnectDelay);
      };
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; // prevent reconnect on unmount
        ws.close();
      }
    };
  }, []);

  return { state, connected, error };
}

/**
 * Hook to get a single task from the indexer state.
 * Falls back to null if indexer isn't connected yet.
 */
export function useIndexedTask(taskId: number | string): {
  task: IndexerTask | null;
  connected: boolean;
} {
  const { state, connected } = useIndexer();
  const raw = state?.tasks?.find(
    (t) => t.id === Number(taskId)
  );
  return { task: raw ?? null, connected };
}

/**
 * Hook to get the activity feed (latest tasks) from the indexer.
 */
export function useIndexedActivity(limit = 12): {
  activity: IndexerTask[];
  connected: boolean;
  loading: boolean;
} {
  const { state, connected } = useIndexer();

  if (!state) {
    return { activity: [], connected: false, loading: true };
  }

  const activity = state.tasks.slice(0, limit);
  return { activity, connected, loading: false };
}
