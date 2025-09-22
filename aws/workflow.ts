import assert from "node:assert";
import { resolve } from "node:path";

import {
  Pass,
  StateGraph,
  StateMachine,
  DefinitionBody,
  QueryLanguage,
} from "aws-cdk-lib/aws-stepfunctions";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { RestartPolicy, Service } from "docker-compose-cdk";
import { Stack } from "aws-cdk-lib";

import { FrameworkConstruct, FrameworkSingleton } from "./framework";
import {
  LOCAL_AWS_REGION,
  LOCAL_AWS_ACCESS_KEY_ID,
  LOCAL_AWS_SECRET_ACCESS_KEY,
} from "./common";

/**
 * A workflow that orchestrates multiple steps using AWS Step Functions in production
 * and a local Step Functions emulator in development.
 */
export class Workflow extends FrameworkConstruct {
  private stateGraph: StateGraph | undefined;

  constructor(scope: FrameworkConstruct.Interface, id: string) {
    super(scope, id);
    this.initialize();
  }

  addToAwsDeployment(id: string): void {
    const passState = new Pass(this, this.getScopedName("Pass"));
    this.stateGraph = new StateGraph(
      passState,
      this.getScopedName("StateGraph")
    );
    new StateMachine(this, this.getScopedName("StateMachine"), {
      definitionBody: DefinitionBody.fromString(this.stateGraph.toString()),
      stateMachineName: this.getScopedName("StateMachine"),
    });
  }

  addToDockerCompose(id: string): Service {
    assert(this.stateGraph, "State graph not initialized");
    const lse = new LambdaServerEmulator(this, "LambdaServerEmulator");
    const sfe = new StepFunctionEmulator(this, "StepFunctionEmulator");
    sfe.dependsOn(lse);
    const stateJson = this.stateGraph.toGraphJson(QueryLanguage.JSON_PATH);
    const definitionString = JSON.stringify(stateJson);
    const service = new Service(
      this.dockerProject,
      this.getScopedName("StepFunctionWorkflow"),
      {
        image: {
          image: "amazon/aws-cli",
        },
        environment: {
          AWS_ACCESS_KEY_ID: LOCAL_AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: LOCAL_AWS_SECRET_ACCESS_KEY,
          AWS_REGION: LOCAL_AWS_REGION,
        },
        networks: [
          {
            network: this.dockerNetwork,
            aliases: [this.getScopedName("stepfunctions.local", ".")],
          },
        ],
        restart: RestartPolicy.NO,
        command: `stepfunctions create-state-machine --endpoint-url http://stepfunctions.local:8083 --region us-east-1 --definition '${definitionString}' --name ${this.getScopedName(
          "StateMachine"
        )} --role-arn arn:aws:iam::123456789012:role/DummyRole`,
      }
    );
    service.addDependency(sfe.getServiceOrThrow(), "service_healthy");
    return service;
  }
}

export class StepFunctionEmulator extends FrameworkSingleton {
  constructor(scope: FrameworkSingleton.Interface, id: string) {
    super(scope, id);
    this.initialize();
  }
  addToAwsDeployment(id: string): void {
    // nothing to contribute to AWS deployment
  }
  addToDockerCompose(): Service {
    return new Service(this.dockerProject, "StepFunctionsEmulator", {
      image: {
        image: "amazon/aws-stepfunctions-local",
      },
      ports: [
        {
          container: 8083,
          host: 8083,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["stepfunctions.local"],
        },
      ],
      environment: {
        AWS_ACCESS_KEY_ID: LOCAL_AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: LOCAL_AWS_SECRET_ACCESS_KEY,
        AWS_REGION: LOCAL_AWS_REGION,
        LAMBDA_ENDPOINT: "http://lambda.local:3001",
        // SQS_ENDPOINT: "http://elasticmq:9324", // todo
      },
      healthCheck: {
        test: [
          "CMD-SHELL",
          "curl -X POST -H 'x-amz-target: AWSStepFunctions.ListStateMachines' http://stepfunctions.local:8083 || exit 1",
        ],
        interval: "10s",
        timeout: "5s",
        retries: 5,
        startPeriod: "5s",
      },
    });
  }
}

export class LambdaServerEmulator extends FrameworkSingleton {
  constructor(scope: FrameworkSingleton.Interface, id: string) {
    super(scope, id);
    this.initialize();
  }
  addToAwsDeployment(id: string): void {
    // nothing to contribute to AWS deployment
  }
  addToDockerCompose(): Service {
    const functionName = `LocalHealthCheck`;
    new NodejsFunction(this, "LocalHealthCheck", {
      code: Code.fromAsset(resolve(__dirname, "../lambdas/health")),
      entry: resolve(__dirname, "../lambdas/health/index.ts"),
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      functionName,
    });
    return new Service(this.dockerProject, `LambdaServerEmulator`, {
      image: {
        image: "public.ecr.aws/sam/build-nodejs22.x",
      },
      command: `sam local start-lambda -t /app/cdk.out/${
        Stack.of(this).stackName
      }.template.json --host 0.0.0.0 --port 3001`,
      environment: {
        SAM_CLI_TELEMETRY: "0",
        AWS_ACCESS_KEY_ID: LOCAL_AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: LOCAL_AWS_SECRET_ACCESS_KEY,
        AWS_REGION: LOCAL_AWS_REGION,
      },
      workingDir: "/app",
      volumes: [
        {
          source: this.frameworkApp.toDockerVolumeSourcePath(
            resolve(__dirname, "..")
          ),
          target: "/app",
        },
        {
          source: "/var/run/docker.sock",
          target: "/var/run/docker.sock",
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["lambda.local"],
        },
      ],
      ports: [
        {
          container: 3001,
          host: 3001,
        },
      ],
      healthCheck: {
        test: [
          "CMD",
          "sam",
          "local",
          "invoke",
          functionName,
          "--event",
          "{}",
          "--endpoint-url",
          "http://lambda.local:3001",
        ],
        interval: "10s",
        timeout: "5s",
        retries: 5,
        startPeriod: "5s",
      },
    });
  }
}
