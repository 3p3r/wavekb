import { NavigateToResource } from "@refinedev/nextjs-router/pages";

export default function Home() {
  return <NavigateToResource resource="projects" />;
}

Home.noLayout = true;
