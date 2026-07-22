import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * Lightweight performance measurement hook to track render times of heavy views
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const duration = performance.now() - startTime.current;
    logger.info(`[Perf] ${componentName} rendered (#${renderCount.current}) in ${duration.toFixed(2)}ms`);
    startTime.current = performance.now();
  });
}
