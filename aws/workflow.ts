import {
  Pass,
  StateMachine,
  DefinitionBody,
  Chain,
} from "aws-cdk-lib/aws-stepfunctions";
import { Service } from "docker-compose-cdk";

import { resolve } from "node:path";

import { FrameworkConstruct, FrameworkSingleton } from "./framework";
import { smallHash } from "./common";
import { Stack } from "aws-cdk-lib";

export interface WorkflowProps {
  readonly path: string;
}

export class Workflow extends FrameworkConstruct {
  readonly stateMachine: StateMachine;
  readonly definition: Chain;
  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    const passState = new Pass(this, `Pass${smallHash(id)}`);
    const nextState = new Pass(this, `Next${smallHash(id)}`);
    this.definition = passState.next(nextState);
    const definitionBody = DefinitionBody.fromChainable(this.definition);
    this.stateMachine = new StateMachine(this, `StateMachine${smallHash(id)}`, {
      stateMachineName: `StateMachine${smallHash(id)}`,
      definitionBody,
    });
    this.service = this.addToDockerCompose();
  }
  addToDockerCompose(): Service {
    // local emulators
    const lse = new LambdaServerEmulator(this, "LambdaServerEmulator");
    const sfe = new StepFunctionEmulator(this, "StepFunctionEmulator");
    // sfe.getServiceOrThrow().addDependency(lse.getServiceOrThrow());
    const id = smallHash(this.node.id);
    const stateJson = this.definition.startState.toStateJson();
    const definitionString = JSON.stringify(stateJson);
    const service = new Service(
      this.dockerProject,
      `StepFunctionWorkflow${id}`,
      {
        image: {
          image: "amazon/aws-cli",
        },
        environment: {
          AWS_ACCESS_KEY_ID: "test",
          AWS_SECRET_ACCESS_KEY: "test",
          AWS_REGION: "us-east-1",
        },
        networks: [
          {
            network: this.dockerNetwork,
            aliases: ["stepfunctions.local"],
          },
        ],
        command: `stepfunctions create-state-machine --endpoint-url http://stepfunctions.local:8083 --region us-east-1 --definition '${definitionString}' --name StateMachine${id} --role-arn arn:aws:iam::123456789012:role/DummyRole`,
      }
    );
    service.addDependency(sfe.getServiceOrThrow());
    return service;
  }
}

export class StepFunctionEmulator extends FrameworkSingleton {
  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    // todo: better abstraction for singleton
    const existing = FrameworkSingleton.getInstanceInScope(scope, id);
    if (existing) return existing;
    this.service = this.addToDockerCompose();
  }
  addToDockerCompose(): Service {
    return new Service(this.dockerProject, `StepFunctionsEmulator`, {
      image: {
        image: "amazon/aws-stepfunctions-local",
      },
      ports: [
        {
          container: 8083,
          host: 8083,
        },
      ],
      environment: {
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_REGION: "us-east-1",
        LAMBDA_ENDPOINT: "http://lambda.local:3001",
        // SQS_ENDPOINT: "http://elasticmq:9324",
      },
      healthCheck: {
        test: ["CMD-SHELL", "curl -f http://localhost:8083 || exit 1"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
        startPeriod: "5s",
      },
    });
  }
}

export class LambdaServerEmulator extends FrameworkSingleton {
  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    // todo: better abstraction for singleton
    const existing = FrameworkSingleton.getInstanceInScope(scope, id);
    if (existing) return existing;
    // todo: healthcheck
    this.service = this.addToDockerCompose();
  }
  addToDockerCompose(): Service {
    return new Service(this.dockerProject, `LambdaServerEmulator`, {
      image: {
        image: "public.ecr.aws/sam/build-nodejs22.x",
      },
      command: `sam local start-lambda -t /app/cdk.out/${
        Stack.of(this).stackName
      }.template.json --host 0.0.0.0 --port 3001`,
      environment: {
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_REGION: "us-east-1",
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
    });
  }
}
