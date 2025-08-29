#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { App, Project } from "docker-compose-cdk";
import { stringify as YAMLStringify } from "yaml";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

import { BackendStack } from "./stack";

const app = new cdk.App();

const dockerApp = new App();
const dockerProject = new Project(dockerApp, "wavekb")

new BackendStack(app, "WaveKbStack", {
  dockerCompose: dockerProject,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const dockerComposeYAML = (dockerApp.synth().projects.map(p => YAMLStringify(p.compose)).join("\n---\n"));
writeFileSync(resolve(process.cwd(), "docker", "docker-compose.yml"), dockerComposeYAML);
