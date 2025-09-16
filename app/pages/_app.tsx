import React, { type JSX } from "react";
import { AppProps } from "next/app";
import type { NextPage } from "next";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { useNotificationProvider, ThemedLayout } from "@refinedev/antd";
import routerProvider, {
  UnsavedChangesNotifier,
} from "@refinedev/nextjs-router/pages";

import { remultDataProvider } from "@/provider/dataProvider";
import { entities } from "@/shared";
import "@refinedev/antd/dist/reset.css";
import { Header } from "@/components/header";
import { ColorModeContextProvider } from "@/contexts";
import { authProvider } from "@/provider/authProvider";
import { liveProvider } from "@/provider/liveProvider";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  noLayout?: boolean;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function NextApp({ Component, pageProps }: AppPropsWithLayout): JSX.Element {
  const renderComponent = () => {
    if (Component.noLayout) {
      return <Component {...pageProps} />;
    }

    return (
      <ThemedLayout Header={Header}>
        <Component {...pageProps} />
      </ThemedLayout>
    );
  };

  return (
    <>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <Refine
            routerProvider={routerProvider}
            dataProvider={remultDataProvider(entities)}
            notificationProvider={useNotificationProvider()}
            authProvider={authProvider}
            resources={[
              {
                name: "segments",
                list: "/segments",
                create: "/segments/create",
                edit: "/segments/edit/:id",
                show: "/segments/show/:id",
                meta: {
                  canDelete: true,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              liveMode: "auto",
            }}
            liveProvider={liveProvider(entities)}
          >
            {renderComponent()}
            <RefineKbar />
            <UnsavedChangesNotifier />
          </Refine>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </>
  );
}

export default NextApp;
