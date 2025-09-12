import d from "debug";
import { URL } from "url";
import assert from "assert";

import { Pool } from "pg";
import { SqlDatabase } from "remult";
import { PostgresDataProvider } from "remult/postgres";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { remultApi } from "remult/remult-next";

const debug = d("wavekb:api");
const DEVELOPMENT = process.env.FRAMEWORK_ENVIRONMENT === "development";

debug("Operating under %s environment", process.env.FRAMEWORK_ENVIRONMENT);

if (!DEVELOPMENT && process.env.PORT) {
  assert(false, "port must not be set in production.");
}

export const api = remultApi({
  admin: true, // todo: disable in production
  dataProvider: async () => {
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
      assert(
        process.env.POSTGRES_URL,
        "POSTGRES_URL must be set in production"
      );
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
    return new SqlDatabase(new PostgresDataProvider(pool));
  },
});
