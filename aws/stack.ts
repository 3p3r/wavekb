import * as cdk from "aws-cdk-lib";
import { NextJSApp } from "./nextjs";

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NextJSApp(this, "NextJSApp");
  }
}
