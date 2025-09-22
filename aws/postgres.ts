import assert from "node:assert";
import { resolve } from "node:path";

import { Stack } from "aws-cdk-lib";
import { Service } from "docker-compose-cdk";
import { CfnCluster } from "aws-cdk-lib/aws-dsql";

import { FrameworkConstruct } from "./framework";
import { getRandomDeterministicPort } from "./common";

/**
 * A Postgres SQL service that deploys to Amazon DSQL on AWS and Postgres in Docker Compose.
 */
export class Postgres extends FrameworkConstruct {
  private remoteEndpoint: string | undefined;
  private localEndpoint: string | undefined;
  private localPort: number | undefined;
  private endpoint: string | undefined;

  static readonly LOCAL_POSTGRES_USER = "wavekb" as const;
  static readonly LOCAL_POSTGRES_PASSWORD = "local" as const;
  static readonly LOCAL_POSTGRES_DB = "wavekb-local" as const;

  constructor(scope: FrameworkConstruct.Interface, id: string) {
    super(scope, id);
    this.initialize();
  }

  getEndpoint(): string {
    assert(this.endpoint, "Postgres endpoint not initialized");
    return this.endpoint;
  }

  addToAwsDeployment(id: string): void {
    const db = new CfnCluster(this, "DsqlCluster", {
      deletionProtectionEnabled: false,
    });

    const region = Stack.of(this).region;
    const endpoint = `${db.attrIdentifier}.dsql.${region}.on.aws`;

    this.remoteEndpoint = endpoint;

    this.localPort = getRandomDeterministicPort(this.getScopedName("Postgres"));
    this.localEndpoint = `postgres://${Postgres.LOCAL_POSTGRES_USER}:${
      Postgres.LOCAL_POSTGRES_PASSWORD
    }@${this.getScopedName("postgres.local", ".")}:${this.localPort}/${
      Postgres.LOCAL_POSTGRES_DB
    }`;

    if (this.frameworkEnv === "development") {
      this.endpoint = this.localEndpoint;
    } else {
      this.endpoint = this.remoteEndpoint;
    }
  }

  addToDockerCompose() {
    assert(this.localPort, "Local port not initialized");
    return new Service(this.dockerProject, this.getScopedName("Postgres"), {
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
          aliases: [this.getScopedName("postgres.local", ".")],
        },
      ],
      command: "postgres",
      ports: [
        {
          container: 5432,
          host: this.localPort,
        },
      ],
      volumes: [
        {
          source: this.frameworkApp.toDockerVolumeSourcePath(
            resolve(
              __dirname,
              "..",
              ".postgres",
              this.getScopedName(Postgres.LOCAL_POSTGRES_DB)
            )
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
