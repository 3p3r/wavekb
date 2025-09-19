import { resolve } from "node:path";

import { Names } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";
import {
  LOCAL_AWS_ACCESS_KEY_ID,
  LOCAL_AWS_SECRET_ACCESS_KEY,
  smallHash,
} from "./common";

const ALL_PORTS = new Map<string, number>();

export class StorageService extends FrameworkConstruct {
  readonly remoteBucketEndpoint: string;
  readonly localBucketEndpoint: string;
  readonly localBucketName: string;
  readonly localBucketPort: number;
  readonly bucketEndpoint: string;

  constructor(scope: FrameworkConstruct, id: string) {
    super(scope, id);
    const bucket = new Bucket(this, `StorageBucket${smallHash(id)}`);
    this.localBucketPort = ALL_PORTS.size + 9000;
    this.localBucketName = smallHash(
      Names.uniqueResourceName(this, {
        allowedSpecialCharacters: "",
        separator: "",
        maxLength: 63,
      })
    );
    this.service = this.addToDockerCompose();
    this.localBucketEndpoint = `http://s3.local:${this.localBucketPort}/${this.localBucketName}`;
    this.remoteBucketEndpoint = bucket.urlForObject();
    this.bucketEndpoint =
      this.frameworkEnv === "development"
        ? this.localBucketEndpoint
        : this.remoteBucketEndpoint;
    ALL_PORTS.set(this.localBucketEndpoint, this.localBucketPort);
  }

  addToDockerCompose() {
    const id = smallHash(this.node.id);
    return new Service(this.dockerProject, `StorageBucket${id}`, {
      image: {
        image: "minio/minio",
        tag: "latest",
      },
      environment: {
        MINIO_ROOT_USER: LOCAL_AWS_ACCESS_KEY_ID,
        MINIO_ROOT_PASSWORD: LOCAL_AWS_SECRET_ACCESS_KEY,
      },
      ports: [
        {
          container: 9000,
          host: this.localBucketPort,
        },
      ],
      networks: [
        {
          network: this.dockerNetwork,
          aliases: ["s3.local"],
        },
      ],
      entrypoint: "/bin/sh",
      command: `-c 'mkdir -p /data/${this.localBucketName} && /usr/bin/minio server /data'`,
      volumes: [
        {
          source: this.frameworkApp.toDockerVolumeSourcePath(
            resolve(__dirname, "..", ".s3", this.localBucketName)
          ),
          target: "/data",
        },
      ],
    });
  }
}
