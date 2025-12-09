/**
 * Project sidebar component
 * @see specs/002-frontend-project-manager/spec.md - US5
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Folder, FolderOpen, Plus, RefreshCw, Trash2, Search, ChevronLeft, ChevronRight, MoreVertical, ArrowUpDown, GripVertical, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Project } from '../../types/project';
import type { ProjectSortMode } from '../../types/tauri';

interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  isCollapsed: boolean;
  sortMode: ProjectSortMode;
  projectOrder: string[];
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onRemoveProject: (id: string) => void;
  onToggleCollapse: () => void;
  onSortModeChange: (mode: ProjectSortMode) => void;
  onProjectOrderChange: (order: string[]) => void;
}

const SORT_OPTIONS: { value: ProjectSortMode; label: string }[] = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'lastOpened', label: 'Recently Opened' },
  { value: 'created', label: 'Date Created' },
  { value: 'custom', label: 'Custom Order' },
];

interface SortableProjectItemProps {
  project: Project;
  isActive: boolean;
  isFocused: boolean;
  isMenuOpen: boolean;
  isDraggable: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableProjectItem({
  project,
  isActive,
  isFocused,
  isMenuOpen,
  isDraggable,
  onSelect,
  onContextMenu,
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconArea = () => (
    <div className="relative flex-shrink-0 w-4 h-4">
      {/* Folder icon - hidden on hover in custom mode */}
      <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isDraggable ? 'group-hover:opacity-0' : ''}`}>
        {isActive ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <Folder className="w-4 h-4 text-muted-foreground" />
        )}
      </span>
      {/* Drag handle - overlays folder icon, shown on hover */}
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          title="Drag to reorder"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <button
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
          isActive
            ? 'bg-blue-600/20 text-blue-400'
            : isFocused
              ? 'bg-muted text-foreground ring-1 ring-blue-500'
              : 'hover:bg-accent text-foreground'
        }`}
      >
        <IconArea />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{project.name}</div>
          {project.isMonorepo && (
            <div className="text-xs text-muted-foreground">Monorepo</div>
          )}
        </div>
      </button>
      {/* More menu button shown on hover */}
      <button
        onClick={e => {
          e.stopPropagation();
          onContextMenu(e);
        }}
        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-opacity ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="More options"
      >
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </li>
  );
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  isLoading,
  isCollapsed,
  sortMode,
  projectOrder,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onToggleCollapse,
  onSortModeChange,
  onProjectOrderChange,
}: ProjectSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedProjects = useMemo(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = projects.filter(
        p => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered];
    switch (sortMode) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'lastOpened':
        return sorted.sort((a, b) =>
          new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
        );
      case 'created':
        return sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'custom':
        return sorted.sort((a, b) => {
          const aIndex = projectOrder.indexOf(a.id);
          const bIndex = projectOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [projects, searchQuery, sortMode, projectOrder]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedProjects.findIndex(p => p.id === active.id);
      const newIndex = sortedProjects.findIndex(p => p.id === over.id);

      const newSortedProjects = arrayMove(sortedProjects, oldIndex, newIndex);
      const newOrder = newSortedProjects.map(p => p.id);
      onProjectOrderChange(newOrder);
    }
  }, [sortedProjects, onProjectOrderChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (sortedProjects.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < sortedProjects.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : sortedProjects.length - 1;
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < sortedProjects.length) {
          onSelectProject(sortedProjects[focusedIndex].id);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  }, [sortedProjects, focusedIndex, onSelectProject]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Listen for Cmd+F shortcut event to focus search input
  useEffect(() => {
    const handleShortcutFocusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener('shortcut-focus-search', handleShortcutFocusSearch);
    return () => window.removeEventListener('shortcut-focus-search', handleShortcutFocusSearch);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const isButtonClick = e.type === 'click';
    setContextMenu({
      projectId,
      x: isButtonClick ? rect.right - 140 : e.clientX,
      y: isButtonClick ? rect.bottom + 4 : e.clientY,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleMenuAction = (action: 'remove') => {
    if (!contextMenu) return;

    if (action === 'remove') {
      onRemoveProject(contextMenu.projectId);
    }

    closeContextMenu();
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-background border-r border-border flex flex-col">
        <div className="p-2">
          <button
            onClick={onToggleCollapse}
            className="w-full p-2 rounded hover:bg-accent transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedProjects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`w-full p-2 rounded transition-colors ${
                activeProjectId === project.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
              title={project.name}
            >
              {activeProjectId === project.id ? (
                <FolderOpen className="w-4 h-4 mx-auto" />
              ) : (
                <Folder className="w-4 h-4 mx-auto" />
              )}
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <button
            onClick={onAddProject}
            className="w-full p-2 rounded hover:bg-accent transition-colors"
            title="Add project"
          >
            <Plus className="w-4 h-4 text-muted-foreground mx-auto" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-60 bg-background border-r border-border flex flex-col focus:outline-none"
      onClick={closeContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Projects</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddProject}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Add project"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search and sort */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
          {/* Sort button */}
          <div className="relative">
            <button
              ref={sortButtonRef}
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`p-1.5 rounded hover:bg-accent transition-colors ${
                showSortMenu ? 'bg-accent' : ''
              }`}
              title="Sort by"
            >
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {/* Sort menu */}
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px] whitespace-nowrap">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortModeChange(option.value);
                        setShowSortMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                    >
                      <Check
                        className={`w-4 h-4 ${
                          sortMode === option.value ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'No matching projects' : 'No projects added yet'}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedProjects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul ref={listRef} className="p-2 space-y-1">
                {sortedProjects.map((project, index) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectId === project.id}
                    isFocused={focusedIndex === index}
                    isMenuOpen={contextMenu?.projectId === project.id}
                    isDraggable={sortMode === 'custom'}
                    onSelect={() => onSelectProject(project.id)}
                    onContextMenu={e => handleContextMenu(e, project.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Drag hint - only show in custom mode */}
      {sortMode === 'custom' && sortedProjects.length > 1 && (
        <div className="px-2 py-1.5 border-t border-border text-xs text-muted-foreground text-center">
          Drag items to reorder
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          {/* Transparent overlay - click anywhere to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleMenuAction('remove')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-accent"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}
