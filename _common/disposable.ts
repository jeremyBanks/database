export class Disposable<As = unknown> {
  dispose(): unknown {
    if (this.disposeAsync !== Disposable.prototype.disposeAsync) {
      throw new TypeError(
        "non-async disposal of type with disposeAsync() implementation but no dispose() implementation",
      );
    }
    return;
  }

  async disposeAsync(): Promise<unknown> {
    return await this.dispose();
  }

  #used = false;
  use<Result>(usage: (resource: unknown extends As ? this : As) => Result) {
    if (this.#used) {
      throw new TypeError("resource can only be .use()ed once");
    } else {
      this.#used = true;
    }

    let result;
    try {
      // deno-lint-ignore no-explicit-any
      result = usage(this as any);
    } catch (error) {
      this.dispose();
      throw error;
    }

    if (result instanceof Promise) {
      return result.then(
        async (result) => {
          await this.disposeAsync();
          return result;
        },
        async (error) => {
          await this.disposeAsync();
          throw error;
        },
      );
    } else {
      this.dispose();
    }

    return result;
  }
}
