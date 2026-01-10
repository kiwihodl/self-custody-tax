/**
 * Rate Limiter with Token Bucket Algorithm
 *
 * Provides smooth rate limiting for API calls with:
 * - Configurable tokens per interval
 * - Automatic refill
 * - Queue-based request management
 * - AbortController support
 */

interface RateLimiterOptions {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens to add per interval
  refillIntervalMs: number; // Interval for refill
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private refillIntervalMs: number;
  private lastRefill: number;
  private queue: QueuedRequest<unknown>[] = [];
  private processing = false;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.refillIntervalMs = options.refillIntervalMs;
    this.tokens = options.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervalsElapsed = Math.floor(elapsed / this.refillIntervalMs);

    if (intervalsElapsed > 0) {
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + intervalsElapsed * this.refillRate
      );
      this.lastRefill = now;
    }
  }

  /**
   * Check if a token is available
   */
  private hasToken(): boolean {
    this.refill();
    return this.tokens > 0;
  }

  /**
   * Consume a token
   */
  private consumeToken(): boolean {
    if (this.hasToken()) {
      this.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Calculate wait time until next token
   */
  private getWaitTime(): number {
    if (this.hasToken()) return 0;
    const elapsed = Date.now() - this.lastRefill;
    return Math.max(0, this.refillIntervalMs - elapsed);
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      // Check if aborted
      if (request.signal?.aborted) {
        this.queue.shift();
        request.reject(new DOMException("Aborted", "AbortError"));
        continue;
      }

      // Wait for token if needed
      if (!this.consumeToken()) {
        const waitTime = this.getWaitTime();
        await this.delay(waitTime, request.signal);
        continue;
      }

      // Execute request
      this.queue.shift();
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (err) {
        request.reject(err);
      }
    }

    this.processing = false;
  }

  /**
   * Cancellable delay
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      signal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }

  /**
   * Execute a function with rate limiting
   */
  execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        signal,
      });
      this.processQueue();
    });
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    for (const request of this.queue) {
      request.reject(new DOMException("Cancelled", "AbortError"));
    }
    this.queue = [];
  }
}

// Default rate limiter for Mempool.space API (5 requests per second)
export const mempoolRateLimiter = new RateLimiter({
  maxTokens: 5,
  refillRate: 1,
  refillIntervalMs: 200, // 1 token every 200ms = 5/sec
});

/**
 * Exponential backoff with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  jitterFactor: number = 0.3
): number {
  // Exponential delay: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add random jitter (plus or minus jitterFactor)
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.max(0, cappedDelay + jitter);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    signal?: AbortSignal;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    signal,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check abort signal
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry abort errors
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(err, attempt)) {
        throw err;
      }

      // Calculate delay
      const delayMs = calculateBackoff(attempt, baseDelayMs, maxDelayMs);

      // Notify retry callback
      onRetry?.(err, attempt, delayMs);

      // Wait before retry
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delayMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }
  }

  throw lastError;
}
