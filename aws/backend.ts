#!/usr/bin/env node
import "source-map-support/register";

import d from "debug";

import { FrameworkStack } from "./framework";
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
const postgres = new Postgres(stack, "Postgres");
const workflow = new Workflow(stack, "SpectrogramService");
const seeder = new TriggerScript(stack, "SeedScript", {
  path: "./triggers/seed",
});
const nextjsApp = new NextJSApp(stack, "NextJSApp", {
  storageUrl: storage.bucketEndpoint,
  postgresUrl: postgres.endpoint,
  queueUrl: queue.queueUrl,
});

seeder.executeAfter(postgres);
seeder.executeBefore(nextjsApp);

workflow.getServiceOrThrow().addDependency(postgres.getServiceOrThrow());
workflow.getServiceOrThrow().addDependency(queue.getServiceOrThrow());
workflow.getServiceOrThrow().addDependency(storage.getServiceOrThrow());

nextjsApp.getServiceOrThrow().addDependency(workflow.getServiceOrThrow());

stack.frameworkApp.synthesize();

debug("NextJS app URL: %s", nextjsApp.appUrl);
