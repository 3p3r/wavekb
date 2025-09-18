import { Names } from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Service } from "docker-compose-cdk";
import { createHash } from "node:crypto";

import { FrameworkConstruct } from "./framework";
import { smallHash } from "./common";

const ALL_PORTS = new Map<string, number>();
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

export class QueueService extends FrameworkConstruct {
  readonly remoteQueueUrl: string;
  readonly localQueueName: string;
  readonly localQueueUrl: string;
  readonly localQueuePort: number;
  readonly queueUrl: string;

  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    const q = new Queue(this, `Queue${smallHash(id)}`);
    this.localQueuePort = ALL_PORTS.size + 9324;
    this.localQueueName = smallHash(
      Names.uniqueResourceName(this, {
        allowedSpecialCharacters: "",
        separator: "",
        maxLength: 63,
      })
    );
    this.service = this.addToDockerCompose();
    this.remoteQueueUrl = q.queueArn;
    this.localQueueUrl = `http://sqs.local:${this.localQueuePort}/${this.localQueueName}`;
    this.queueUrl =
      this.frameworkEnv === "development"
        ? this.localQueueUrl
        : this.remoteQueueUrl;
    ALL_PORTS.set(this.localQueueUrl, this.localQueuePort);
  }

  addToDockerCompose() {
    const template = ELASTICMQ_CONFIG_TEMPLATE.replace(
      /<QUEUE_NAME>/g,
      this.localQueueName
    );
    const escapedTemplate = JSON.stringify(template, null, 0).slice(1, -1);
    // write template into /custom.conf
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
          aliases: ["sqs.local"],
        },
      ],
    });
  }
}
