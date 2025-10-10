# Auth.ts

To regenerate auth schemas, run the following command in _the root of the project_:

```sh
npx @better-auth/cli@latest generate --yes --config src/server/auth.ts --output src/shared/Auth.ts
```

If you get errors, modify the `src/server/auth.ts` file so that it does not reference the current models:

```ts
// authEntities: {}, // <-- remove comments on this 
```
