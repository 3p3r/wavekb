import assert from "node:assert";
import { resolve } from "node:path";

import { Duration } from "aws-cdk-lib";
import { DockerImageFunction, DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";
import { getRandomDeterministicPort, smallHash } from "./common";

export interface MicroServiceProps {
  readonly functionPath: string;
}

/**
 * A microservice that deploys to AWS Lambda using a Docker image and to local Docker Compose.
 */
export class MicroService extends FrameworkConstruct {
  private localPort: number | undefined;
  private localName: string | undefined;
  private remoteArn: string | undefined;
  private localPath: string | undefined;
  private endpoint: string | undefined;

  constructor(
    scope: FrameworkConstruct.Interface,
    id: string,
    public readonly props: MicroServiceProps,
  ) {
    super(scope, id);
    this.initialize();
  }

  getEndpoint(): string {
    assert(this.endpoint, "Endpoint not initialized");
    return this.endpoint;
  }

  addToAwsDeployment(id: string): void {
    this.localName = this.getScopedName("MicroService");
    this.localPort = getRandomDeterministicPort(this.localName);
    const fn = new DockerImageFunction(this, this.localName, {
      code: DockerImageCode.fromImageAsset(resolve(this.props.functionPath)),
      functionName: this.localName,
      timeout: Duration.minutes(1),
      memorySize: 2048,
    });
    this.remoteArn = fn.functionArn;
    this.localPath = `http://${this.getScopedName("microservice.local", ".")}:${this.localPort}`;
    if (this.frameworkEnv === "development") {
      this.endpoint = this.localPath;
    } else {
      this.endpoint = this.remoteArn;
    }
  }

  addToDockerCompose() {
    assert(this.localPort, "Local port not initialized");
    assert(this.localName, "Local name not initialized");
    return new Service(this.dockerProject, this.localName, {
      build: {
        context: this.frameworkApp.toDockerVolumeSourcePath(
          this.props.functionPath,
        ),
      },
      environment: {
        PORT: this.localPort.toString(),
      },
      ports: [
        {
          container: 8000,
          host: this.localPort,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: [this.getScopedName("microservice.local", ".")],
        },
      ],
      healthCheck: {
        test: [
          "CMD-SHELL",
          `curl -f http://localhost:${this.localPort}/health || exit 1`,
        ],
        interval: "30s",
        timeout: "5s",
        retries: 3,
        startPeriod: "1s",
      },
    });
  }
}
