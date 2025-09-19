import * as awsCdk from "aws-cdk-lib";
import * as dockerComposeCdk from "docker-compose-cdk";
import { stringify as YAMLStringify } from "yaml";
import { Construct } from "constructs";

import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";

export enum FrameworkEnvironment {
  Production = "production",
  Development = "development",
}

export function getDefaultDockerComposePath(): string {
  return resolve(process.cwd(), "docker", "docker-compose.yml");
}

export function getDefaultEnvironment(): FrameworkEnvironment {
  return process.env.ENV?.toLowerCase().startsWith("prod")
    ? FrameworkEnvironment.Production
    : FrameworkEnvironment.Development;
}

export class FrameworkApp extends awsCdk.App {
  public readonly dockerCompose: dockerComposeCdk.App;
  public readonly dockerProject: dockerComposeCdk.Project;
  public readonly dockerNetwork: dockerComposeCdk.Network;
  constructor(
    public readonly env: FrameworkEnvironment = getDefaultEnvironment(),
    public readonly dockerComposePath: string = getDefaultDockerComposePath()
  ) {
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
  public toDockerVolumeSourcePath(localPath: string): string {
    const dockerComposeDir = dirname(this.dockerComposePath);
    return relative(dockerComposeDir, localPath);
  }
  public synthesize(): void {
    const dockerComposeYAML = this.dockerCompose
      .synth()
      .projects.map((p) => YAMLStringify(p.compose))
      .join("\n---\n");
    writeFileSync(
      this.dockerComposePath,
      [
        "# This file is auto-generated.",
        "# Do not modify directly.",
        "# ---",
        dockerComposeYAML,
      ].join("\n")
    );
    this.synth();
  }
}

export class FrameworkStack extends awsCdk.Stack {
  public readonly service = undefined;
  public readonly frameworkApp: FrameworkApp;
  public readonly frameworkEnv: FrameworkEnvironment;
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
    this.frameworkEnv = scope.env;
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
  addToDockerCompose(): dockerComposeCdk.Service {
    assert(false, "addToDockerCompose is not available at stack level");
  }
  public getServiceOrThrow(): dockerComposeCdk.Service {
    assert(false, "getServiceOrThrow is not available at stack level");
  }
}

export abstract class FrameworkConstruct extends Construct {
  public service: dockerComposeCdk.Service | undefined;
  constructor(scope: FrameworkConstruct | FrameworkStack, id: string) {
    super(scope, id);
  }
  static IsFrameworkConstruct(construct: any): construct is FrameworkConstruct {
    return construct instanceof FrameworkConstruct;
  }
  abstract addToDockerCompose(): dockerComposeCdk.Service;
  public get dockerCompose() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerCompose;
  }
  public get dockerNetwork() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerNetwork;
  }
  public get dockerProject() {
    return (awsCdk.Stack.of(this) as FrameworkStack).dockerProject;
  }
  public get frameworkEnv() {
    return (awsCdk.Stack.of(this) as FrameworkStack).frameworkEnv;
  }
  public get frameworkApp() {
    return (awsCdk.Stack.of(this) as FrameworkStack).frameworkApp;
  }
  public getServiceOrThrow(): dockerComposeCdk.Service {
    assert(this.service, "Service not initialized yet");
    return this.service;
  }
}

export abstract class FrameworkSingleton extends FrameworkConstruct {
  constructor(scope: FrameworkConstruct | FrameworkStack, id: string) {
    super(scope, id);
    // todo: improve this to check for props equality
    const existing = FrameworkSingleton.getInstanceInScope(scope, id);
    if (existing) {
      return existing;
    }
  }
  public static getInstanceInScope(
    scope: FrameworkConstruct | FrameworkStack,
    id: string
  ): FrameworkSingleton | null {
    const stack = awsCdk.Stack.of(scope) as FrameworkStack;
    stack.node.children.forEach((child) => {
      if (child instanceof FrameworkSingleton && child.node.id === id) {
        return child;
      }
    });
    return null;
  }
}
