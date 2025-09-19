import d from "debug";
const debug = d("app:health");

export async function handler(...args: any) {
  debug("Health check: %o", args);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "OK" }),
  };
}
