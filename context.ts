/** @fileoverview A context object, used for database requests, inspired by
  * https://golang.org/pkg/context/.
  */

export const ContextValueKey = Symbol("ContextKeyType");
export type ContextValueKey = typeof ContextValueKey;

export type ContextValue<Key extends symbol, Value extends unknown = unknown> = Key & {
  [ContextValueKey]: Value
};

const ContextSentryId = Symbol("ContextSentryId");
type ContextSentryId = ContextValue<typeof ContextSentryId, string>;

export class CancelledError extends Error {
  constructor() {
    super("context cancelled");
  }
}
export class DeadlineExceededError extends Error {
  constructor() {
    super("context deadline exceeded");
  }
}

export class Context {
  constructor(
    private deadlineElapsed?: Promise<void>,
    private explicitlyCancelled?: Promise<void>,
    private values?: Record<symbol, unknown>,
  ) {
    // do something?
  }

    withValue<Key extends ContextValue<symbol>>(key: Key, value: Key[ContextValueKey]) {
      return new Context(this.deadlineElapsed, this.explicitlyCancelled, {
        ...this.values,
        [key]: value
      })    
    }
    
    getValue<Key extends ContextValue<symbol>>(key: Key): Key[ContextValueKey] | undefined {
      return this.values?.[key];
    }

    static background(): Context {
     return background; 
    }
    
    static TODO(): Context {
      return TODO;
    }
    
    toString() {
      
    }
 } {}

 const background = new Context();
 const TODO = new Context();
 
  withAbortController(): Context {
    const abortController = new AbortController();

    return new Context();
  }

  withTimeout(timeoutMs: number): Context {
    return this.withDeadline(Date.now() + timeoutMs);
  }

  withDeadline(deadlineMs: number): Context {
    return new Context();
  }
}
