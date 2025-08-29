import * as cdk from "aws-cdk-lib";
import { NextJSApp } from "./nextjs";
import { Postgres } from "./postgres";
import { Project } from "docker-compose-cdk";

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps & { dockerCompose: Project }) {
    super(scope, id, props);

    const dockerCompose = props?.dockerCompose;

    new Postgres(this, "Postgres", { dockerCompose });
    new NextJSApp(this, "NextJSApp", { dockerCompose });
  }
}
