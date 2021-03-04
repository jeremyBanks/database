// deno-lint-ignore-file ban-types require-await

import { async, log } from "./deps.ts";

/**
Simple async mutex, with object access enforced by revokable proxies.
Errors unlock the mutex, they don't poison it.
*/
export class Mutex<Resource extends object = {}> {
  constructor(private resource: Resource) {}

  /** A mutex without any associated value. */
  static marker() {
    return new Mutex<Record<never, never>>({});
  }

  private poisonedError: undefined | Error;

  private queueTail: undefined | Promise<void>;

  /**
  Marks the mutex as "poisoned" with a given error, that will be raised on
  any future attempts to use the mutex. For internal use when the
  mutex is being disposed of.
  */
  private poison(error: Error) {
    if (this.poisonedError) throw this.poisonedError;

    this.poisonedError = error;
  }

  /**
  Blocks until the lock is obtained, then returns the proxied value and a
  callback to release the lock.
   */
  async lock(): Promise<{
    resource: Resource;
    release(): void;
  }> {
    const handle = async.deferred<void>();
    const result = async.deferred<{
      resource: Resource;
      release(): void;
    }>();
    this.use(async (resource) => {
      result.resolve({
        resource,
        release() {
          handle.resolve();
        },
      });
    });
    return result;
  }

  /**
  Runs a synchronous callback with exclusive access to the resource if is
  immediately available, otherwise returns undefined.
  */
  tryUseSync<Result = void>(f: (resource: Resource) => Result): Result | void {
    if (this.poisonedError) throw this.poisonedError;

    if (this.queueTail === undefined) {
      const { proxy, revoke } = Proxy.revocable(this.resource, {});
      try {
        return f(proxy);
      } catch (error) {
        log.error(`uncaught error while holding mutex: ${error.stack}`);
        throw error;
      } finally {
        revoke();
      }
    }
  }

  /**
  Runs an async callback with exclusive access to the resource when it is
  next available, FIFO.
  */
  async use<Result = void>(f: (resource: Resource) => Result): Promise<Result> {
    if (this.poisonedError) throw this.poisonedError;

    const { proxy, revoke } = Proxy.revocable(this.resource, {});
    const result = Promise.resolve(this.queueTail).then(async () => {
      if (this.poisonedError) throw this.poisonedError;

      return f(proxy);
    });
    this.queueTail = (async () => {
      try {
        return void await result;
      } catch (error) {
        log.error(`uncaught error while holding mutex: ${error.stack}`);
        return undefined;
      } finally {
        revoke();
      }
    })();
    return result;
  }

  /**Allows any currently-queued operations execute, then poisons the mutex. */
  async dispose(): Promise<void> {
    await this.use(async () => {
      this.poison(new TypeError("mutex disposed"));
    });
  }
}
