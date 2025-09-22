import * as awsCdk from "aws-cdk-lib";
import * as dockerComposeCdk from "docker-compose-cdk";
import { stringify as YAMLStringify } from "yaml";
import { Construct } from "constructs";

import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";

import { smallHash } from "./common";

/**
 * The environment in which the framework is running.
 * This is used transparently by the framework.
 */
export enum FrameworkEnvironment {
  // AWS Cloud Production deployment
  Production = "production",
  // Docker compose local development
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

/**
 * A framework to build SaaS apps on AWS, with local Docker compose support.
 */
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
  /**
   * Calculates a relative path so that the given path is relative
   * to the docker-compose.yml file location.
   * @param localPath The local path to convert.
   * @returns The relative path to use in the docker-compose.yml file.
   */
  public toDockerVolumeSourcePath(localPath: string): string {
    const dockerComposeDir = dirname(this.dockerComposePath);
    return relative(dockerComposeDir, localPath);
  }
  /**
   * Dual stack synthesis where we emit a Docker compose file
   * alongside the CloudFormation templates.
   */
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

/**
 * A CDK Stack that is aware of the FrameworkApp and its Docker compose setup.
 */
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

/**
 * A base class for all framework constructs. Framework constructs
 * can contribute to both AWS CloudFormation and Docker compose.
 */
export abstract class FrameworkConstruct<PropsT = any> extends Construct {
  public service: dockerComposeCdk.Service | undefined;
  public readonly shortId: string;
  constructor(
    scope: FrameworkConstruct | FrameworkStack,
    id: string,
    protected readonly props: PropsT = {} as PropsT
  ) {
    super(scope, id);
    this.shortId = smallHash(id);
    this.addToAwsDeployment(id);
    this.service = this.addToDockerCompose(id);
  }
  /**
   * Contribute infrastructure to AWS deployment.
   * @param id The construct ID
   */
  protected abstract addToAwsDeployment(id: string): void;
  /**
   * Contribute infrastructure to Docker compose deployment.
   * @param id The construct ID
   * @returns The Docker compose service
   */
  protected abstract addToDockerCompose(id: string): dockerComposeCdk.Service;
  /**
   * Get a safe and scoped name for resources.
   * @param name The base name
   * @param sep The separator to use (default: "")
   * @returns The scoped name
   */
  public scopedName(name: string, sep: string = ""): string {
    return `${name}${sep}${this.shortId}`;
  }
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
  /**
   * Get the Docker compose service associated with this construct.
   * @returns The Docker compose service
   */
  public getServiceOrThrow(): dockerComposeCdk.Service {
    assert(this.service, "Service not initialized yet");
    return this.service;
  }
}

/**
 * Utility to create singleton constructs within a given scope.
 */
export abstract class FrameworkSingleton<
  PropsT = any
> extends FrameworkConstruct<PropsT> {
  constructor(
    scope: FrameworkConstruct | FrameworkStack,
    id: string,
    props: PropsT = {} as PropsT
  ) {
    super(scope, id, props);
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
