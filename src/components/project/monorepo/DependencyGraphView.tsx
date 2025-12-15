/**
 * DependencyGraphView Component
 * Feature: 008-monorepo-support
 *
 * Visualizes package dependencies using @xyflow/react.
 */

import { useCallback, memo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Package,
  Box,
  TestTube2,
  Layers,
  RefreshCw,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useDependencyGraph, type GraphNodeData } from '../../../hooks/useDependencyGraph';
import type { MonorepoToolType } from '../../../types/monorepo';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface DependencyGraphViewProps {
  projectPath: string;
  tool: MonorepoToolType;
  onClose?: () => void;
}

// Custom node component for package display
const PackageNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as GraphNodeData;
  const typeIcon = {
    application: <Box className="w-4 h-4" />,
    library: <Layers className="w-4 h-4" />,
    e2e: <TestTube2 className="w-4 h-4" />,
    package: <Package className="w-4 h-4" />,
  }[nodeData.type] || <Package className="w-4 h-4" />;

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg border-2 min-w-[160px] transition-all',
        nodeData.isIsolated ? 'bg-secondary/60' : 'bg-secondary',
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : nodeData.isIsolated
          ? 'border-border border-dashed'
          : 'border-border',
        nodeData.isAffected && 'ring-2 ring-amber-500/50',
        nodeData.isInCycle && 'ring-2 ring-red-500/50 border-red-500/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      <div className="flex items-center gap-2">
        <div
          className={cn(
            nodeData.isIsolated ? 'text-muted-foreground' : 'text-muted-foreground',
            nodeData.isAffected && 'text-amber-400',
            nodeData.isInCycle && 'text-red-400'
          )}
        >
          {typeIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-sm font-medium truncate',
            nodeData.isIsolated ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {nodeData.label}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{nodeData.root}</div>
        </div>
        {nodeData.isInCycle && (
          <span title="Circular dependency">
            <RefreshCw className="w-3 h-3 text-red-400" />
          </span>
        )}
      </div>

      {nodeData.tags && nodeData.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {nodeData.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1 py-0.5 text-[9px] bg-border text-muted-foreground rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
    </div>
  );
});

PackageNode.displayName = 'PackageNode';

const nodeTypes = {
  packageNode: PackageNode,
};

export function DependencyGraphView({
  projectPath,
  tool,
  onClose,
}: DependencyGraphViewProps) {
  const {
    loading,
    error,
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId,
    highlightedNodeIds,
    refresh,
    selectNode,
    highlightUpstream,
    highlightDownstream,
    clearHighlights,
  } = useDependencyGraph(projectPath, tool);

  // Use ReactFlow state for nodes/edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click
  const onPaneClick = useCallback(() => {
    selectNode(null);
    clearHighlights();
  }, [selectNode, clearHighlights]);

  // Get selected node data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as unknown as GraphNodeData | undefined;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-foreground">Dependency Graph</h3>
          <span className="text-xs text-muted-foreground">
            {nodes.length} packages, {edges.length} dependencies
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={loading}
            className="h-auto w-auto p-1.5"
            title="Refresh graph"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-auto w-auto p-1.5"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading dependency graph...
        </div>
      )}

      {/* Graph */}
      {!loading && nodes.length > 0 && (
        <div className="flex-1 flex">
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.1}
              maxZoom={2}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              <Background color="#374151" gap={20} />
              <Controls className="!bg-secondary !border-border" />
              <MiniMap
                nodeColor={(node) => {
                  const data = node.data as unknown as GraphNodeData;
                  if (node.id === selectedNodeId) return '#3b82f6';
                  if (highlightedNodeIds.has(node.id)) return '#8b5cf6';
                  if (data?.isInCycle) return '#ef4444';
                  if (data?.isAffected) return '#f59e0b';
                  return '#374151';
                }}
                className="!bg-secondary"
              />
            </ReactFlow>
          </div>

          {/* Side panel for selected node */}
          {selectedNode && selectedNodeData && (
            <div className="w-64 border-l border-border p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">
                  {selectedNodeData.label}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    selectNode(null);
                    clearHighlights();
                  }}
                  className="h-auto w-auto p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 text-foreground/90">{selectedNodeData.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Path:</span>
                  <span className="ml-2 text-foreground/90">{selectedNodeData.root}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Scripts:</span>
                  <span className="ml-2 text-foreground/90">{selectedNodeData.scriptsCount}</span>
                </div>

                {selectedNodeData.tags && selectedNodeData.tags.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Tags:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedNodeData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-border text-foreground/90 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Highlight:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => highlightUpstream(selectedNode.id)}
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <ArrowUp className="w-3 h-3" />
                      Upstream
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => highlightDownstream(selectedNode.id)}
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <ArrowDown className="w-3 h-3" />
                      Downstream
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No packages found</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DependencyGraphView;
