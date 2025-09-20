import { resolve } from "node:path";

import { Duration } from "aws-cdk-lib";
import { DockerImageFunction, DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";
import { smallHash } from "./common";

export interface MicroServiceProps {
  readonly functionPath: string;
}

export class MicroService extends FrameworkConstruct {
  constructor(
    scope: FrameworkConstruct,
    id: string,
    private props: MicroServiceProps
  ) {
    super(scope, id);
    new DockerImageFunction(this, `MicroService${smallHash(id)}`, {
      code: DockerImageCode.fromImageAsset(resolve(this.props.functionPath)),
      functionName: `MicroService${smallHash(id)}`,
      timeout: Duration.seconds(10),
      memorySize: 512,
    });
    this.service = this.addToDockerCompose();
  }

  addToDockerCompose() {
    const id = smallHash(this.node.id);
    return new Service(this.dockerProject, `MicroService${id}`, {
      build: {
        context: this.frameworkApp.toDockerVolumeSourcePath(
          this.props.functionPath
        ),
      },
      ports: [
        {
          container: 8080,
          host: 8080,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: [`microservice.local.${id}`],
        },
      ],
    });
  }
}
