/**
 * Terminal height persistence hook
 * Uses Tauri Store Plugin to save user-adjusted height
 */

import { load, type Store } from '@tauri-apps/plugin-store';
import { useState, useEffect, useCallback, useRef } from 'react';

const STORE_KEY = 'terminalHeight';
const DEFAULT_HEIGHT = 256;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;
const DEBOUNCE_MS = 500;

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await load('packageflow.json');
  }
  return store;
}

export function useTerminalHeight() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    async function loadHeight() {
      try {
        const s = await getStore();
        const savedHeight = await s.get<number>(STORE_KEY);
        if (savedHeight && savedHeight >= MIN_HEIGHT && savedHeight <= MAX_HEIGHT) {
          setHeight(savedHeight);
        }
      } catch (error) {
        console.error('Failed to load terminal height:', error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadHeight();
  }, []);

  const updateHeight = useCallback((newHeight: number) => {
    const clampedHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, newHeight));
    setHeight(clampedHeight);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const s = await getStore();
        await s.set(STORE_KEY, clampedHeight);
        await s.save();
      } catch (error) {
        console.error('Failed to save terminal height:', error);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    height,
    updateHeight,
    isLoaded,
    MIN_HEIGHT,
    MAX_HEIGHT,
    DEFAULT_HEIGHT,
  };
}
