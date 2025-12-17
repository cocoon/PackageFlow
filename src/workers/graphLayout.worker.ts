/**
 * Graph Layout Web Worker
 * Feature: Performance optimization
 *
 * Offloads heavy graph layout computation to a separate thread.
 */

import type { DependencyNode, DependencyEdge } from '../types/monorepo';

// Node data for ReactFlow
export interface GraphNodeData {
  label: string;
  type: string;
  root: string;
  tags?: string[];
  scriptsCount: number;
  isAffected?: boolean;
  isInCycle?: boolean;
  isIsolated?: boolean;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: GraphNodeData;
}

export interface LayoutWorkerInput {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  affectedNodes?: string[];
}

export interface LayoutWorkerOutput {
  flowNodes: FlowNode[];
  cycleNodes: string[];
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 100;
const MAX_NODES_PER_ROW = 5;
const ISOLATED_SECTION_GAP = 150;

/**
 * Layered layout algorithm with grid distribution
 */
function layoutNodes(
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): { flowNodes: FlowNode[]; cycleNodes: Set<string> } {
  // Build adjacency lists
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();

  nodes.forEach((node) => {
    outEdges.set(node.id, []);
    inEdges.set(node.id, []);
  });

  edges.forEach((edge) => {
    const outs = outEdges.get(edge.source) || [];
    outs.push(edge.target);
    outEdges.set(edge.source, outs);
    const ins = inEdges.get(edge.target) || [];
    ins.push(edge.source);
    inEdges.set(edge.target, ins);
  });

  // Separate isolated nodes from connected nodes
  const isolatedNodes: string[] = [];
  const connectedNodes: string[] = [];

  nodes.forEach((node) => {
    const hasConnections =
      (outEdges.get(node.id)?.length || 0) > 0 || (inEdges.get(node.id)?.length || 0) > 0;
    if (hasConnections) {
      connectedNodes.push(node.id);
    } else {
      isolatedNodes.push(node.id);
    }
  });

  // Topological sort for connected nodes
  const layers: string[][] = [];
  const assigned = new Set<string>();
  const remaining = new Set(connectedNodes);
  const cycleNodes = new Set<string>();

  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const nodeId of remaining) {
      const deps = edges.filter((e) => e.target === nodeId).map((e) => e.source);
      if (deps.every((d) => assigned.has(d) || !connectedNodes.includes(d))) {
        layer.push(nodeId);
      }
    }

    if (layer.length === 0) {
      // Circular dependency
      for (const nodeId of remaining) {
        cycleNodes.add(nodeId);
      }
      layer.push(...remaining);
      remaining.clear();
    } else {
      layer.forEach((id) => {
        remaining.delete(id);
        assigned.add(id);
      });
    }

    layers.push(layer);
  }

  // Position nodes
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const flowNodes: FlowNode[] = [];

  let currentY = 0;

  // Layout connected nodes
  layers.forEach((layer) => {
    const sortedLayer = [...layer].sort((a, b) => {
      const aConns = (outEdges.get(a)?.length || 0) + (inEdges.get(a)?.length || 0);
      const bConns = (outEdges.get(b)?.length || 0) + (inEdges.get(b)?.length || 0);
      return bConns - aConns;
    });

    const rows: string[][] = [];
    for (let i = 0; i < sortedLayer.length; i += MAX_NODES_PER_ROW) {
      rows.push(sortedLayer.slice(i, i + MAX_NODES_PER_ROW));
    }

    rows.forEach((row) => {
      const rowWidth = row.length * (NODE_WIDTH + HORIZONTAL_GAP);
      const startX = -(rowWidth / 2) + NODE_WIDTH / 2;

      row.forEach((nodeId, nodeIndex) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          flowNodes.push({
            id: node.id,
            type: 'packageNode',
            position: {
              x: startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP),
              y: currentY,
            },
            data: {
              label: node.name,
              type: node.type,
              root: node.root,
              tags: node.tags,
              scriptsCount: node.scriptsCount,
              isInCycle: cycleNodes.has(node.id),
            },
          });
        }
      });

      currentY += NODE_HEIGHT + VERTICAL_GAP;
    });
  });

  // Layout isolated nodes
  if (isolatedNodes.length > 0) {
    currentY += ISOLATED_SECTION_GAP;

    const sortedIsolated = [...isolatedNodes].sort((a, b) => {
      const nodeA = nodeMap.get(a);
      const nodeB = nodeMap.get(b);
      return (nodeA?.name || '').localeCompare(nodeB?.name || '');
    });

    const rows: string[][] = [];
    for (let i = 0; i < sortedIsolated.length; i += MAX_NODES_PER_ROW) {
      rows.push(sortedIsolated.slice(i, i + MAX_NODES_PER_ROW));
    }

    rows.forEach((row) => {
      const rowWidth = row.length * (NODE_WIDTH + HORIZONTAL_GAP);
      const startX = -(rowWidth / 2) + NODE_WIDTH / 2;

      row.forEach((nodeId, nodeIndex) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          flowNodes.push({
            id: node.id,
            type: 'packageNode',
            position: {
              x: startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP),
              y: currentY,
            },
            data: {
              label: node.name,
              type: node.type,
              root: node.root,
              tags: node.tags,
              scriptsCount: node.scriptsCount,
              isInCycle: false,
              isIsolated: true,
            },
          });
        }
      });

      currentY += NODE_HEIGHT + VERTICAL_GAP;
    });
  }

  return { flowNodes, cycleNodes };
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<LayoutWorkerInput>) => {
  const { nodes, edges, affectedNodes } = event.data;

  const { flowNodes, cycleNodes } = layoutNodes(nodes, edges);

  // Mark affected nodes
  if (affectedNodes && affectedNodes.length > 0) {
    const affectedSet = new Set(affectedNodes);
    flowNodes.forEach((node) => {
      if (affectedSet.has(node.id)) {
        node.data.isAffected = true;
      }
    });
  }

  const output: LayoutWorkerOutput = {
    flowNodes,
    cycleNodes: Array.from(cycleNodes),
  };

  self.postMessage(output);
};

export {};
