// deno-lint-ignore-file ban-types require-await

import { log } from "./deps.ts";

/** Simple async mutex. (Errors unlock the mutex, it doesn't get poisoned.) */
export class Mutex<Resource extends object = {}> {
  constructor(private resource: Resource) {}

  private queueTail: undefined | Promise<void>;

  /** Runs a synchronous callback with exclusive access to the resource if is
   * immediately available, otherwise returns undefined. */
  tryUseSync<Result = void>(f: (resource: Resource) => Result): Result | void {
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

  /** Runs an async callback with exclusive access to the resource when it is
   * next available, FIFO. */
  async use<Result = void>(f: (resource: Resource) => Result): Promise<Result> {
    const { proxy, revoke } = Proxy.revocable(this.resource, {});
    const result = Promise.resolve(this.queueTail).then(async () => f(proxy));
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
}
