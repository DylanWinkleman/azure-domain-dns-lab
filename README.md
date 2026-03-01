# azure-domain-dns-lab

# Azure DNS + Azure Static Web Apps Lab

Live site: https://dylancloudlab.net

## What this project demonstrates
- Domain delegation to Azure DNS (authoritative DNS hosting)
- Apex (`@`) ALIAS/A record to Azure Static Web App
- `www` CNAME to Azure Static Web App hostname
- CI/CD via GitHub Actions: push to `main` automatically deploys the site

## Architecture
GitHub repo → GitHub Actions → Azure Static Web Apps  
Public DNS hosted in Azure DNS

## How to deploy
1. Edit files in `/site`
2. `git add .`
3. `git commit -m "message"`
4. `git push`

