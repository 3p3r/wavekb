#!/usr/bin/env node
import "source-map-support/register";

import d from "debug";

import { FrameworkStack } from "./framework";
import { NextJSApp } from "./nextjs";
import { Postgres } from "./postgres";
import { QueueService } from "./queue";
import { StorageService } from "./storage";

const debug = d("wavekb");
const stack = new FrameworkStack();

const queue = new QueueService(stack, "QueueService");
const storage = new StorageService(stack, "StorageService");
const postgres = new Postgres(stack, "Postgres");
const nextjsApp = new NextJSApp(stack, "NextJSApp", {
  storageUrl: storage.bucketEndpoint,
  postgresUrl: postgres.endpoint,
  queueUrl: queue.queueUrl,
});

stack.frameworkApp.synthesize();

debug("NextJS app URL: %s", nextjsApp.appUrl);
