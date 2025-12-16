# PackageFlow 文档

欢迎来到 PackageFlow 文档！本指南将帮助您充分利用 PackageFlow。

**其他语言**：[English](../README.md) | [繁體中文](../zh-TW/README.md)

## 快速链接

- [快速入门](./getting-started.md) - 安装与初步设置
- [功能列表](#功能)

## 什么是 PackageFlow？

PackageFlow 是一款**专为前端与 Node.js 开发者打造的桌面应用程序** — 一个可以取代终端的工具。它将您的 JavaScript/TypeScript 项目转变为可视化控制中心。

**专为现代前端工作流程设计：**

- **React、Vue、Next.js、Nuxt** — 一键启动开发服务器、构建与部署
- **npm、pnpm、yarn、bun** — 自动检测包管理器
- **Monorepos** — 原生支持 Nx、Turborepo、Lerna
- **AI 辅助开发** — 生成提交信息、审查代码、分析安全性

## PackageFlow 适合谁？

- **前端开发者** — 厌倦了在多个终端窗口间切换
- **Vibe Coders** — 想保持心流状态，而非记忆 CLI 命令
- **团队** — 想要跨项目的一致工作流程
- **AI 优先开发者** — 使用 Claude Code、Codex 或 Gemini CLI

## 主要优势

| 使用 PackageFlow 前 | 使用 PackageFlow 后 |
|-------------------|-----------------|
| `cd project && npm run dev` | 点击「Dev」 |
| `git add . && git commit -m "..."` | AI 帮你生成提交信息 |
| `npm audit --json \| jq ...` | 可视化漏洞仪表板 |
| 在 5 个终端标签页间切换 | 一个统一的工作空间 |

## 功能

### 核心功能

| 功能 | 说明 | 文档 |
|------|------|------|
| **项目管理** | 导入、扫描和管理您的项目 | [阅读更多](./features/project-management.md) |
| **一键运行脚本** | 运行 npm/pnpm/yarn 脚本并实时显示输出 | [阅读更多](./features/one-click-scripts.md) |
| **可视化工作流** | 拖放式创建自动化流程 | [阅读更多](./features/visual-workflow.md) |
| **Monorepo 支持** | Nx、Turborepo、Lerna 集成 | [阅读更多](./features/monorepo-support.md) |

### Git 与版本控制

| 功能 | 说明 | 文档 |
|------|------|------|
| **Git 集成** | 可视化 Git 操作，无需 CLI | [阅读更多](./features/git-integration.md) |
| **Worktree 管理** | 使用快速切换器管理 Git worktree | [阅读更多](./features/worktree-management.md) |

### 部署与安全

| 功能 | 说明 | 文档 |
|------|------|------|
| **一键部署** | 部署至 Netlify、Cloudflare、GitHub Pages | [阅读更多](./features/one-click-deploy.md) |
| **安全扫描** | 可视化 npm audit 与漏洞详情 | [阅读更多](./features/security-audit.md) |

### AI 与自动化

| 功能 | 说明 | 文档 |
|------|------|------|
| **AI 集成** | 多供应商 AI（OpenAI、Anthropic、Gemini、Ollama） | [阅读更多](./features/ai-integration.md) |
| **MCP 服务器** | 让 Claude Code、Codex、Gemini CLI 控制 PackageFlow | [阅读更多](./features/mcp-server.md) |
| **Webhooks** | 传入/传出 webhook 自动化 | [阅读更多](./features/webhooks.md) |

### 工具与设置

| 功能 | 说明 | 文档 |
|------|------|------|
| **工具链管理** | Volta、Corepack、Node 版本检测 | [阅读更多](./features/toolchain-management.md) |
| **键盘快捷键** | 可自定义的快捷键参考 | [阅读更多](./features/keyboard-shortcuts.md) |

## 支持的技术

### 前端框架

React、Vue、Angular、Svelte、Solid、Next.js、Nuxt、Remix、Astro、Vite

### 包管理器

npm、pnpm、yarn、bun（从 lockfiles 自动检测）

### Monorepo 工具

Nx、Turborepo、Lerna、pnpm workspaces、yarn workspaces

### 部署平台

Netlify、Cloudflare Pages、GitHub Pages、Vercel（即将推出）

### AI 供应商

OpenAI（GPT-4o）、Anthropic（Claude 4）、Google（Gemini 2.0）、Ollama、LM Studio

## 系统要求

- **平台**：macOS（Windows 和 Linux 即将推出）
- **Node.js**：18+（用于项目检测）

## 支持

- [GitHub Issues](https://github.com/runkids/PackageFlow/issues) - 错误报告与功能建议
- [Releases](https://github.com/runkids/PackageFlow/releases) - 下载最新版本
