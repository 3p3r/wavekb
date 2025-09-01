import * as awsCdk from "aws-cdk-lib";
import * as dockerComposeCdk from "docker-compose-cdk";
import { stringify as YAMLStringify } from "yaml";
import { Construct, IConstruct } from "constructs";

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export class FrameworkApp extends awsCdk.App {
  public readonly dockerCompose: dockerComposeCdk.App;
  public readonly dockerProject: dockerComposeCdk.Project;
  public readonly dockerNetwork: dockerComposeCdk.Network;
  constructor() {
    super();
    this.dockerCompose = new dockerComposeCdk.App();
    this.dockerProject = new dockerComposeCdk.Project(
      this.dockerCompose,
      "LocalDockerStackProject"
    );
    this.dockerNetwork = new dockerComposeCdk.Network(
      this.dockerProject,
      "LocalDockerStackNetwork"
    );
  }
  public synthesize(): void {
    const dockerComposeYAML = this.dockerCompose
      .synth()
      .projects.map((p) => YAMLStringify(p.compose))
      .join("\n---\n");
    const dockerComposePath = resolve(
      process.cwd(),
      "docker",
      "docker-compose.yml"
    );
    writeFileSync(dockerComposePath, dockerComposeYAML);
    this.synth();
  }
}

export class FrameworkStack extends awsCdk.Stack {
  public readonly frameworkApp: FrameworkApp;
  constructor(
    scope: FrameworkApp = new FrameworkApp(),
    id: string = "MainStack",
    opts: awsCdk.StackProps = {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    }
  ) {
    super(scope, id, opts);
    this.frameworkApp = scope;
  }
  public get dockerCompose(): dockerComposeCdk.App {
    return this.frameworkApp.dockerCompose;
  }
  public get dockerProject(): dockerComposeCdk.Project {
    return this.frameworkApp.dockerProject;
  }
  public get dockerNetwork(): dockerComposeCdk.Network {
    return this.frameworkApp.dockerNetwork;
  }
  addToDockerCompose() {
    /* do nothing at stack level */
  }
}

export abstract class FrameworkConstruct extends Construct {
  constructor(scope: FrameworkConstruct | FrameworkStack, id: string) {
    super(scope, id);
  }
  static IsFrameworkConstruct(construct: any): construct is FrameworkConstruct {
    return construct instanceof FrameworkConstruct;
  }
  abstract addToDockerCompose(): void;
  public get dockerCompose() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerCompose;
  }
  public get dockerNetwork() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerNetwork;
  }
  public get dockerProject() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerProject;
  }
}
