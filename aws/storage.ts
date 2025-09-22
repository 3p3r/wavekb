import assert from "node:assert";
import { resolve } from "node:path";

import { Bucket } from "aws-cdk-lib/aws-s3";
import { Service } from "docker-compose-cdk";

import { FrameworkConstruct } from "./framework";
import {
  getRandomDeterministicPort,
  LOCAL_AWS_SECRET_ACCESS_KEY,
  LOCAL_AWS_ACCESS_KEY_ID,
} from "./common";

/**
 * A storage service that provides an S3 bucket in AWS and a MinIO service in local development.
 */
export class StorageService extends FrameworkConstruct {
  remoteBucketEndpoint: string | undefined;
  localBucketEndpoint: string | undefined;
  localBucketName: string | undefined;
  localBucketPort: number | undefined;
  bucketEndpoint: string | undefined;

  getBucketEndpoint(): string {
    assert(this.bucketEndpoint, "Bucket endpoint not initialized");
    return this.bucketEndpoint;
  }

  protected addToAwsDeployment(id: string): void {
    this.localBucketName = this.scopedName("StorageBucket");
    const bucket = new Bucket(this, this.localBucketName);
    this.localBucketPort = getRandomDeterministicPort(this.localBucketName);
    this.localBucketEndpoint = `http://${this.scopedName("s3.local", ".")}:${
      this.localBucketPort
    }/${this.localBucketName}`;
    this.remoteBucketEndpoint = bucket.urlForObject();
    this.bucketEndpoint =
      this.frameworkEnv === "development"
        ? this.localBucketEndpoint
        : this.remoteBucketEndpoint;
  }

  protected addToDockerCompose() {
    assert(this.localBucketName, "Local bucket name not initialized");
    assert(this.localBucketPort, "Local bucket port not initialized");
    return new Service(this.dockerProject, this.localBucketName, {
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
          aliases: [this.scopedName("s3.local", ".")],
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
