import { betterAuth } from "better-auth";
import { remultAdapter } from "@nerdfolio/remult-better-auth";
import { anonymous, username } from "better-auth/plugins";
import { User, Account, Session, Verification } from "@/shared/Auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  plugins: [anonymous(), username()],
  user: {
    fields: {
      email: "emailAddress",
    },
  },
  database: remultAdapter({
    authEntities: { User, Account, Session, Verification },
    // authEntities: {},
    usePlural: true,
  }),
});
