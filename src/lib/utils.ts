import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format a file path by replacing the home directory with ~
 * e.g., /Users/hongweiheng/Downloads/project -> ~/Downloads/project
 */
export function formatPath(path: string): string {
  // Get home directory pattern - works for macOS/Linux
  const homeDir = path.match(/^\/Users\/[^/]+/)?.[0] || path.match(/^\/home\/[^/]+/)?.[0];
  if (homeDir) {
    return path.replace(homeDir, '~');
  }
  return path;
}
