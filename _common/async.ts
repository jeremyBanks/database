// deno-lint-ignore require-await
export const sleep = async (seconds: number, abort?: AbortSignal) => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, seconds * 1000);
    abort?.addEventListener("abort", () => clearTimeout(timeoutId));
  });
};
