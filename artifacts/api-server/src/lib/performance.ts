import { logger } from "./logger";

interface QueryMetrics {
  name: string;
  duration: number;
  count: number;
}

export class PerformanceTracker {
  private requestStart: number;
  private queryMetrics: Map<string, QueryMetrics> = new Map();
  private totalQueries: number = 0;

  constructor(private requestId?: string) {
    this.requestStart = performance.now();
  }

  recordQuery(name: string, duration: number): void {
    this.totalQueries++;
    const existing = this.queryMetrics.get(name);
    if (existing) {
      existing.duration += duration;
      existing.count++;
    } else {
      this.queryMetrics.set(name, { name, duration, count: 1 });
    }
  }

  recordQueryStart(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordQuery(name, duration);
    };
  }

  getMetrics() {
    const totalDuration = performance.now() - this.requestStart;
    const queries = Array.from(this.queryMetrics.values());
    
    return {
      requestId: this.requestId,
      totalDuration: Math.round(totalDuration),
      totalQueries: this.totalQueries,
      queries: queries.map(q => ({
        name: q.name,
        count: q.count,
        totalDuration: Math.round(q.duration),
        avgDuration: Math.round(q.duration / q.count),
      })),
    };
  }

  log(endpoint: string, statusCode: number = 200): void {
    const metrics = this.getMetrics();
    logger.info(
      {
        endpoint,
        statusCode,
        ...metrics,
      },
      `[PERF] ${endpoint} completed in ${metrics.totalDuration}ms (${metrics.totalQueries} queries)`
    );
  }

  logError(endpoint: string, error: Error, statusCode: number = 500): void {
    const metrics = this.getMetrics();
    logger.error(
      {
        endpoint,
        statusCode,
        error: error.message,
        ...metrics,
      },
      `[PERF] ${endpoint} failed after ${metrics.totalDuration}ms (${metrics.totalQueries} queries)`
    );
  }
}

// Global query counter for tracking all database activity
export const globalQueryCounter = {
  count: 0,
  reset: function() { this.count = 0; },
  increment: function() { this.count++; },
  get: function() { return this.count; },
};
