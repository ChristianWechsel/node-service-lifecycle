# Using Health

`Health` provides a status for an application and can run asynchronous checks whenever the status is requested. Create one instance during application startup, register checks for dependencies that matter to your service, and expose its status through your server's health endpoint.

```ts
import express from "express";
import { Health } from "@christian-wechsel/node-service-lifecycle";

const app = express();
const health = new Health();

health.addChecks(async () => {
   // Return true when the dependency is reachable and usable.
   return database.ping();
});

app.get("/health", async (_req, res) => {
   const status = await health.getStatus();
   res.status(status === "ok" ? 200 : 503);
   res.json({ status });
});
```

The endpoint responds with `200` and `{ "status": "ok" }` when healthy, or `503` and `{ "status": "not-ok" }` when unhealthy. `getStatus()` runs all registered checks on every request. With no checks registered, the initial status is `ok`. A check should resolve to `false` when its dependency is unhealthy; if a check rejects, `getStatus()` rejects as well, so handle that error in your server according to your Express version and error-handling setup.

A failed check changes the status to `not-ok`; once all registered checks succeed, the status automatically returns to `ok`. When no checks are registered, `getStatus()` leaves a status set manually with `health.setStatus(...)` unchanged. You can also register a callback with `health.onStatusChange(...)` and append/read diagnostic entries with `health.addLog(...)` and `health.getLog()`.

---

## License

[MIT](LICENSE)

> **Note:** Update the [LICENSE](LICENSE) file manually with the current year and your name or organization (replace `<YEAR>` and `<AUTHOR_OR_ORGANIZATION>`).
