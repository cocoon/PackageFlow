/**
 * DiffSyntaxHighlighter Component - Syntax highlighting for diff content
 * @see specs/010-git-diff-viewer/tasks.md - T018
 */

import { Highlight, themes } from 'prism-react-renderer';

// Map file extensions/languages to Prism language identifiers
const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'jsx',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'tsx',
  // Rust
  rust: 'rust',
  rs: 'rust',
  // Web
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  // Shell
  bash: 'bash',
  sh: 'bash',
  zsh: 'bash',
  // Markup
  markdown: 'markdown',
  md: 'markdown',
  // Other
  python: 'python',
  py: 'python',
  go: 'go',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  diff: 'diff',
};

// Get Prism language from detected language or fallback
function getPrismLanguage(language?: string): string {
  if (!language) return 'markup';
  const normalized = language.toLowerCase();
  return LANGUAGE_MAP[normalized] || 'markup';
}

interface DiffSyntaxHighlighterProps {
  /** Code content to highlight */
  content: string;
  /** Language detected from file extension */
  language?: string;
}

/**
 * Renders syntax-highlighted code content for a single line
 * Uses a dark theme optimized for diff viewing
 */
export function DiffSyntaxHighlighter({ content, language }: DiffSyntaxHighlighterProps) {
  const prismLanguage = getPrismLanguage(language);

  return (
    <Highlight
      theme={themes.vsDark}
      code={content}
      language={prismLanguage}
    >
      {({ tokens, getTokenProps }) => (
        <>
          {tokens.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line.map((token, tokenIndex) => (
                <span key={tokenIndex} {...getTokenProps({ token })} />
              ))}
            </span>
          ))}
        </>
      )}
    </Highlight>
  );
}
