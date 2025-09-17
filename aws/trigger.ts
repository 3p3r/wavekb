import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { InvocationType, Trigger } from "aws-cdk-lib/triggers";
import { RestartPolicy, Service } from "docker-compose-cdk";

import { resolve } from "node:path";
import assert from "node:assert";

import { FrameworkConstruct } from "./framework";
import { smallHash } from "./common";

export interface TriggerScriptProps {
  readonly path: string;
}

export class TriggerScript extends FrameworkConstruct {
  readonly trigger: Trigger;

  constructor(
    scope: FrameworkConstruct,
    id: string,
    private readonly props: TriggerScriptProps
  ) {
    super(scope, id);
    const fn = new NodejsFunction(this, "TriggerFunction", {
      handler: "index.handler",
      runtime: Runtime.NODEJS_22_X,
      code: Code.fromAsset(props.path),
    });
    this.trigger = new Trigger(this, "Trigger", {
      handler: fn,
      invocationType: InvocationType.REQUEST_RESPONSE,
    });
    this.service = this.addToDockerCompose();
  }

  executeAfter(construct: FrameworkConstruct) {
    this.trigger.executeAfter(construct);
    assert(this.service, "This construct has no service");
    assert(construct.service, "Other construct has no service");
    this.service.addDependency(construct.service, "service_healthy");
  }
  executeBefore(construct: FrameworkConstruct) {
    this.trigger.executeBefore(construct);
    assert(this.service, "This construct has no service");
    assert(construct.service, "Other construct has no service");
    construct.service.addDependency(this.service, "service_completed_successfully");
  }

  addToDockerCompose(): Service {
    const scriptDir = resolve(this.props.path);
    const pathHash = smallHash(scriptDir);
    return new Service(this.dockerProject, "TriggerScript", {
      image: {
        image: "node",
        tag: "alpine",
      },
      // todo: env vars
      // todo: tsx and node_modules for local development
      command: `-e 'require("./index.ts").handler()'`,
      restart: RestartPolicy.NO,
      workingDir: `/${pathHash}`,
      volumes: [
        {
          source: this.frameworkApp.toDockerVolumeSourcePath(scriptDir),
          target: `/${pathHash}`,
        },
      ],
    });
  }
}
