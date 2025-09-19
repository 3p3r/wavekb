import { createHash } from "node:crypto";

export function smallHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

export const LOCAL_AWS_REGION = "us-east-1";
export const LOCAL_AWS_ACCOUNT_ID = "123456789012";
export const LOCAL_AWS_ACCESS_KEY_ID = "testAccessKey";
export const LOCAL_AWS_SECRET_ACCESS_KEY = "testSecretAccessKey";
