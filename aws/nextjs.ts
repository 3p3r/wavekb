import assert from "node:assert";
import { Nextjs } from "cdk-nextjs-standalone";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";

const DOCKER_DEV_PORT = 4000;

export interface NextJSAppProps {
  readonly postgresUrl: string;
  readonly storageUrl: string;
  readonly queueUrl: string;
}

let EXISTS = false;

export class NextJSApp extends FrameworkConstruct {
  readonly nextjs: Nextjs;
  readonly appUrl: string;

  constructor(
    scope: FrameworkConstruct,
    id: string,
    private readonly _props: NextJSAppProps
  ) {
    super(scope, id);

    EXISTS = !(assert(
      !EXISTS,
      [
        "You reached the cap on this stack.",
        "Only one NextJS app construct can be created!",
      ].join(" ")
    ) as unknown);

    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "app", // relative path from your project root to NextJS
      // skipBuild: true, // <--- Uncomment this line to skip the build step
      environment: {
        FRAMEWORK_ENVIRONMENT: this.frameworkEnv,
        POSTGRES_URL: this._props.postgresUrl,
        STORAGE_URL: this._props.storageUrl,
        QUEUE_URL: this._props.queueUrl,
        DEBUG: "wavekb*",
      },
    });
    this.service = this.addToDockerCompose();

    if (this.frameworkEnv === "development") {
      this.appUrl = `http://nextjs.local:${DOCKER_DEV_PORT}`;
    } else {
      this.appUrl = this.nextjs.url;
    }
  }

  addToDockerCompose() {
    return new Service(this.dockerProject, "NextjsLocal", {
      image: {
        image: "node",
        tag: "alpine",
      },
      user: process.getuid ? process.getuid().toString() : "1000",
      environment: {
        DEBUG: "wavekb*",
        PORT: `${DOCKER_DEV_PORT}`,
        QUEUE_URL: this._props.queueUrl,
        STORAGE_URL: this._props.storageUrl,
        POSTGRES_URL: this._props.postgresUrl,
        FRAMEWORK_ENVIRONMENT: this.frameworkEnv,
      },
      command: "sh -c 'cd /app && npm run dev'",
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["nextjs.local"],
        },
      ],
      ports: [
        {
          container: DOCKER_DEV_PORT,
          host: DOCKER_DEV_PORT,
        },
      ],
      volumes: [
        {
          source: "../app", // relative to docker compose location
          target: "/app",
        },
      ],
      healthCheck: {
        test: [
          "CMD-SHELL",
          `curl --fail http://localhost:${DOCKER_DEV_PORT}/api/healthcheck || exit 1`,
        ],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    });
  }
}
