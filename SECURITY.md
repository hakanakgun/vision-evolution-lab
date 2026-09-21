# Security Policy

## Supported version

Security fixes are applied to the current `main` branch and the GitHub Pages deployment. Older commits or copied deployments are not supported.

## Reporting a vulnerability

Please do **not** open a public issue for an undisclosed vulnerability.

If GitHub's **Report a vulnerability** / private security advisory flow is available for this repository, use it. Otherwise, contact the repository owner privately using a contact method published on their GitHub profile.

Useful reports include:

- affected browser and OS;
- reproduction steps;
- proof of concept when safe;
- expected impact;
- whether the issue can expose a user's local image/camera data, execute script, alter model/runtime assets, or misrepresent benchmark results.

## Security boundaries

Vision Evolution Lab is a static GitHub Pages application with no application backend. Its important security and privacy boundaries include:

- user-selected images and camera frames should remain in the browser;
- third-party runtime/model downloads must come from documented sources;
- model/checkpoint provenance and licenses must remain auditable;
- changes that introduce telemetry, uploads, new remote scripts, or new remote model hosts require explicit review.

Do not include private images, credentials, access tokens, or other sensitive data in public reports.
