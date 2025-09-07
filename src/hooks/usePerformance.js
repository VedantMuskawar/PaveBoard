import { useEffect, useRef, useCallback, useState } from 'react';

// Performance optimization hook
export const usePerformance = () => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
  });

  const logPerformance = useCallback((componentName) => {
    const renderTime = Date.now() - startTime.current;
    console.log(`🚀 ${componentName} - Renders: ${renderCount.current}, Time: ${renderTime}ms`);
  }, []);

  const measureRender = useCallback((fn, componentName) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`⏱️ ${componentName} render time: ${(end - start).toFixed(2)}ms`);
    return result;
  }, []);

  return {
    renderCount: renderCount.current,
    logPerformance,
    measureRender
  };
};

// Debounce hook for performance
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for performance
export const useThrottle = (value, delay) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + delay) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
};

// Memo hook for expensive calculations
export const useMemoizedCallback = (callback, deps) => {
  const callbackRef = useRef();
  const depsRef = useRef();

  if (!callbackRef.current || !areEqual(depsRef.current, deps)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return callbackRef.current;
};

// Helper function to compare dependencies
const areEqual = (prevDeps, nextDeps) => {
  if (!prevDeps || !nextDeps) return false;
  if (prevDeps.length !== nextDeps.length) return false;
  
  return prevDeps.every((dep, index) => dep === nextDeps[index]);
};
