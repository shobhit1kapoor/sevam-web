"use client";

import { useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueuedAction<TInput> = {
  id:        string;
  input:     TInput;
  createdAt: number;
};

interface UseOfflineQueueOptions<TInput> {
  /** localStorage key used to persist the queue across page reloads. */
  storageKey: string;
  /**
   * The async function to execute for each queued item when the device comes
   * back online. Return `true` on success (item removed), `false` to leave
   * the item in the queue for the next retry.
   */
  execute: (input: TInput) => Promise<boolean>;
  /**
   * Maximum number of retry attempts before the item is dropped.
   * Defaults to 3.
   */
  maxRetries?: number;
  /**
   * Called after all pending items have been processed.
   */
  onFlushComplete?: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Queues arbitrary action inputs in localStorage when the device is offline.
 * When connectivity is restored, the `execute` function is called for each
 * queued item in FIFO order.
 *
 * @example
 * const { enqueue, queueLength } = useOfflineQueue({
 *   storageKey: "sevam:location-updates",
 *   execute: async (input) => {
 *     const res = await updateWorkerLocation(input);
 *     return res.ok;
 *   },
 * });
 *
 * // Call enqueue() instead of the server action directly:
 * if (!navigator.onLine) enqueue(locationInput);
 */
export function useOfflineQueue<TInput>({
  storageKey,
  execute,
  maxRetries = 3,
  onFlushComplete,
}: UseOfflineQueueOptions<TInput>) {
  const executeRef = useRef(execute);
  executeRef.current = execute;
  const flushRef = useRef(onFlushComplete);
  flushRef.current = onFlushComplete;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const readQueue = useCallback((): Array<QueuedAction<TInput> & { retries?: number }> => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Array<QueuedAction<TInput> & { retries?: number }>) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const writeQueue = useCallback(
    (items: Array<QueuedAction<TInput> & { retries?: number }>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {
        // localStorage full or unavailable — silently drop.
      }
    },
    [storageKey],
  );

  // ── Flush ──────────────────────────────────────────────────────────────────

  const flush = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;

    const remaining: typeof queue = [];

    for (const item of queue) {
      const retries = item.retries ?? 0;
      if (retries >= maxRetries) continue; // drop exhausted items

      try {
        const ok = await executeRef.current(item.input);
        if (!ok) {
          remaining.push({ ...item, retries: retries + 1 });
        }
        // ok === true → item successfully processed, don't keep it
      } catch {
        remaining.push({ ...item, retries: retries + 1 });
      }
    }

    writeQueue(remaining);
    if (remaining.length === 0) flushRef.current?.();
  }, [readQueue, writeQueue, maxRetries]);

  // ── Listen for online events ───────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener("online", flush);
    // Also flush immediately if we're already online when the hook mounts.
    if (navigator.onLine) {
      void flush();
    }
    return () => window.removeEventListener("online", flush);
  }, [flush]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (input: TInput) => {
      const queue = readQueue();
      const item: QueuedAction<TInput> & { retries: number } = {
        id:        crypto.randomUUID(),
        input,
        createdAt: Date.now(),
        retries:   0,
      };
      writeQueue([...queue, item]);

      // If we're online, execute immediately without queuing.
      if (navigator.onLine) {
        void executeRef.current(input);
      }
    },
    [readQueue, writeQueue],
  );

  const queueLength = useCallback(() => readQueue().length, [readQueue]);

  const clearQueue = useCallback(() => writeQueue([]), [writeQueue]);

  return { enqueue, queueLength, clearQueue, flush };
}
