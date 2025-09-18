import assert from "node:assert";
import { resolve } from "node:path";

import { Stack } from "aws-cdk-lib";
import { Service } from "docker-compose-cdk";
import { CfnCluster } from "aws-cdk-lib/aws-dsql";

import { FrameworkConstruct } from "./framework";

let EXISTS = false;

export class Postgres extends FrameworkConstruct {
  readonly endpoint: string;
  readonly region: string;

  private readonly _remoteEndpoint: string;
  private readonly _localEndpoint: string;

  static readonly LOCAL_POSTGRES_USER = "wavekb" as const;
  static readonly LOCAL_POSTGRES_PASSWORD = "local" as const;
  static readonly LOCAL_POSTGRES_DB = "wavekb-local" as const;

  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);

    EXISTS = !(assert(
      !EXISTS,
      [
        "You reached the cap on this stack.",
        "Only one Postgres database construct can be created!",
      ].join(" ")
    ) as unknown);

    const db = new CfnCluster(this, "DsqlCluster", {
      deletionProtectionEnabled: false,
    });

    const region = Stack.of(this).region;
    const endpoint = `${db.attrIdentifier}.dsql.${region}.on.aws`;

    this._remoteEndpoint = endpoint;
    this.region = region;

    this.service = this.addToDockerCompose();

    const pgEndpoint = `postgres://${Postgres.LOCAL_POSTGRES_USER}:${Postgres.LOCAL_POSTGRES_PASSWORD}@postgres.local/${Postgres.LOCAL_POSTGRES_DB}`;
    this._localEndpoint = pgEndpoint;

    if (this.frameworkEnv === "development") {
      this.endpoint = this._localEndpoint;
    } else {
      this.endpoint = this._remoteEndpoint;
    }
  }

  addToDockerCompose() {
    return new Service(this.dockerProject, "PostgresLocal", {
      image: {
        image: "postgres",
        tag: "latest",
      },
      environment: {
        POSTGRES_DB: Postgres.LOCAL_POSTGRES_DB,
        POSTGRES_USER: Postgres.LOCAL_POSTGRES_USER,
        POSTGRES_PASSWORD: Postgres.LOCAL_POSTGRES_PASSWORD,
        POSTGRES_HOST_AUTH_METHOD: "trust",
      },
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["postgres.local"],
        },
      ],
      command: "postgres",
      ports: [
        {
          container: 5432,
          host: 5432,
        },
      ],
      volumes: [
        {
          source: this.frameworkApp.toDockerVolumeSourcePath(
            resolve(__dirname, "..", ".postgres")
          ),
          target: "/var/lib/postgresql/data",
        },
      ],
      healthCheck: {
        test: ["CMD-SHELL", `pg_isready -U ${Postgres.LOCAL_POSTGRES_USER}`],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    });
  }
}
