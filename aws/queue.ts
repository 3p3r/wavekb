import { Queue } from "aws-cdk-lib/aws-sqs";
import { Service } from "docker-compose-cdk";

import assert from "node:assert";

import { FrameworkConstruct } from "./framework";
import {
  getRandomDeterministicPort,
  smallHash,
  localArnFormat,
} from "./common";

const ELASTICMQ_CONFIG_TEMPLATE = `
include classpath("application.conf")

node-address {
    protocol = http
    host = "*"
    port = 9324
    context-path = ""
}

rest-sqs {
    enabled = true
    bind-port = 9324
    bind-hostname = "0.0.0.0"
    sqs-limits = strict
}

queues {
    <QUEUE_NAME> {
        defaultVisibilityTimeout = 10 seconds
        delay = 0 seconds
        receiveMessageWait = 0 seconds
    }
}`.trim();

/**
 * A Queue service that deploys to SQS on AWS and ElasticMQ in Docker Compose.
 */
export class QueueService extends FrameworkConstruct {
  private queueArn: string | undefined;
  private localQueueArn: string | undefined;
  private localQueuePort: number | undefined;
  private remoteQueueArn: string | undefined;
  private localQueueName: string | undefined;

  constructor(scope: FrameworkConstruct.Interface, id: string) {
    super(scope, id);
    this.initialize();
  }

  getQueueArn(): string {
    assert(this.queueArn, "Queue ARN not initialized");
    return this.queueArn;
  }

  addToAwsDeployment(id: string): void {
    this.localQueueName = this.getScopedName("Queue");
    this.localQueuePort = getRandomDeterministicPort(this.localQueueName);
    const q = new Queue(this, this.getScopedName("Queue"));
    this.remoteQueueArn = q.queueArn;
    this.localQueueArn = localArnFormat(
      `${this.getScopedName("sqs.local", ".")}:${this.localQueuePort}`,
      this.localQueueName
    );
    this.queueArn =
      this.frameworkEnv === "development"
        ? this.localQueueArn
        : this.remoteQueueArn;
  }

  addToDockerCompose() {
    assert(this.localQueueName, "localQueueName not initialized");
    assert(this.localQueuePort, "localQueuePort not initialized");
    const template = ELASTICMQ_CONFIG_TEMPLATE.replace(
      /<QUEUE_NAME>/g,
      this.localQueueName
    );
    const escapedTemplate = JSON.stringify(template, null, 0).slice(1, -1);
    const command = [
      "/bin/sh",
      "-c",
      `"echo '${escapedTemplate}' > /elastic.conf && java -Dconfig.file=/elastic.conf -jar /opt/elasticmq-server.jar"`,
    ].join(" ");
    const id = smallHash(this.node.id);
    return new Service(this.dockerProject, `QueueService${id}`, {
      image: {
        image: "softwaremill/elasticmq-native",
        tag: "latest",
      },
      ports: [
        {
          container: 9324,
          host: this.localQueuePort,
        },
      ],
      command,
      networks: [
        {
          network: this.dockerNetwork,
          aliases: [this.getScopedName("sqs.local", ".")],
        },
      ],
    });
  }
}
