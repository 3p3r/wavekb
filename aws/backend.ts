#!/usr/bin/env node
import "source-map-support/register";

import { FrameworkStack } from "./framework";
import { NextJSApp } from "./nextjs";
import { Postgres } from "./postgres";

const stack = new FrameworkStack();

const postgres = new Postgres(stack, "Postgres");
const nextjsApp = new NextJSApp(stack, "NextJSApp");

stack.frameworkApp.synthesize();
