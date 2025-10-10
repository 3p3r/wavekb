import d from "debug";
import { Pool } from "pg";
import assert from "assert";
import { URL } from "url";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

const debug = d("wavekb:api");
const DEVELOPMENT = process.env.FRAMEWORK_ENVIRONMENT === "development";

debug("Operating under %s environment", process.env.FRAMEWORK_ENVIRONMENT);

export function createDatabasePool() {
  let pool: Pool;
  const max = 20;
  const idleTimeoutMillis = 30000;
  const connectionTimeoutMillis = 5000;
  if (DEVELOPMENT) {
    debug("Connecting to database in development");
    const url = new URL(process.env.POSTGRES_URL || "");
    assert(url.hostname, "POSTGRES_URL must have a hostname in development");
    pool = new Pool({
      host: url.hostname,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: false,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });
  } else {
    debug("Connecting to database in production");
    assert(process.env.POSTGRES_URL, "POSTGRES_URL must be set in production");
    const signer = new DsqlSigner({
      hostname: process.env.POSTGRES_URL,
    });
    pool = new Pool({
      host: process.env.POSTGRES_URL,
      port: 5432,
      database: "postgres",
      user: "admin", // todo: add IAM integration to avoid connecting with admin
      password: async function () {
        return await signer.getDbConnectAdminAuthToken();
      },
      ssl: true,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });
  }
  return pool;
}
