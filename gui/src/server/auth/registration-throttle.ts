export interface ThrottleResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RegistrationThrottle {
  consume(key: string, now: Date): ThrottleResult;
}

interface ThrottleEntry {
  count: number;
  windowStartedAtMs: number;
}

export interface InMemoryRegistrationThrottleOptions {
  maxAttempts: number;
  windowMs: number;
}

export class InMemoryRegistrationThrottle implements RegistrationThrottle {
  private readonly entries = new Map<string, ThrottleEntry>();

  constructor(private readonly options: InMemoryRegistrationThrottleOptions) {
    if (options.maxAttempts < 1) {
      throw new Error("maxAttempts must be >= 1");
    }

    if (options.windowMs < 1000) {
      throw new Error("windowMs must be >= 1000");
    }
  }

  consume(key: string, now: Date): ThrottleResult {
    const nowMs = now.getTime();
    const existing = this.entries.get(key);

    if (!existing || nowMs - existing.windowStartedAtMs >= this.options.windowMs) {
      this.entries.set(key, {
        count: 1,
        windowStartedAtMs: nowMs,
      });

      this.compact(nowMs);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    this.entries.set(key, existing);

    if (existing.count <= this.options.maxAttempts) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterMs = Math.max(0, this.options.windowMs - (nowMs - existing.windowStartedAtMs));
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  private compact(nowMs: number): void {
    for (const [key, entry] of this.entries.entries()) {
      if (nowMs - entry.windowStartedAtMs >= this.options.windowMs) {
        this.entries.delete(key);
      }
    }
  }
}

export const defaultRegistrationThrottle = new InMemoryRegistrationThrottle({
  maxAttempts: 8,
  windowMs: 10 * 60 * 1000,
});
