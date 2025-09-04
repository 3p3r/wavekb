import { Nextjs } from "cdk-nextjs-standalone";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";

const DOCKER_DEV_PORT = 4000;

export interface NextJSAppProps {
  readonly postgresUrl: string;
}

export class NextJSApp extends FrameworkConstruct {
  readonly nextjs: Nextjs;
  readonly appUrl: string;

  constructor(
    scope: FrameworkConstruct,
    id: string,
    private readonly _props: NextJSAppProps
  ) {
    super(scope, id);
    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "app", // relative path from your project root to NextJS
      // skipBuild: true, // <--- Uncomment this line to skip the build step
      environment: {
        POSTGRES_URL: this._props.postgresUrl,
      },
    });
    this.addToDockerCompose();

    if (this.frameworkEnv === "development") {
      this.appUrl = `http://nextjs.local:${DOCKER_DEV_PORT}`;
    } else {
      this.appUrl = this.nextjs.url;
    }
  }

  addToDockerCompose() {
    new Service(this.dockerProject, "NextjsLocal", {
      image: {
        image: "node",
        tag: "alpine",
      },
      user: process.getuid ? process.getuid().toString() : "1000",
      environment: {
        PORT: `${DOCKER_DEV_PORT}`,
        POSTGRES_URL: this._props.postgresUrl,
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
    });
  }
}
