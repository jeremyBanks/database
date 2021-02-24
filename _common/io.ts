const utf8Encoder = new TextEncoder();

export const print = (...args: unknown[]) =>
  Deno.writeAllSync(Deno.stdout, utf8Encoder.encode(`${args.join(" ")}`));

export const println = (...args: unknown[]) =>
  Deno.writeAllSync(Deno.stdout, utf8Encoder.encode(`${args.join(" ")}\n`));

export const eprint = (...args: unknown[]) =>
  Deno.writeAllSync(Deno.stderr, utf8Encoder.encode(`${args.join(" ")}`));

export const eprintln = (...args: unknown[]) =>
  Deno.writeAllSync(Deno.stderr, utf8Encoder.encode(`${args.join(" ")}\n`));
