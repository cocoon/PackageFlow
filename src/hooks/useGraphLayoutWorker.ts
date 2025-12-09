/**
 * useGraphLayoutWorker Hook
 * Feature: Performance optimization
 *
 * Manages the graph layout Web Worker lifecycle and communication.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { DependencyNode, DependencyEdge } from '../types/monorepo';
import type { LayoutWorkerOutput, FlowNode } from '../workers/graphLayout.worker';

interface UseGraphLayoutWorkerReturn {
  computeLayout: (
    nodes: DependencyNode[],
    edges: DependencyEdge[],
    affectedNodes?: string[]
  ) => Promise<{ flowNodes: FlowNode[]; cycleNodes: string[] }>;
}

export function useGraphLayoutWorker(): UseGraphLayoutWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingResolveRef = useRef<((result: LayoutWorkerOutput) => void) | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/graphLayout.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<LayoutWorkerOutput>) => {
      if (pendingResolveRef.current) {
        pendingResolveRef.current(event.data);
        pendingResolveRef.current = null;
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Graph layout worker error:', error);
      pendingResolveRef.current = null;
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const computeLayout = useCallback(
    (
      nodes: DependencyNode[],
      edges: DependencyEdge[],
      affectedNodes?: string[]
    ): Promise<{ flowNodes: FlowNode[]; cycleNodes: string[] }> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          // Fallback: return empty if worker not ready
          resolve({ flowNodes: [], cycleNodes: [] });
          return;
        }

        pendingResolveRef.current = resolve;
        workerRef.current.postMessage({ nodes, edges, affectedNodes });
      });
    },
    []
  );

  return { computeLayout };
}

export default useGraphLayoutWorker;
