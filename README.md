# Dylan's Cloud Lab

Personal Azure portfolio deployed at [www.dylancloudlab.net](https://www.dylancloudlab.net/).

## What this project demonstrates

- Custom domain delegation and DNS records in Azure DNS
- Static hosting and HTTPS through Azure Static Web Apps
- Automatic deployment from GitHub Actions
- A restrictive Content Security Policy and browser security headers
- Responsive HTML, CSS, and JavaScript with a locally hosted Three.js scene

## Project structure

- `site/index.html` contains the page content and semantic structure.
- `site/styles.css` contains the responsive visual system.
- `site/script.js` contains the navigation behavior.
- `site/scene.js` contains the interactive infrastructure topology.
- `site/vendor/` contains the pinned Three.js browser module and its MIT license.
- `site/staticwebapp.config.json` defines response security headers.
- `.github/workflows/` contains the Azure deployment workflow.

## Local preview

From the `site` directory:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

The local Python server does not apply the Azure response headers. Verify those headers against the deployed site after the workflow completes.

## Deployment

Pushes to `main` deploy automatically. Pull requests receive an Azure Static Web Apps preview environment and are closed automatically when the pull request closes.
