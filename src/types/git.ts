// Git types for 009-git-integration feature
// TypeScript types matching Rust models in src-tauri/src/models/git.rs

/**
 * Git file status types
 */
export type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'conflict';

/**
 * A single file's Git status
 */
export interface GitFile {
  /** File path relative to repository root */
  path: string;
  /** File status type */
  status: GitFileStatus;
  /** Whether the file is staged */
  staged: boolean;
  /** Original path for renamed files */
  oldPath?: string;
}

/**
 * Repository Git status summary
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Whether the working directory is clean */
  isClean: boolean;
  /** Tracking upstream branch name */
  upstream?: string;
  /** Number of commits ahead of upstream */
  ahead: number;
  /** Number of commits behind upstream */
  behind: number;
  /** Count of staged files */
  stagedCount: number;
  /** Count of modified but unstaged files */
  modifiedCount: number;
  /** Count of untracked files */
  untrackedCount: number;
  /** Count of conflict files */
  conflictCount: number;
  /** List of all changed files */
  files: GitFile[];
}

/**
 * Branch information
 */
export interface Branch {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  isCurrent: boolean;
  /** Whether this is a remote branch */
  isRemote: boolean;
  /** Tracking upstream branch name */
  upstream?: string;
  /** Last commit hash (short, 7 chars) */
  lastCommitHash: string;
  /** Last commit message (truncated) */
  lastCommitMessage: string;
}

/**
 * Commit information
 */
export interface Commit {
  /** Full commit hash */
  hash: string;
  /** Short hash (7 chars) */
  shortHash: string;
  /** Commit message (first line) */
  message: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail: string;
  /** Commit date (ISO 8601) */
  date: string;
}

/**
 * Commit file change information
 */
export interface CommitFile {
  /** File path */
  path: string;
  /** Change type */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Lines added */
  additions: number;
  /** Lines deleted */
  deletions: number;
}

/**
 * Commit statistics
 */
export interface CommitStats {
  /** Number of files changed */
  filesChanged: number;
  /** Total lines added */
  additions: number;
  /** Total lines deleted */
  deletions: number;
}

/**
 * Commit detail with changed files
 */
export interface CommitDetail {
  /** Basic commit info */
  commit: Commit;
  /** Changed files */
  files: CommitFile[];
  /** Change statistics */
  stats: CommitStats;
}

/**
 * Stash entry
 */
export interface Stash {
  /** Stash index (0 = most recent) */
  index: number;
  /** Stash description message */
  message: string;
  /** Branch where stash was created */
  branch: string;
  /** Creation timestamp (ISO 8601) */
  date: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for get_git_status command
 */
export interface GetGitStatusResponse {
  success: boolean;
  status?: GitStatus;
  error?: string;
}

/**
 * Response for stage/unstage operations
 */
export interface StageFilesResponse {
  success: boolean;
  stagedFiles?: string[];
  error?: string;
}

export interface UnstageFilesResponse {
  success: boolean;
  unstagedFiles?: string[];
  error?: string;
}

/**
 * Response for create_commit command
 */
export interface CreateCommitResponse {
  success: boolean;
  commitHash?: string;
  error?: string;
}

/**
 * Response for get_branches command
 */
export interface GetBranchesResponse {
  success: boolean;
  branches?: Branch[];
  currentBranch?: string;
  error?: string;
}

/**
 * Response for create_branch command
 */
export interface CreateBranchResponse {
  success: boolean;
  branch?: Branch;
  error?: string;
}

/**
 * Response for switch_branch command
 */
export interface SwitchBranchResponse {
  success: boolean;
  previousBranch?: string;
  error?: string;
}

/**
 * Response for delete_branch command
 */
export interface DeleteBranchResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for get_commit_history command
 */
export interface GetCommitHistoryResponse {
  success: boolean;
  commits?: Commit[];
  hasMore: boolean;
  error?: string;
}

/**
 * Response for git_push command
 */
export interface GitPushResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for git_pull command
 */
export interface GitPullResponse {
  success: boolean;
  updatedFiles?: number;
  hasConflicts?: boolean;
  error?: string;
}

/**
 * Response for list_stashes command
 */
export interface ListStashesResponse {
  success: boolean;
  stashes?: Stash[];
  error?: string;
}

/**
 * Response for create_stash command
 */
export interface CreateStashResponse {
  success: boolean;
  stash?: Stash;
  error?: string;
}

/**
 * Response for apply_stash command
 */
export interface ApplyStashResponse {
  success: boolean;
  hasConflicts?: boolean;
  error?: string;
}

/**
 * Response for drop_stash command
 */
export interface DropStashResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Remote Management Types
// ============================================================================

/**
 * Git remote information
 */
export interface GitRemote {
  /** Remote name (e.g., 'origin') */
  name: string;
  /** Fetch URL */
  url: string;
  /** Push URL (if different from fetch URL) */
  pushUrl?: string;
}

/**
 * Response for get_remotes command
 */
export interface GetRemotesResponse {
  success: boolean;
  remotes?: GitRemote[];
  error?: string;
}

/**
 * Response for add_remote command
 */
export interface AddRemoteResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for remove_remote command
 */
export interface RemoveRemoteResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Discard Changes Types
// ============================================================================

/**
 * Response for discard_changes command
 */
export interface DiscardChangesResponse {
  success: boolean;
  discardedFiles?: string[];
  error?: string;
}

/**
 * Response for git_fetch command
 */
export interface GitFetchResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for git_rebase command
 */
export interface GitRebaseResponse {
  success: boolean;
  hasConflicts?: boolean;
  error?: string;
}

// ============================================================================
// Git Authentication Types
// ============================================================================

/**
 * Git authentication status
 */
export interface GitAuthStatus {
  /** Whether SSH agent is available */
  sshAgentAvailable: boolean;
  /** List of SSH identities loaded */
  sshIdentities: string[];
  /** Current credential helper */
  credentialHelper?: string;
  /** Git user name */
  userName?: string;
  /** Git user email */
  userEmail?: string;
}

/**
 * Response for get_git_auth_status command
 */
export interface GetGitAuthStatusResponse {
  success: boolean;
  authStatus?: GitAuthStatus;
  error?: string;
}

/**
 * Response for test_remote_connection command
 */
export interface TestRemoteConnectionResponse {
  success: boolean;
  canConnect: boolean;
  error?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Git error codes for error handling
 */
export type GitErrorCode =
  // Environment errors (non-recoverable)
  | 'GIT_NOT_FOUND'
  | 'NOT_GIT_REPO'
  // Operation errors (recoverable)
  | 'UNCOMMITTED_CHANGES'
  | 'MERGE_CONFLICT'
  | 'BRANCH_EXISTS'
  | 'BRANCH_NOT_FOUND'
  | 'REMOTE_REJECTED'
  | 'AUTHENTICATION_FAILED'
  | 'NETWORK_ERROR'
  | 'STASH_CONFLICT'
  | 'EMPTY_MESSAGE'
  | 'NOTHING_TO_COMMIT'
  | 'NOTHING_TO_STASH'
  | 'STASH_NOT_FOUND'
  | 'NO_REMOTE'
  | 'NO_UPSTREAM'
  | 'CANNOT_DELETE_CURRENT'
  | 'BRANCH_NOT_MERGED'
  | 'INVALID_BRANCH_NAME'
  | 'FILE_NOT_FOUND'
  | 'HAS_UNCOMMITTED_CHANGES'
  | 'REJECTED_NON_FAST_FORWARD'
  // Remote errors
  | 'REMOTE_EXISTS'
  | 'REMOTE_NOT_FOUND'
  | 'INVALID_REMOTE_NAME'
  | 'INVALID_REMOTE_URL'
  // Generic error
  | 'GIT_ERROR';

// ============================================================================
// Diff Types (Feature 010-git-diff-viewer)
// ============================================================================

/**
 * Diff line type
 */
export type DiffLineType = 'context' | 'addition' | 'deletion';

/**
 * A single line in a diff hunk
 */
export interface DiffLine {
  /** Line index within hunk (0-based) */
  index: number;
  /** Line type */
  lineType: DiffLineType;
  /** Line content (without prefix) */
  content: string;
  /** Old file line number (for context/deletion) */
  oldLineNumber?: number;
  /** New file line number (for context/addition) */
  newLineNumber?: number;
}

/**
 * A contiguous section of changes
 */
export interface DiffHunk {
  /** Hunk index (0-based) */
  index: number;
  /** Old file start line */
  oldStart: number;
  /** Old file line count */
  oldCount: number;
  /** New file start line */
  newStart: number;
  /** New file line count */
  newCount: number;
  /** Hunk header (e.g., function name) */
  header?: string;
  /** Lines in this hunk */
  lines: DiffLine[];
}

/**
 * File diff status
 */
export type FileDiffStatus = 'added' | 'modified' | 'deleted' | 'renamed';

/**
 * Complete diff for a single file
 */
export interface FileDiff {
  /** File path relative to repository root */
  path: string;
  /** Old path for renamed files */
  oldPath?: string;
  /** File status */
  status: FileDiffStatus;
  /** Whether file is binary */
  isBinary: boolean;
  /** Detected language for syntax highlighting */
  language?: string;
  /** Diff hunks */
  hunks: DiffHunk[];
  /** Total lines added */
  additions: number;
  /** Total lines deleted */
  deletions: number;
}

/**
 * Response for get_file_diff command
 */
export interface GetFileDiffResponse {
  success: boolean;
  diff?: FileDiff;
  error?: string;
}

/**
 * Line selection for partial staging
 */
export interface LineSelection {
  /** Hunk index */
  hunkIndex: number;
  /** Line index within hunk */
  lineIndex: number;
}

/**
 * Response for stage_hunk command
 */
export interface StageHunkResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for unstage_hunk command
 */
export interface UnstageHunkResponse {
  success: boolean;
  error?: string;
}

/**
 * Response for stage_lines command
 */
export interface StageLinesResponse {
  success: boolean;
  stagedCount?: number;
  error?: string;
}

/**
 * Response for unstage_lines command
 */
export interface UnstageLinesResponse {
  success: boolean;
  unstagedCount?: number;
  error?: string;
}
