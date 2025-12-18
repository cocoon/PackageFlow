# PackageFlow 文件

歡迎來到 PackageFlow 文件！本指南將協助你充分利用 PackageFlow。

**其他語言**：[English](../README.md) | [简体中文](../zh-CN/README.md)

## 快速連結

- [快速入門](./getting-started.md) - 安裝、匯入專案、執行第一個 script
- [MCP 伺服器](./features/mcp-server.md) - 讓 AI 工具安全地控制 PackageFlow
- [時間機器](./features/time-machine.md) - 依賴快照、完整性檢查、安全洞察
- [安全與隱私](./security-and-privacy.md) - 本機優先、加密、權限模型
- [疑難排解](./troubleshooting.md) - 常見問題與快速解法
- [功能指南](#功能) - 各功能深入說明

## 什麼是 PackageFlow？

PackageFlow 是一款**專為前端與 Node.js 開發者打造的桌面應用程式** — 一個可以取代終端機的工具。它將您的 JavaScript/TypeScript 專案轉變為視覺化控制中心。

**專為現代前端工作流程設計：**

- **React、Vue、Next.js、Nuxt** — 一鍵啟動開發伺服器、建置與部署
- **npm、pnpm、yarn、bun** — 自動偵測套件管理器
- **Monorepos** — 原生支援 Nx、Turborepo、Lerna
- **AI 輔助開發** — 產生提交訊息、審查程式碼、分析安全性

**本機優先（Local-first）設計：**

- 專案資料與自動化都保留在你的機器上
- 秘密（token / API key）會加密保存（AES-256-GCM）
- MCP 連線具備權限控管（唯讀 → 需確認 → 全權限）

## PackageFlow 適合誰？

- **前端開發者** — 厭倦了在多個終端機視窗間切換
- **Vibe Coders** — 想保持心流狀態，而非記憶 CLI 指令
- **團隊** — 想要跨專案的一致工作流程
- **AI 優先開發者** — 使用 Claude Code、Codex 或 Gemini CLI

## 主要優勢

| 使用 PackageFlow 前 | 使用 PackageFlow 後 |
|-------------------|-----------------|
| `cd project && npm run dev` | 點擊「Dev」 |
| `git add . && git commit -m "..."` | AI 幫你產生提交訊息 |
| `npm audit --json \| jq ...` | 視覺化漏洞儀表板 |
| 在 5 個終端機分頁間切換 | 一個統一的工作空間 |

## 功能

### 核心功能

| 功能 | 說明 | 文件 |
|------|------|------|
| **專案管理** | 匯入、掃描和管理您的專案 | [閱讀更多](./features/project-management.md) |
| **一鍵執行腳本** | 執行 npm/pnpm/yarn 腳本並即時顯示輸出 | [閱讀更多](./features/one-click-scripts.md) |
| **視覺化工作流程** | 拖放式建立自動化流程 | [閱讀更多](./features/visual-workflow.md) |
| **Monorepo 支援** | Nx、Turborepo、Lerna 整合 | [閱讀更多](./features/monorepo-support.md) |

### Git 與版本控制

| 功能 | 說明 | 文件 |
|------|------|------|
| **Git 整合** | 視覺化 Git 操作，無需 CLI | [閱讀更多](./features/git-integration.md) |
| **Worktree 管理** | 使用快速切換器管理 Git worktree | [閱讀更多](./features/worktree-management.md) |

### 部署與安全

| 功能 | 說明 | 文件 |
|------|------|------|
| **一鍵部署** | 部署至 Netlify、Cloudflare、GitHub Pages | [閱讀更多](./features/one-click-deploy.md) |
| **安全掃描** | 視覺化 npm audit 與漏洞詳情 | [閱讀更多](./features/security-audit.md) |
| **時間機器** | 依賴快照、差異分析、完整性與安全洞察 | [閱讀更多](./features/time-machine.md) |

### AI 與自動化

| 功能 | 說明 | 文件 |
|------|------|------|
| **AI 整合** | 多供應商 AI（OpenAI、Anthropic、Gemini、Ollama） | [閱讀更多](./features/ai-integration.md) |
| **MCP 伺服器** | 讓 Claude Code、Codex、Gemini CLI 控制 PackageFlow | [閱讀更多](./features/mcp-server.md) |
| **Webhooks** | 傳入/傳出 webhook 自動化 | [閱讀更多](./features/webhooks.md) |

### 工具與設定

| 功能 | 說明 | 文件 |
|------|------|------|
| **工具鏈管理** | Volta、Corepack、Node 版本偵測 | [閱讀更多](./features/toolchain-management.md) |
| **鍵盤快捷鍵** | 可自訂的快捷鍵參考 | [閱讀更多](./features/keyboard-shortcuts.md) |

## 支援的技術

### 前端框架

React、Vue、Angular、Svelte、Solid、Next.js、Nuxt、Remix、Astro、Vite

### 套件管理器

npm、pnpm、yarn、bun（從 lockfiles 自動偵測）

### Monorepo 工具

Nx、Turborepo、Lerna、pnpm workspaces、yarn workspaces

### 部署平台

Netlify、Cloudflare Pages、GitHub Pages、Vercel（即將推出）

### AI 供應商

OpenAI、Anthropic、Google、Ollama、LM Studio

## 系統需求

- **平台**：macOS（Windows 和 Linux 即將推出）
- **Node.js**：18+（用於專案偵測）

## 支援

- [GitHub Issues](https://github.com/runkids/PackageFlow/issues) - 錯誤回報與功能建議
- [Releases](https://github.com/runkids/PackageFlow/releases) - 下載最新版本
