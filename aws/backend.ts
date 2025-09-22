#!/usr/bin/env node
import "source-map-support/register";

import d from "debug";

import { DependencyCondition, FrameworkStack } from "./framework";
import { MicroService } from "./microservice";
import { NextJSApp } from "./nextjs";
import { Postgres } from "./postgres";
import { QueueService } from "./queue";
import { StorageService } from "./storage";
import { TriggerScript } from "./trigger";
import { Workflow } from "./workflow";

const debug = d("wavekb");
const stack = new FrameworkStack();

const queue = new QueueService(stack, "QueueService");
const storage = new StorageService(stack, "StorageService");
const postgres = new Postgres(stack, "PostgresService");
const workflow = new Workflow(stack, "SpectrogramService");
const seeder = new TriggerScript(stack, "SeedScript", {
  path: "./lambdas/seed",
});
const crawler = new MicroService(stack, "CrawlerService", {
  functionPath: "./lambdas/crawler",
});
const nextjsApp = new NextJSApp(stack, "NextJSApp", {
  storageUrl: storage.getBucketEndpoint(),
  postgresUrl: postgres.getEndpoint(),
  queueUrl: queue.getQueueArn(),
});

seeder.executeAfter(postgres);
seeder.executeBefore(nextjsApp);

workflow.dependsOn(postgres, DependencyCondition.Running);
workflow.dependsOn(storage, DependencyCondition.Started);
workflow.dependsOn(queue, DependencyCondition.Started);

crawler.dependsOn(workflow, DependencyCondition.Started);
nextjsApp.dependsOn(workflow, DependencyCondition.Started);

stack.frameworkApp.synthesize();

debug("NextJS app URL: %s", nextjsApp.getAppUrl());
