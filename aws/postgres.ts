import { Stack } from "aws-cdk-lib";
import { Service } from "docker-compose-cdk";
import { CfnCluster } from "aws-cdk-lib/aws-dsql";

import { FrameworkConstruct } from "./framework";

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

    const db = new CfnCluster(this, "DsqlCluster", {
      deletionProtectionEnabled: false,
    });

    const region = Stack.of(this).region;
    const endpoint = `${db.attrIdentifier}.dsql.${region}.on.aws`;

    this._remoteEndpoint = endpoint;
    this.region = region;

    this.addToDockerCompose();

    const pgEndpoint = `postgres://${Postgres.LOCAL_POSTGRES_USER}:${Postgres.LOCAL_POSTGRES_PASSWORD}@postgres.local/${Postgres.LOCAL_POSTGRES_DB}`;
    this._localEndpoint = pgEndpoint;

    if (this.frameworkEnv === "development") {
      this.endpoint = this._localEndpoint;
    } else {
      this.endpoint = this._remoteEndpoint;
    }
  }

  addToDockerCompose() {
    new Service(this.dockerProject, "PostgresLocal", {
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
          source: "../.postgres", // relative to docker compose location
          target: "/var/lib/postgresql/data",
        },
      ],
    });
  }
}
