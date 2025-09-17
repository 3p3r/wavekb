import { createHash } from "node:crypto";

export function smallHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}
