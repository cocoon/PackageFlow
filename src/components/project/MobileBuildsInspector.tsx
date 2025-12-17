/**
 * Mobile Builds Inspector Component
 * Displays IPA and APK files found in project directory
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileBox,
  RefreshCw,
  FolderOpen,
  CheckCircle,
  XCircle,
  Search,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Smartphone,
} from 'lucide-react';
import { ipaAPI, apkAPI } from '../../lib/tauri-api';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { formatDate, formatFileSize } from '../../lib/utils';
import { Button } from '../ui/Button';

type BuildType = 'ipa' | 'apk';

interface MobileBuild {
  type: BuildType;
  fileName: string;
  filePath: string;
  identifier: string; // bundleId for IPA, packageName for APK
  version: string;
  displayName: string;
  createdAt: string;
  error?: string;
  // IPA specific
  build?: string;
  deviceCapabilities?: string;
  fullPlist?: Record<string, unknown>;
  // APK specific
  versionCode?: string;
  minSdk?: string;
  targetSdk?: string;
  fileSize?: number;
}

interface MobileBuildsInspectorProps {
  projectPath: string;
}

export function MobileBuildsInspector({ projectPath }: MobileBuildsInspectorProps) {
  const [builds, setBuilds] = useState<MobileBuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | BuildType>('all');

  // Load IPA and APK files
  const loadBuilds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [ipaResponse, apkResponse] = await Promise.all([
        ipaAPI.scanProjectIpa(projectPath),
        apkAPI.scanProjectApk(projectPath),
      ]);

      const allBuilds: MobileBuild[] = [];

      // Convert IPA results
      if (ipaResponse.success) {
        for (const ipa of ipaResponse.results) {
          allBuilds.push({
            type: 'ipa',
            fileName: ipa.fileName,
            filePath: ipa.filePath,
            identifier: ipa.bundleId,
            version: ipa.version,
            displayName: ipa.displayName,
            createdAt: ipa.createdAt,
            error: ipa.error,
            build: ipa.build,
            deviceCapabilities: ipa.deviceCapabilities,
            fullPlist: ipa.fullPlist,
          });
        }
      }

      // Convert APK results
      if (apkResponse.success) {
        for (const apk of apkResponse.results) {
          allBuilds.push({
            type: 'apk',
            fileName: apk.fileName,
            filePath: apk.filePath,
            identifier: apk.packageName,
            version: apk.versionName,
            displayName: apk.appName,
            createdAt: apk.createdAt,
            error: apk.error,
            versionCode: apk.versionCode,
            minSdk: apk.minSdk,
            targetSdk: apk.targetSdk,
            fileSize: apk.fileSize,
          });
        }
      }

      // Sort by created date (newest first)
      allBuilds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setBuilds(allBuilds);
    } catch (err) {
      console.error('Failed to scan mobile builds:', err);
      setError('Failed to scan mobile build files');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  // Filter results
  const filteredBuilds = builds.filter((build) => {
    // Type filter
    if (filterType !== 'all' && build.type !== filterType) {
      return false;
    }
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      build.fileName.toLowerCase().includes(query) ||
      build.identifier?.toLowerCase().includes(query) ||
      build.displayName?.toLowerCase().includes(query)
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

  // Copy to clipboard with feedback
  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedIndex(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
        Scanning mobile build files...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
        <p className="text-red-400">{error}</p>
        <Button variant="ghost" onClick={loadBuilds} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (builds.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No IPA or APK files in this project directory</p>
        <Button variant="ghost" onClick={loadBuilds} className="mt-4">
          Scan again
        </Button>
      </div>
    );
  }

  const ipaCount = builds.filter((b) => b.type === 'ipa').length;
  const apkCount = builds.filter((b) => b.type === 'apk').length;

  return (
    <div className="flex h-full gap-4">
      {/* Left: Card list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Mobile Builds ({filteredBuilds.length}
              {searchQuery || filterType !== 'all' ? ` / ${builds.length}` : ''})
            </h3>
            {/* Type filter tabs */}
            <div className="flex items-center gap-1 bg-card rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 h-auto ${
                  filterType === 'all'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </Button>
              {ipaCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType('ipa')}
                  className={`px-2 py-1 h-auto ${
                    filterType === 'ipa'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  IPA ({ipaCount})
                </Button>
              )}
              {apkCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType('apk')}
                  className={`px-2 py-1 h-auto ${
                    filterType === 'apk'
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  APK ({apkCount})
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={loadBuilds}
              className="h-auto"
              title="Rescan"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Build cards */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredBuilds.map((build, index) => {
            const originalIndex = builds.indexOf(build);
            const pathCopyKey = `path-${index}`;
            const idCopyKey = `id-${index}`;
            return (
              <div
                key={build.filePath}
                onClick={() => setSelectedIndex(originalIndex)}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedIndex === originalIndex
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-card/50 border-border hover:border-border/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* File name and status */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          build.type === 'ipa'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {build.type.toUpperCase()}
                      </span>
                      <FileBox
                        className={`w-4 h-4 shrink-0 ${
                          build.error ? 'text-red-400' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground truncate">
                        {build.fileName}
                      </span>
                      {build.error ? (
                        <span title={build.error}>
                          <XCircle className="w-4 h-4 text-red-400" />
                        </span>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {build.type === 'ipa' ? 'Bundle ID:' : 'Package:'}
                        </span>
                        <span className="text-foreground truncate">{build.identifier || '-'}</span>
                        {build.identifier && build.identifier !== 'N/A' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(idCopyKey, build.identifier);
                            }}
                            className="p-0.5 hover:bg-accent rounded"
                            title={`Copy ${build.type === 'ipa' ? 'Bundle ID' : 'Package Name'}`}
                          >
                            {copiedId === idCopyKey ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="text-foreground ml-1.5">{build.version || '-'}</span>
                        {build.type === 'ipa' && build.build && (
                          <span className="text-muted-foreground ml-1">({build.build})</span>
                        )}
                        {build.type === 'apk' &&
                          build.versionCode &&
                          build.versionCode !== 'N/A' && (
                            <span className="text-muted-foreground ml-1">
                              (code: {build.versionCode})
                            </span>
                          )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-foreground ml-1.5 truncate">
                          {build.displayName || '-'}
                        </span>
                      </div>
                      {build.type === 'apk' && (
                        <div>
                          <span className="text-muted-foreground">SDK:</span>
                          <span className="text-foreground ml-1.5">
                            {build.minSdk && build.minSdk !== 'N/A' ? `${build.minSdk}` : '-'}
                            {build.targetSdk &&
                              build.targetSdk !== 'N/A' &&
                              ` → ${build.targetSdk}`}
                          </span>
                        </div>
                      )}
                      {build.type === 'ipa' && (
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="text-foreground ml-1.5">
                            {build.createdAt ? formatDate(build.createdAt) : '-'}
                          </span>
                        </div>
                      )}
                      {build.type === 'apk' &&
                        build.fileSize !== undefined &&
                        build.fileSize > 0 && (
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <span className="text-foreground ml-1.5">
                              {formatFileSize(build.fileSize)}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* File path */}
                    <p
                      className="text-xs text-muted-foreground/50 mt-2 truncate font-mono"
                      title={build.filePath}
                    >
                      {build.filePath}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(pathCopyKey, build.filePath);
                      }}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title="Copy Path"
                    >
                      {copiedId === pathCopyKey ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowInFinder(build.filePath);
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

      {/* Right: Detail panel (IPA only for now - has fullPlist) */}
      {selectedIndex !== null &&
        builds[selectedIndex]?.type === 'ipa' &&
        builds[selectedIndex]?.fullPlist && (
          <BuildDetailPanel build={builds[selectedIndex]} onClose={handleCloseDetail} />
        )}
    </div>
  );
}

// Detail panel for IPA plist view
interface BuildDetailPanelProps {
  build: MobileBuild;
  onClose: () => void;
}

function BuildDetailPanel({ build, onClose }: BuildDetailPanelProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [width, setWidth] = useState(380);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [width]
  );

  const handleCopy = async () => {
    const jsonText = build.fullPlist
      ? JSON.stringify(build.fullPlist, null, 2)
      : build.error || 'No data';

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
          <h3 className="text-sm font-medium text-foreground truncate pr-2" title={build.fileName}>
            {build.fileName}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={`gap-1 h-auto ${copySuccess ? 'bg-green-500/20 text-green-400' : ''}`}
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
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b border-border space-y-1.5 text-xs">
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Bundle ID:</span>
            <span className="font-mono text-foreground truncate">{build.identifier}</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Version:</span>
            <span className="text-foreground">
              {build.version} ({build.build})
            </span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Display name:</span>
            <span className="text-foreground truncate">{build.displayName}</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 flex-shrink-0">Created at:</span>
            <span className="text-foreground">
              {build.createdAt ? formatDate(build.createdAt) : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Full Plist</h4>
          {build.fullPlist ? (
            <JsonTreeView data={build.fullPlist} />
          ) : (
            <p className="text-muted-foreground text-xs">
              {build.error || 'Unable to load Plist data'}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

// JSON tree view component
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
                <JsonNodeView key={index} keyName={`[${index}]`} value={item} level={level + 1} />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <JsonNodeView key={k} keyName={k} value={v} level={level + 1} />
              ))}
        </div>
      )}
    </div>
  );
}
