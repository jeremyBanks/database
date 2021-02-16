/** @fileoverview A context object, used for database requests, inspired by
  * https://golang.org/pkg/context/.
  */

export class Context {
  constructor(
    /** Deadline after which this Context will be automatically cancelled. */
    readonly deadline?: number,
    readonly abortSignal?: AbortSignal,
  ){}

  withCancel(): Context {
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
