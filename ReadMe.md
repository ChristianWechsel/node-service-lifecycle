# TypeScript Library for Google Cloud & NPM

A production-ready TypeScript library package pre-configured with strict TypeScript compilation, Jest testing (unit and integration), and automated CI/CD via Google Cloud Build and Terraform.

---

## Features

- **Strict TypeScript**: Configured with modern ESM settings (`tsconfig.json`, `tsconfig.prod.json`, `tsconfig.test.json`).
- **Jest Test Suites**: Split into fast unit tests (`*.test.unit.ts`) and integration tests (`*.test.int.ts`).
- **Dual CI/CD Pipeline (`cloudbuild.yaml`)**:
  - **Internal Releases**: Pushes to the target branch (e.g., `main`) automatically publish to your private **GCP Artifact Registry** NPM repository.
  - **Public Releases**: Pushing a version tag (e.g., `v1.0.0`) automatically publishes to **npmjs.org** using a token from **GCP Secret Manager**.
- **Infrastructure as Code (Terraform)**: Pre-configured Terraform code (`main.tf`, `variables.tf`) to manage Cloud Build triggers connected to your GitHub repository.

---

## Project Structure

```text
├── bin/
│   └── clean.sh                  # Cleans dist/ build outputs
├── src/
│   ├── index.ts                  # Library entry point (public exports)
│   └── health/
│       ├── health.ts             # Health status and check implementation
│       └── health.test.unit.ts   # Unit tests
├── cloudbuild.yaml               # Cloud Build pipeline configuration
├── jest.config.mjs               # Jest configuration
├── main.tf                       # Terraform Cloud Build triggers
├── package.json                  # Package manifest, scripts, and dependencies
├── provider.tf                   # Terraform Google provider config
├── terraform.tfvars.example      # Example variable values for Terraform
├── tsconfig.json                 # Base TypeScript configuration
├── tsconfig.prod.json            # Production build configuration
├── tsconfig.test.json             # Test build configuration
└── variables.tf                  # Terraform variable definitions
```

## Using Health

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

A failed check changes the status to `not-ok`. Later successful checks do not automatically restore it to `ok`; if your application needs recovery behavior, call `health.setStatus("ok")` when recovery has been confirmed. You can also use `health.setStatus("not-ok")` to report an application-level failure, register a callback with `health.onStatusChange(...)`, and append/read diagnostic entries with `health.addLog(...)` and `health.getLog()`.

---

## Getting Started

### 1. Install Dependencies

```shell
npm install
```

### 2. Configure Package Metadata

Open `package.json` and adjust:

- `"name"`: Set your desired package name (e.g., `@your-scope/my-library`).
- `"description"`: Brief summary of the library.
- `"author"`: Your name and email.
- `"repository"`: Git repository URL.

Also update the [LICENSE](LICENSE) file with the current year and your name or organization.

### 3. Setup GCP Cloud Build Triggers (Terraform)

This repository includes Terraform configuration to create the Cloud Build triggers that run your CI/CD pipeline on branch pushes and tag releases.

#### Prerequisite: Cloud Build 2nd Gen GitHub Connection

For Cloud Build triggers to respond to Git push events, your GitHub account and repository must be connected to Google Cloud Build (2nd Gen). This connection must be authorized in GitHub:

1. In **Google Cloud Console** > **Cloud Build** > **Repositories** (under **2nd gen**), click **Create host connection**.
2. Follow the prompt to install and authorize the **Google Cloud Build GitHub App** on your GitHub account or organization.
3. Click **Link repository** to connect your specific GitHub repository to this host connection.

#### Provisioning the Triggers

1. **Copy the example variables file:**

   ```shell
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Fill in your environment details in `terraform.tfvars`:**
   - `project_id`: GCP Project ID.
   - `location`: GCP region (e.g., `europe-west3`).
   - `github_connection_name`: Name of the Cloud Build 2nd Gen host connection.
   - `github_repo_name`: Name of the linked repository.
   - `target_branch`: Git branch that triggers CI/CD builds on push (e.g., `main`).
   - `account_id`: Service Account ID for Cloud Build.
   - `gcp_repository_name`: Repository identifier in Cloud Build (`<github_owner>-<github_repo_name>`).
   - `npm_scope`: NPM scope (e.g., `@my-org`).
   - `npm_repository_id`: Artifact Registry repository ID for NPM packages.
   - `npm_secret_name`: Secret Manager secret name for the NPM token.

3. **Deploy the triggers:**

   ```shell
   terraform init
   terraform apply
   ```

> **Note:** `terraform.tfvars` contains sensitive environment identifiers and is ignored by `.gitignore`. Do not commit this file.

---

## Local Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Compiles TypeScript using `tsconfig.json` into `dist/`. |
| `npm run build-prod` | Produces a clean production build (`tsconfig.prod.json`). |
| `npm test` | Builds test configuration and runs all unit and integration tests. |
| `npm run test:unit` | Runs only unit tests (`*.test.unit.ts`). |
| `npm run test:int` | Runs only integration tests (`*.test.int.ts`). |
| `npm run clean` | Removes the `dist/` build directory. |

---

## CI/CD & Publishing Workflow

The included [cloudbuild.yaml](cloudbuild.yaml) pipeline automates testing and deployment:

### 1. Internal Branch Releases (GCP Artifact Registry)

Every push to your target branch (`main`):

1. Runs `npm audit --audit-level=high` for vulnerability scanning.
2. Runs `npm ci` and `npm test` across all suites.
3. Automatically authenticates using Cloud Build service account credentials.
4. Publishes an internal package version to your private GCP Artifact Registry.

### 2. Public Releases (npmjs.org)

When you are ready to publish a release to public npm:

1. Update the version in `package.json`:

   ```shell
   npm version patch # or minor, major
   ```

2. Push the commit and the version tag:

   ```shell
   git push origin main --tags
   ```

3. Cloud Build detects the `v*` tag, retrieves the `NPM_TOKEN` secret from Secret Manager, and publishes the package with public access:

   ```shell
   npm publish --access public
   ```

---

## Consuming this Library

### From GCP Artifact Registry (Internal)

In downstream projects, configure `.npmrc`:

```npmrc
@your-scope:registry=https://<REGION>-npm.pkg.dev/<PROJECT_ID>/<REPOSITORY_ID>/
```

Authenticate your local environment:

```shell
npx google-artifactregistry-auth
npm install @your-scope/my-library
```

### From npmjs.org (Public)

```shell
npm install @your-scope/my-library
```

---

## License

[MIT](LICENSE)

> **Note:** Update the [LICENSE](LICENSE) file manually with the current year and your name or organization (replace `<YEAR>` and `<AUTHOR_OR_ORGANIZATION>`).
