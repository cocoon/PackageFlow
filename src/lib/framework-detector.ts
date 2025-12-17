/**
 * Framework Detection Utility
 *
 * Detects project framework based on package.json dependencies and config files.
 */

import type { ProjectFramework, UIFramework } from '../types/project';
import type { ComponentType, SVGProps } from 'react';
import {
  Smartphone,
  Triangle,
  Disc,
  Rocket,
  Zap,
  Atom,
  MonitorSmartphone,
  Hexagon,
  Flame,
  Mountain,
  type LucideIcon,
} from 'lucide-react';
import { AngularIcon, VueIcon } from '../components/ui/FrameworkIcons';

// Type for icons that can be either LucideIcon or custom SVG component
type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Detect project framework from package.json
 * Priority order matters - more specific frameworks are checked first
 */
export function detectFramework(packageJson: PackageJson): ProjectFramework {
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};
  const allDeps = { ...deps, ...devDeps };

  // Check for Expo (must be before react-native)
  if ('expo' in allDeps) {
    return 'expo';
  }

  // Check for React Native (bare)
  if ('react-native' in deps) {
    return 'react-native';
  }

  // Check for Tauri
  if ('@tauri-apps/api' in allDeps || '@tauri-apps/cli' in allDeps) {
    return 'tauri';
  }

  // Check for Electron
  if ('electron' in allDeps) {
    return 'electron';
  }

  // Check for Next.js
  if ('next' in deps) {
    return 'next';
  }

  // Check for Remix
  if ('@remix-run/react' in deps || '@remix-run/node' in deps) {
    return 'remix';
  }

  // Check for TanStack Start
  if ('@tanstack/start' in deps || '@tanstack/react-start' in deps) {
    return 'tanstack-start';
  }

  // Check for Nuxt
  if ('nuxt' in deps || 'nuxt3' in deps) {
    return 'nuxt';
  }

  // Check for Angular
  if ('@angular/core' in deps) {
    return 'angular';
  }

  // Check for Vue CLI
  if ('@vue/cli-service' in devDeps) {
    return 'vue-cli';
  }

  // Check for Create React App
  if ('react-scripts' in deps || 'react-scripts' in devDeps) {
    return 'cra';
  }

  // Check for Vite (generic, should be last among build tools)
  if ('vite' in devDeps) {
    return 'vite';
  }

  return null;
}

/**
 * Detect UI framework from package.json
 * Returns the primary UI library used (React, Vue, Svelte, etc.)
 * Note: Returns null for React Native projects (they use 'react-native' framework instead)
 */
export function detectUIFramework(packageJson: PackageJson): UIFramework {
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  // Skip React detection if this is a React Native project
  // React Native projects should show "React Native" as their framework, not "React" as UI framework
  const isReactNative = 'react-native' in deps || 'expo' in deps || 'expo' in devDeps;

  // Check for React (most common) - but not for React Native projects
  if (!isReactNative && ('react' in deps || 'react' in devDeps)) {
    return 'react';
  }

  // Check for Preact (must check before vue since some projects use both)
  if ('preact' in deps) {
    return 'preact';
  }

  // Check for Vue
  if ('vue' in deps) {
    return 'vue';
  }

  // Check for Svelte
  if ('svelte' in deps || 'svelte' in devDeps) {
    return 'svelte';
  }

  // Check for SolidJS
  if ('solid-js' in deps) {
    return 'solid';
  }

  // Check for Lit
  if ('lit' in deps || 'lit-element' in deps) {
    return 'lit';
  }

  // Check for Qwik
  if ('@builder.io/qwik' in deps) {
    return 'qwik';
  }

  return null;
}

/**
 * Framework display configuration
 * Colors match each framework's official brand color
 */
export const FRAMEWORK_CONFIG: Record<
  NonNullable<ProjectFramework>,
  { label: string; color: string; icon: IconComponent }
> = {
  expo: {
    label: 'Expo',
    color: 'bg-[#000020]/40 text-white', // Expo dark blue/black
    icon: Smartphone,
  },
  'react-native': {
    label: 'React Native',
    color: 'bg-[#61DAFB]/20 text-[#61DAFB]', // React cyan
    icon: Smartphone,
  },
  next: {
    label: 'Next.js',
    color: 'bg-white/10 text-white', // Next.js black/white
    icon: Triangle,
  },
  remix: {
    label: 'Remix',
    color: 'bg-[#121212]/40 text-white', // Remix dark
    icon: Disc,
  },
  'tanstack-start': {
    label: 'TanStack Start',
    color: 'bg-[#FF4154]/20 text-[#FF4154]', // TanStack red
    icon: Rocket,
  },
  vite: {
    label: 'Vite',
    color: 'bg-[#646CFF]/20 text-[#646CFF]', // Vite purple-blue
    icon: Zap,
  },
  cra: {
    label: 'CRA',
    color: 'bg-[#61DAFB]/20 text-[#61DAFB]', // React cyan
    icon: Atom,
  },
  nuxt: {
    label: 'Nuxt',
    color: 'bg-[#00DC82]/20 text-[#00DC82]', // Nuxt green
    icon: Mountain,
  },
  'vue-cli': {
    label: 'Vue CLI',
    color: 'bg-[#42B883]/20 text-[#42B883]', // Vue green
    icon: VueIcon,
  },
  angular: {
    label: 'Angular',
    color: 'bg-[#DD0031]/20 text-[#DD0031]', // Angular red
    icon: AngularIcon,
  },
  electron: {
    label: 'Electron',
    color: 'bg-[#9FEAF9]/20 text-[#9FEAF9]', // Electron teal
    icon: MonitorSmartphone,
  },
  tauri: {
    label: 'Tauri',
    color: 'bg-[#FFC131]/20 text-[#FFC131]', // Tauri yellow
    icon: MonitorSmartphone,
  },
};

/**
 * UI Framework display configuration
 * Colors match each framework's official brand color
 */
export const UI_FRAMEWORK_CONFIG: Record<
  NonNullable<UIFramework>,
  { label: string; color: string; icon: IconComponent }
> = {
  react: {
    label: 'React',
    color: 'bg-[#61DAFB]/20 text-[#61DAFB]', // React cyan
    icon: Atom,
  },
  vue: {
    label: 'Vue',
    color: 'bg-[#42B883]/20 text-[#42B883]', // Vue green
    icon: VueIcon,
  },
  svelte: {
    label: 'Svelte',
    color: 'bg-[#FF3E00]/20 text-[#FF3E00]', // Svelte orange-red
    icon: Flame,
  },
  solid: {
    label: 'Solid',
    color: 'bg-[#2C4F7C]/20 text-[#446B9E]', // Solid blue
    icon: Hexagon,
  },
  preact: {
    label: 'Preact',
    color: 'bg-[#673AB8]/20 text-[#673AB8]', // Preact purple
    icon: Atom,
  },
  lit: {
    label: 'Lit',
    color: 'bg-[#325CFF]/20 text-[#325CFF]', // Lit blue
    icon: Flame,
  },
  qwik: {
    label: 'Qwik',
    color: 'bg-[#AC7EF4]/20 text-[#AC7EF4]', // Qwik purple
    icon: Zap,
  },
};

/**
 * Check if UI framework badge should be shown alongside the main framework badge
 * Some frameworks already imply their UI framework (e.g., Next.js = React)
 */
export function shouldShowUIFrameworkBadge(
  framework: ProjectFramework,
  uiFramework: UIFramework
): boolean {
  if (!uiFramework) return false;

  // These frameworks already imply React
  if (
    framework === 'next' ||
    framework === 'remix' ||
    framework === 'cra' ||
    framework === 'tanstack-start'
  ) {
    return false;
  }
  // These frameworks already imply Vue
  if (framework === 'nuxt' || framework === 'vue-cli') {
    return false;
  }
  // Angular is its own UI framework
  if (framework === 'angular') {
    return false;
  }
  // React Native/Expo imply React
  if (framework === 'expo' || framework === 'react-native') {
    return false;
  }

  // For generic build tools (Vite, Electron, Tauri), show the UI framework
  return true;
}
