import * as cdk from "aws-cdk-lib";
import { NextJSApp } from "./nextjs";
import { Project } from "docker-compose-cdk";

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps & { dockerCompose: Project }) {
    super(scope, id, props);

    new NextJSApp(this, "NextJSApp", {
      dockerCompose: props?.dockerCompose
    });
  }
}
