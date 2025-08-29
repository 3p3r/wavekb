import { Stack } from "aws-cdk-lib";
import { CfnCluster } from "aws-cdk-lib/aws-dsql";
import { Construct } from "constructs";
import { type Project, Service } from "docker-compose-cdk";

export interface PostgresProps {
  dockerCompose?: Project;
}

export class Postgres extends Construct {
  readonly endpoint: string;
  readonly region: string;

  constructor(scope: Construct, id: string, props?: PostgresProps) {
    super(scope, id);

    const db = new CfnCluster(this, "DsqlCluster", {
      deletionProtectionEnabled: false,
    });

    const region = Stack.of(this).region;
    const endpoint = `${db.attrIdentifier}.dsql.${region}.on.aws`;

    this.endpoint = endpoint;
    this.region = region;

    if (props?.dockerCompose) {
      this.endpoint = this.addToDockerCompose(props.dockerCompose);
    }
  }

  private addToDockerCompose(project: Project) {
    const POSTGRES_USER = "wavekb";
    const POSTGRES_PASSWORD = "local";
    const POSTGRES_DB = "wavekb-local";
    new Service(project, "PostgresLocal", {
      image: {
        image: "postgres",
        tag: "latest"
      },
      environment: {
        POSTGRES_DB,
        POSTGRES_USER,
        POSTGRES_PASSWORD,
        POSTGRES_HOST_AUTH_METHOD: "trust"
      },
      command: "postgres",
      ports: [{
        container: 5432,
        host: 5432
      }],
      volumes: [{
        source: "../.postgres", // relative to docker compose location
        target: "/var/lib/postgresql/data",
      }]
    });
    // todo: use Networks for cross container communication
    const endpoint = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost/${POSTGRES_DB}`;
    return endpoint;
  }
}
