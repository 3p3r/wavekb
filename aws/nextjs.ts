import { Nextjs } from "cdk-nextjs-standalone";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";

export class NextJSApp extends FrameworkConstruct {
  readonly nextjs: Nextjs;
  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "app", // relative path from your project root to NextJS
      // skipBuild: true, // <--- Uncomment this line to skip the build step
    });
    this.addToDockerCompose();
  }

  addToDockerCompose() {
    new Service(this.dockerProject, "NextjsLocal", {
      image: {
        image: "node",
        tag: "alpine",
      },
      user: process.getuid ? process.getuid().toString() : "1000",
      environment: { PORT: "4000" },
      command: "sh -c 'cd /app && npm install && npm run dev'",
      networks: [
        {
          network: this.dockerNetwork,
          alias: "nextjs",
        },
      ],
      ports: [
        {
          container: 4000,
          host: 4000,
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
