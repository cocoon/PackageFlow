/**
 * useDebouncedOutput Hook
 * Feature: Performance optimization
 *
 * Batches high-frequency script output updates to reduce state updates
 * and improve UI responsiveness.
 */

import { useRef, useCallback, useEffect } from 'react';

interface OutputBuffer {
  [executionId: string]: string;
}

interface UseDebouncedOutputOptions {
  /** Debounce delay in milliseconds (default: 100ms) */
  delay?: number;
  /** Maximum buffer size before force flush (default: 50KB) */
  maxBufferSize?: number;
}

/**
 * Hook for debouncing high-frequency output updates
 *
 * @param onFlush - Callback when buffered outputs should be applied
 * @param options - Configuration options
 * @returns Function to buffer output
 */
export function useDebouncedOutput(
  onFlush: (outputs: OutputBuffer) => void,
  options: UseDebouncedOutputOptions = {}
) {
  const { delay = 100, maxBufferSize = 50 * 1024 } = options;

  const bufferRef = useRef<OutputBuffer>({});
  const bufferSizeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFlushRef = useRef(onFlush);

  // Keep callback reference fresh
  useEffect(() => {
    onFlushRef.current = onFlush;
  }, [onFlush]);

  // Flush the buffer
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (Object.keys(bufferRef.current).length > 0) {
      onFlushRef.current({ ...bufferRef.current });
      bufferRef.current = {};
      bufferSizeRef.current = 0;
    }
  }, []);

  // Add output to buffer
  const bufferOutput = useCallback(
    (executionId: string, output: string) => {
      // Accumulate output
      if (bufferRef.current[executionId]) {
        bufferRef.current[executionId] += output;
      } else {
        bufferRef.current[executionId] = output;
      }
      bufferSizeRef.current += output.length;

      // Force flush if buffer is too large
      if (bufferSizeRef.current >= maxBufferSize) {
        flush();
        return;
      }

      // Schedule debounced flush
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flush, delay);
    },
    [delay, maxBufferSize, flush]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Flush any remaining buffer on unmount
      if (Object.keys(bufferRef.current).length > 0) {
        onFlushRef.current({ ...bufferRef.current });
      }
    };
  }, []);

  return { bufferOutput, flush };
}

export default useDebouncedOutput;
