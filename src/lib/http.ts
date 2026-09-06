import { NextResponse } from "next/server";

/**
 * Reads a JSON body without letting a malformed one become a 500.
 *
 * `req.json()` throws on anything that is not valid JSON, and an unhandled
 * throw in a route handler is a 500 with a stack in the server log — which
 * tells an attacker they found something and tells us nothing.
 */
export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const badRequest = (error: unknown, status = 400) => NextResponse.json({ error }, { status });

/**
 * Wraps a handler so an unexpected throw becomes a clean 500 with no detail,
 * while the real error still reaches the server log.
 */
export function guard<A extends unknown[]>(
  name: string,
  fn: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error(`[${name}]`, e);
      return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}
