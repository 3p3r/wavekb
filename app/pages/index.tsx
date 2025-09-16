import { NavigateToResource } from "@refinedev/nextjs-router/pages";

export default function Home() {
  return <NavigateToResource resource="segments" />;
}

Home.noLayout = true;
