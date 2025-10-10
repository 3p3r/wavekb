import d from "debug";
import assert from "assert";
import { SqlDatabase, UserInfo } from "remult";
import { PostgresDataProvider } from "remult/postgres";
import { BetterAuthError } from "better-auth";
import { remultNext } from "remult/remult-next";
import { entities } from "@/shared";
import { createDatabasePool } from "./pool";
import { auth } from "./auth";

const debug = d("wavekb:api");
const DEVELOPMENT = process.env.FRAMEWORK_ENVIRONMENT === "development";

debug("Operating under %s environment", process.env.FRAMEWORK_ENVIRONMENT);

if (!DEVELOPMENT && process.env.PORT) {
  assert(false, "port must not be set in production.");
}

export const api = remultNext({
  entities,
  dataProvider: new SqlDatabase(new PostgresDataProvider(createDatabasePool())),
  async getUser(request) {
    const s = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    });

    if (!s) {
      throw new BetterAuthError(
        "getUserInfo: No session found in request.",
        JSON.stringify(request)
      );
    }

    const { id = "", name = "" } = s ? s.user : {};
    const roles =
      "role" in s.user
        ? (s.user.role as string).split(",").map((r) => r.trim())
        : ([] satisfies string[]);

    return { id, name, roles } satisfies UserInfo;
  },
});

// todo: disable in production
export const openApiDoc = api.openApiDoc({
  title: "wavekb",
});
