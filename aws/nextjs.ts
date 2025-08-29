import { Construct } from "constructs";
import { Nextjs } from "cdk-nextjs-standalone";
import { type Project, Service } from "docker-compose-cdk";

export interface NextJSAppProps {
  readonly dockerCompose?: Project
}

export class NextJSApp extends Construct {
  readonly nextjs: Nextjs;
  constructor(scope: Construct, id: string, props?: NextJSAppProps) {
    super(scope, id);
    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "app", // relative path from your project root to NextJS
      // skipBuild: true, // <--- Uncomment this line to skip the build step
    });

    if (props?.dockerCompose) {
      this.addToDockerCompose(props.dockerCompose);
    }
  }

  private addToDockerCompose(project: Project) {
    new Service(project, "NextjsLocal", {
      image: {
        image: "node",
        tag: "alpine"
      },
      user: process.getuid ? process.getuid().toString() : "1000",
      environment: { PORT: "4000" },
      command: "sh -c 'cd /app && npm install && npm run dev'",
      ports: [{
        container: 4000,
        host: 4000
      }],
      volumes: [{
        source: "../app", // relative to docker compose location
        target: "/app",
      }]
    });
  }
}
