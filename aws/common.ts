import { Arn, ArnFormat } from "aws-cdk-lib";
import { createHash } from "node:crypto";

import Prando from "prando";
import stringHash from "string-hash";

export function smallHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

export function localArnFormat(service: string, resource: string): string {
  return Arn.format({
    partition: "aws",
    account: LOCAL_AWS_ACCOUNT_ID,
    region: LOCAL_AWS_REGION,
    service,
    resource,
  });
}

export const getRandomDeterministicPort = (() => {
  const history: number[] = [];

  return (seed: number | string = 0): number => {
    const counter =
      typeof seed === "undefined"
        ? history.length
        : typeof seed === "number"
          ? seed
          : stringHash(seed);
    const rng = new Prando(counter);
    const port = rng.nextInt(1024, 65535);
    if (history.includes(port)) {
      return getRandomDeterministicPort(counter + 1);
    }
    history.push(port);
    return port;
  };
})();

export const LOCAL_AWS_REGION = "us-east-1";
export const LOCAL_AWS_ACCOUNT_ID = "123456789012";
export const LOCAL_AWS_ACCESS_KEY_ID = "testAccessKey";
export const LOCAL_AWS_SECRET_ACCESS_KEY = "testSecretAccessKey";
