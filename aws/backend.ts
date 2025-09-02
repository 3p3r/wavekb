#!/usr/bin/env node
import "source-map-support/register";

import d from "debug";

import { FrameworkStack } from "./framework";
import { NextJSApp } from "./nextjs";
import { Postgres } from "./postgres";

const debug = d("wavekb");
const stack = new FrameworkStack();

const postgres = new Postgres(stack, "Postgres");
const nextjsApp = new NextJSApp(stack, "NextJSApp", {
  postgresUrl: postgres.endpoint,
});

stack.frameworkApp.synthesize();

debug("NextJS app URL: %s", nextjsApp.appUrl);
