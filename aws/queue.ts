import { Queue } from "aws-cdk-lib/aws-sqs";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";

export class QueueService extends FrameworkConstruct {
  readonly remoteQueueUrl: string;
  readonly localQueueUrl: string;
  readonly queueUrl: string;

  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    const q = new Queue(this, "Queue");
    this.addToDockerCompose();
    this.remoteQueueUrl = q.queueArn;
    this.localQueueUrl = "http://sqs.local:9324";
    this.queueUrl =
      this.frameworkEnv === "development"
        ? this.localQueueUrl
        : this.remoteQueueUrl;
  }

  addToDockerCompose() {
    new Service(this.dockerProject, "QueueService", {
      image: {
        image: "vsouza/sqs-local",
        tag: "latest",
      },
      ports: [
        {
          container: 9324,
          host: 9324,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["sqs.local"],
        },
      ],
    });
  }
}
