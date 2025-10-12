import assert from "node:assert";
import { resolve } from "node:path";

import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { InvocationType, Trigger } from "aws-cdk-lib/triggers";
import { RestartPolicy, Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";
import { smallHash } from "./common";
import { Duration } from "aws-cdk-lib";

export interface TriggerScriptProps {
  readonly path: string;
}

/**
 * A one-time script that runs before or after other constructs, implemented with AWS Lambda
 * and CDK Triggers in production and a simple Node.js service in local development.
 */
export class TriggerScript extends FrameworkConstruct {
  private trigger: Trigger | undefined;
  private localName: string | undefined;

  constructor(
    scope: FrameworkConstruct.Interface,
    id: string,
    public readonly props: TriggerScriptProps,
  ) {
    super(scope, id);
    this.initialize();
  }

  executeAfter(construct: FrameworkConstruct) {
    assert(this.trigger, "Trigger not initialized");
    this.trigger.executeAfter(construct);
    assert(this.service, "This construct has no service");
    assert(construct.service, "Other construct has no service");
    this.service.addDependency(construct.service, "service_healthy");
  }

  executeBefore(construct: FrameworkConstruct) {
    assert(this.trigger, "Trigger not initialized");
    this.trigger.executeBefore(construct);
    assert(this.service, "This construct has no service");
    assert(construct.service, "Other construct has no service");
    construct.service.addDependency(
      this.service,
      "service_completed_successfully",
    );
  }

  addToAwsDeployment(id: string): void {
    this.localName = this.getScopedName("script");
    const fn = new NodejsFunction(this, this.getScopedName("TriggerFunction"), {
      handler: "index.handler",
      runtime: Runtime.NODEJS_22_X,
      code: Code.fromAsset(this.props.path),
      functionName: this.localName,
      timeout: Duration.minutes(5),
      memorySize: 1024,
    });
    this.trigger = new Trigger(this, this.getScopedName("Trigger"), {
      handler: fn,
      invocationType: InvocationType.REQUEST_RESPONSE,
    });
  }

  addToDockerCompose(): Service {
    assert(this.localName, "Local name not initialized");
    const scriptDir = resolve(this.props.path);
    const pathHash = smallHash(scriptDir);
    return new Service(
      this.dockerProject,
      this.getScopedName("TriggerScript"),
      {
        image: {
          image: "node",
          tag: "alpine",
        },
        // todo: env vars
        command: `npx tsx index.ts`,
        restart: RestartPolicy.NO,
        workingDir: `/${pathHash}`,
        volumes: [
          {
            source: this.frameworkApp.toDockerVolumeSourcePath(scriptDir),
            target: `/${pathHash}`,
          },
          {
            source: this.frameworkApp.toDockerVolumeSourcePath(
              resolve(__dirname, "..", "node_modules"),
            ),
            target: `/${pathHash}/node_modules`,
          },
        ],
      },
    );
  }
}
