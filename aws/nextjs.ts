import assert from "node:assert";
import { resolve } from "node:path";

import { Nextjs } from "cdk-nextjs-standalone";
import { Service } from "docker-compose-cdk";

import { FrameworkSingleton } from "./framework";

const DOCKER_DEV_PORT = 4000;

export interface NextJSAppProps {
  readonly postgresUrl: string;
  readonly storageUrl: string;
  readonly queueUrl: string;
}

/**
 * A NextJS application that deploys to AWS Lambda using OpenNext
 * and to local Docker Compose as the dev server of the application.
 */
export class NextJSApp extends FrameworkSingleton {
  private nextjs: Nextjs | undefined;
  private appUrl: string | undefined;

  constructor(
    scope: FrameworkSingleton.Interface,
    id: string,
    public readonly props: NextJSAppProps
  ) {
    super(scope, id);
    this.initialize();
  }

  getAppUrl(): string {
    assert(this.appUrl, "App URL not initialized");
    return this.appUrl;
  }

  addToAwsDeployment(id: string): void {
    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "app", // relative path from your project root to NextJS
      skipBuild: true, // <--- Uncomment this line to skip the build step
      environment: {
        FRAMEWORK_ENVIRONMENT: this.frameworkEnv,
        POSTGRES_URL: this.props.postgresUrl,
        STORAGE_URL: this.props.storageUrl,
        QUEUE_URL: this.props.queueUrl,
        DEBUG: "wavekb*",
      },
    });

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
        QUEUE_URL: this.props.queueUrl,
        STORAGE_URL: this.props.storageUrl,
        POSTGRES_URL: this.props.postgresUrl,
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
          source: this.frameworkApp.toDockerVolumeSourcePath(
            resolve(__dirname, "..", "app")
          ),
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
