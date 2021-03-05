import { async } from "./deps.ts";

// Inspired by https://golang.org/pkg/context/, but currently just used to
// propagate cancellations internally in sql.ts.

type ContextDoneReason = "context cancelled" | "context deadline expired";

const never: Promise<never> = new Promise(() => {});

export class ContextDoneError extends Error {
  constructor(reason: ContextDoneReason) {
    super(reason);
  }
}

export class Context {
  static readonly Background = Context.root("Background");
  static readonly TODO = Context.root("TODO");

  static root(label: string): Context {
    return new Context(label, [never]);
  }

  private doneReason: Promise<ContextDoneReason>;
  private constructor(
    private label: string,
    signals: Array<Promise<ContextDoneReason>> = [],
  ) {
    this.doneReason = Promise.race(signals);
  }

  async done(): Promise<ContextDoneReason> {
    return await this.doneReason;
  }

  async error(): Promise<never> {
    throw new ContextDoneError(await this.doneReason);
  }

  /** Wraps a promise so that it will be rejected if this context is cancelled. */
  async cancelling<T>(p: Promise<T>): Promise<T> {
    return await Promise.race([p, this.error()]);
  }

  toString() {
    return this.label;
  }

  withCancel(): [Context, () => void] {
    const deferred = async.deferred<ContextDoneReason>();
    const context = new Context(`${this.label}.withCancel()`, [
      this.done(),
      deferred,
    ]);
    return [context, () => deferred.resolve("context cancelled")];
  }

  withTimeout(timeoutMs: number): Context {
    return new Context(`${this.label}.withTimeout(${timeoutMs})`, [
      this.done(),
      async.delay(timeoutMs).then((): ContextDoneReason =>
        "context deadline expired"
      ),
    ]);
  }

  withDeadline(deadlineMs: number): Context {
    return new Context(`${this.label}.withDeadline(${deadlineMs})`, [
      this.done(),
      async.delay(deadlineMs - Date.now()).then(
        (): ContextDoneReason => "context deadline expired",
      ),
    ]);
  }
}
