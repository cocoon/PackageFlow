/**
 * Project IPA Inspector component
 * Displays when .ipa files are detected in project directory
 * Uses card-style display (read-only mode)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileBox, RefreshCw, FolderOpen, CheckCircle, XCircle, Search, Copy, Check, X, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { ipaAPI, type IpaMetadata } from '../../lib/tauri-api';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { formatDate } from '../../lib/utils';

// Local type alias for compatibility
type IpaResult = IpaMetadata;

interface ProjectIpaInspectorProps {
  projectPath: string;
}

export function ProjectIpaInspector({ projectPath }: ProjectIpaInspectorProps) {
  const [ipaResults, setIpaResults] = useState<IpaResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBundleId, setCopiedBundleId] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);

  // Load IPA files in project directory
  const loadIpaFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ipaAPI.scanProjectIpa(projectPath);
      if (response.success) {
        setIpaResults(response.results);
      } else {
        setError(response.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Failed to scan IPA files:', err);
      setError('Scan failed');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadIpaFiles();
  }, [loadIpaFiles]);

  // Filter results
  const filteredResults = ipaResults.filter(ipa => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ipa.fileName.toLowerCase().includes(query) ||
      ipa.bundleId?.toLowerCase().includes(query) ||
      ipa.displayName?.toLowerCase().includes(query)
    );
  });

  // Show in Finder
  const handleShowInFinder = async (filePath: string) => {
    try {
      await revealItemInDir(filePath);
    } catch (err) {
      console.error('Failed to reveal in Finder:', err);
    }
  };

  // Copy Bundle ID
  const handleCopyBundleId = async (index: number, bundleId: string) => {
    try {
      await navigator.clipboard.writeText(bundleId);
      setCopiedBundleId(index);
      setTimeout(() => setCopiedBundleId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedIndex(null);
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      index,
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: e.clientY,
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle context menu action
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    const index = contextMenu.index;

    switch (action) {
      case 'show-in-finder':
        handleShowInFinder(ipaResults[index].filePath);
        break;
      case 'copy-bundle-id':
        if (ipaResults[index].bundleId) {
          handleCopyBundleId(index, ipaResults[index].bundleId);
        }
        break;
    }
    closeContextMenu();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
        Scanning IPA files...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadIpaFiles}
          className="mt-4 px-4 py-2 text-sm bg-card hover:bg-accent rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (ipaResults.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileBox className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No IPA files in this project directory</p>
        <button
          onClick={loadIpaFiles}
          className="mt-4 px-4 py-2 text-sm bg-card hover:bg-accent rounded transition-colors"
        >
          Scan again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Left: Card list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            IPA files ({filteredResults.length}{searchQuery && ` / ${ipaResults.length}`})
          </h3>
          <div className="flex items-center gap-2">
            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="pl-9 pr-3 py-1.5 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-48"
              />
            </div>
            {/* Rescan button */}
            <button
              onClick={loadIpaFiles}
              className="p-1.5 text-muted-foreground hover:bg-card rounded transition-colors"
              title="Rescan"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* IPA card list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredResults.map((ipa) => {
            const originalIndex = ipaResults.indexOf(ipa);
            return (
              <div
                key={ipa.filePath}
                onClick={() => setSelectedIndex(originalIndex)}
                onContextMenu={(e) => handleContextMenu(e, originalIndex)}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedIndex === originalIndex
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-card/50 border-border hover:border-border/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Filename and status */}
                    <div className="flex items-center gap-2 mb-2">
                      <FileBox className={`w-5 h-5 shrink-0 ${
                        ipa.error ? 'text-red-400' : 'text-green-400'
                      }`} />
                      <span className="text-sm font-medium text-foreground truncate">
                        {ipa.fileName}
                      </span>
                      {ipa.error ? (
                        <span title={ipa.error}>
                          <XCircle className="w-4 h-4 text-red-400" />
                        </span>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>

                    {/* Detailed information */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Bundle ID:</span>
                        <span className="text-foreground truncate">{ipa.bundleId || '-'}</span>
                        {ipa.bundleId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyBundleId(originalIndex, ipa.bundleId);
                            }}
                            className="p-0.5 hover:bg-accent rounded"
                            title="Copy Bundle ID"
                          >
                            {copiedBundleId === originalIndex ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="text-foreground ml-1.5">{ipa.version || '-'}</span>
                        {ipa.build && (
                          <span className="text-muted-foreground ml-1">({ipa.build})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Display name:</span>
                        <span className="text-foreground ml-1.5 truncate">{ipa.displayName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created at:</span>
                        <span className="text-foreground ml-1.5">
                          {ipa.createdAt ? formatDate(ipa.createdAt) : '-'}
                        </span>
                      </div>
                    </div>

                    {/* File path */}
                    <p
                      className="text-xs text-muted-foreground/50 mt-2 truncate font-mono"
                      title={ipa.filePath}
                    >
                      {ipa.filePath}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowInFinder(ipa.filePath);
                      }}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title="Show in Finder"
                    >
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Detail panel */}
      {selectedIndex !== null && ipaResults[selectedIndex] && (
        <IpaDetailPanel
          result={ipaResults[selectedIndex]}
          onClose={handleCloseDetail}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          {/* Background mask */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          {/* Menu */}
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {ipaResults[contextMenu.index]?.bundleId && (
              <button
                onClick={() => handleContextMenuAction('copy-bundle-id')}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                Copy Bundle ID
              </button>
            )}
            <button
              onClick={() => handleContextMenuAction('show-in-finder')}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Show in Finder
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Embedded detail panel (consistent styling with project tabs)
interface IpaDetailPanelProps {
  result: IpaResult;
  onClose: () => void;
}

function IpaDetailPanel({ result, onClose }: IpaDetailPanelProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [width, setWidth] = useState(380);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidth.current + delta, 280), 600);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  const handleCopy = async () => {
    const jsonText = result.fullPlist
      ? JSON.stringify(result.fullPlist, null, 2)
      : result.error || 'No data';

    try {
      await navigator.clipboard.writeText(jsonText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <aside
      className="flex-shrink-0 bg-card/50 border border-border rounded-lg flex overflow-hidden"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="w-1.5 flex-shrink-0 bg-muted/50 hover:bg-blue-500/50 cursor-col-resize flex items-center justify-center transition-colors group"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground truncate pr-2" title={result.fileName}>
            {result.fileName}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                copySuccess
                  ? 'bg-green-500/20 text-green-400'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-border space-y-1.5 text-xs">
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Bundle ID:</span>
            <span className="font-mono text-foreground truncate">{result.bundleId}</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Version:</span>
            <span className="text-foreground">{result.version} ({result.build})</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Display name:</span>
            <span className="text-foreground truncate">{result.displayName}</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Created at:</span>
            <span className="text-foreground">{result.createdAt ? formatDate(result.createdAt) : 'N/A'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Full Plist</h4>
          {result.fullPlist ? (
            <JsonTreeView data={result.fullPlist} />
          ) : (
            <p className="text-muted-foreground text-xs">
              {result.error || 'Unable to load Plist data'}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

// JSON tree view
interface JsonTreeViewProps {
  data: Record<string, unknown>;
  level?: number;
}

function JsonTreeView({ data, level = 0 }: JsonTreeViewProps) {
  return (
    <div className="font-mono text-xs space-y-0.5">
      {Object.entries(data).map(([key, value]) => (
        <JsonNodeView key={key} keyName={key} value={value} level={level} />
      ))}
    </div>
  );
}

interface JsonNodeViewProps {
  keyName: string;
  value: unknown;
  level: number;
}

function JsonNodeView({ keyName, value, level }: JsonNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const paddingLeft = level * 12;

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const renderValue = () => {
    if (value === null) {
      return <span className="text-muted-foreground">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-orange-400">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-green-400">"{value}"</span>;
    }
    if (value && typeof value === 'object' && 'type' in value && value.type === 'Buffer') {
      return <span className="text-muted-foreground">"[Binary Data]"</span>;
    }
    return null;
  };

  return (
    <div>
      <div
        className={`flex items-start py-0.5 hover:bg-accent/50 rounded px-1 ${
          isExpandable ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        {isExpandable && (
          <span className="mr-1 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        <span className="text-purple-400">{keyName}</span>
        <span className="text-muted-foreground/50 mx-1">:</span>
        {isExpandable ? (
          <span className="text-muted-foreground">
            {isArray ? `[${(value as unknown[]).length}]` : '{...}'}
          </span>
        ) : (
          renderValue()
        )}
      </div>
      {isExpandable && isExpanded && (
        <div>
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <JsonNodeView
                  key={index}
                  keyName={`[${index}]`}
                  value={item}
                  level={level + 1}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <JsonNodeView key={k} keyName={k} value={v} level={level + 1} />
              ))}
        </div>
      )}
    </div>
  );
}
