import { Bucket } from "aws-cdk-lib/aws-s3";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";

export class StorageService extends FrameworkConstruct {
  readonly remoteBucketEndpoint: string;
  readonly localBucketEndpoint: string;
  readonly bucketEndpoint: string;

  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    const bucket = new Bucket(this, "StorageBucket");
    this.addToDockerCompose();
    this.localBucketEndpoint = `http://s3.local:9000`;
    this.remoteBucketEndpoint = bucket.urlForObject();
    this.bucketEndpoint =
      this.frameworkEnv === "development"
        ? this.localBucketEndpoint
        : this.remoteBucketEndpoint;
  }

  addToDockerCompose() {
    new Service(this.dockerProject, "StorageService", {
      image: {
        // minioadmin / minioadmin is auth
        image: "minio/minio",
        tag: "latest",
      },
      ports: [
        {
          container: 9000,
          host: 9000,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["s3.local"],
        },
      ],
      command: "server /data",
      volumes: [
        {
          source: "../.s3", // relative to docker compose location
          target: "/data",
        },
      ],
    });
  }
}
