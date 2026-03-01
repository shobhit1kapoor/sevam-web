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
  /**
   * Called when an item is permanently dropped after exhausting all retries.
   * Use this to log, alert, or surface lost actions to the user.
   */
  onDropped?: (input: TInput, id: string) => void;
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
  onDropped,
}: UseOfflineQueueOptions<TInput>) {
  const executeRef = useRef(execute);
  executeRef.current = execute;
  const flushRef = useRef(onFlushComplete);
  flushRef.current = onFlushComplete;
  const onDroppedRef = useRef(onDropped);
  onDroppedRef.current = onDropped;

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
        for (const item of items) {
          onDroppedRef.current?.(item.input, item.id);
        }
      }
    },
    [storageKey],
  );

  // ── Flush ──────────────────────────────────────────────────────────────────

  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    // Prevent concurrent flush calls from processing the same items
    if (flushingRef.current) return;
    flushingRef.current = true;

    try {
      const queue = readQueue();
      if (queue.length === 0) return;

      const remaining: typeof queue = [];

      for (const item of queue) {
        const retries = item.retries ?? 0;
        if (retries >= maxRetries) {
          // Notify caller that an item was permanently dropped
          onDroppedRef.current?.(item.input, item.id);
          continue;
        }

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
    } finally {
      flushingRef.current = false;
    }
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
      const item: QueuedAction<TInput> & { retries: number } = {
        id:        crypto.randomUUID(),
        input,
        createdAt: Date.now(),
        retries:   0,
      };

      // If we're online, execute immediately without persisting to queue.
      // If immediate execution fails, enqueue for deferred retry.
      if (navigator.onLine) {
        void (async () => {
          try {
            const ok = await executeRef.current(input);
            if (!ok) {
              const queue = readQueue();
              writeQueue([...queue, item]);
            }
          } catch {
            const queue = readQueue();
            writeQueue([...queue, item]);
          }
        })();
        return;
      }

      const queue = readQueue();
      writeQueue([...queue, item]);
    },
    [readQueue, writeQueue],
  );

  const queueLength = useCallback(() => readQueue().length, [readQueue]);

  const clearQueue = useCallback(() => writeQueue([]), [writeQueue]);

  return { enqueue, queueLength, clearQueue, flush };
}
