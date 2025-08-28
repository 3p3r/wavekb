import { Construct } from "constructs";
import { Nextjs } from "cdk-nextjs-standalone";

export class NextJSApp extends Construct {
  readonly nextjs: Nextjs;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.nextjs = new Nextjs(this, "Nextjs", {
      nextjsPath: "./app", // relative path from your project root to NextJS
    });
  }
}
