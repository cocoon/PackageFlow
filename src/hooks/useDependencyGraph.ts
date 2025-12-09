/**
 * useDependencyGraph Hook
 * Feature: 008-monorepo-support
 *
 * Hook for fetching and transforming dependency graph data for visualization.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { monorepoAPI } from '../lib/tauri-api';
import type { DependencyGraph, DependencyEdge, MonorepoToolType } from '../types/monorepo';
import type { Node, Edge } from '@xyflow/react';
import { useGraphLayoutWorker } from './useGraphLayoutWorker';
import type { FlowNode } from '../workers/graphLayout.worker';

// Node data for ReactFlow - needs index signature for Record<string, unknown> compatibility
export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  root: string;
  tags?: string[];
  scriptsCount: number;
  isAffected?: boolean;
  isInCycle?: boolean;
  isIsolated?: boolean;
}

export interface UseDependencyGraphState {
  /** Whether the graph is being loaded */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Raw dependency graph data */
  graph: DependencyGraph | null;
  /** ReactFlow nodes */
  nodes: Node<GraphNodeData>[];
  /** ReactFlow edges */
  edges: Edge[];
  /** Selected node ID */
  selectedNodeId: string | null;
  /** Highlighted node IDs (dependencies of selected node) */
  highlightedNodeIds: Set<string>;
}

export interface UseDependencyGraphActions {
  /** Refresh the dependency graph */
  refresh: () => Promise<void>;
  /** Select a node */
  selectNode: (nodeId: string | null) => void;
  /** Highlight upstream dependencies */
  highlightUpstream: (nodeId: string) => void;
  /** Highlight downstream dependencies */
  highlightDownstream: (nodeId: string) => void;
  /** Clear highlights */
  clearHighlights: () => void;
}

export type UseDependencyGraphReturn = UseDependencyGraphState & UseDependencyGraphActions;

/**
 * Convert FlowNode from worker to ReactFlow Node
 */
function convertToReactFlowNodes(flowNodes: FlowNode[]): Node<GraphNodeData>[] {
  return flowNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data as GraphNodeData,
  }));
}

/**
 * Transform edges for ReactFlow
 */
function transformEdges(edges: DependencyEdge[]): Edge[] {
  return edges.map((edge, index) => ({
    id: `e-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.type === 'dynamic',
    style: {
      stroke: edge.type === 'implicit' ? '#6b7280' : '#3b82f6',
      strokeDasharray: edge.type === 'implicit' ? '5,5' : undefined,
    },
  }));
}

/**
 * Hook for dependency graph visualization
 *
 * @param projectPath - The path to the project
 * @param tool - The monorepo tool type
 * @returns State and actions for dependency graph
 */
export function useDependencyGraph(
  projectPath: string | null,
  tool: MonorepoToolType | null
): UseDependencyGraphReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Track layout computation to avoid race conditions
  const layoutVersionRef = useRef(0);

  // Web Worker for async layout computation
  const { computeLayout } = useGraphLayoutWorker();

  // Fetch graph data
  const refresh = useCallback(async () => {
    if (!projectPath || !tool || tool === 'unknown') {
      setGraph(null);
      setNodes([]);
      setEdges([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await monorepoAPI.getDependencyGraph({
        projectPath,
        tool,
      });

      if (response.success && response.graph) {
        setGraph(response.graph);
      } else {
        setError(response.error || 'Failed to load dependency graph');
        setGraph(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGraph(null);
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath, tool]);

  // Load graph when project/tool changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Compute layout asynchronously using Web Worker
  useEffect(() => {
    if (!graph) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const currentVersion = ++layoutVersionRef.current;

    // Compute layout in Web Worker (non-blocking)
    computeLayout(graph.nodes, graph.edges, graph.affectedNodes)
      .then(({ flowNodes }) => {
        // Only update if this is still the latest computation
        if (layoutVersionRef.current === currentVersion) {
          setNodes(convertToReactFlowNodes(flowNodes));
          setEdges(transformEdges(graph.edges));
        }
      })
      .catch((err) => {
        console.error('Layout computation failed:', err);
      });
  }, [graph, computeLayout]);

  // Select node
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Highlight upstream dependencies
  const highlightUpstream = useCallback(
    (nodeId: string) => {
      if (!graph) return;

      const upstream = new Set<string>();
      const queue = [nodeId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const dependencies = graph.edges
          .filter((e) => e.target === current)
          .map((e) => e.source);

        dependencies.forEach((dep) => {
          if (!upstream.has(dep)) {
            upstream.add(dep);
            queue.push(dep);
          }
        });
      }

      setHighlightedNodeIds(upstream);
    },
    [graph]
  );

  // Highlight downstream dependencies
  const highlightDownstream = useCallback(
    (nodeId: string) => {
      if (!graph) return;

      const downstream = new Set<string>();
      const queue = [nodeId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const dependents = graph.edges
          .filter((e) => e.source === current)
          .map((e) => e.target);

        dependents.forEach((dep) => {
          if (!downstream.has(dep)) {
            downstream.add(dep);
            queue.push(dep);
          }
        });
      }

      setHighlightedNodeIds(downstream);
    },
    [graph]
  );

  // Clear highlights
  const clearHighlights = useCallback(() => {
    setHighlightedNodeIds(new Set());
  }, []);

  return {
    // State
    loading,
    error,
    graph,
    nodes,
    edges,
    selectedNodeId,
    highlightedNodeIds,
    // Actions
    refresh,
    selectNode,
    highlightUpstream,
    highlightDownstream,
    clearHighlights,
  };
}

export default useDependencyGraph;
