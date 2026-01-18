# Roadmap

## v1.0 — GA (Hardening)
- CI/CD (GitHub Actions): build, test, lint, image publish
- Health/readiness + liveness probes
- OIDC Admin auth, audit logs
- Horizontal scale (app + worker replicas)

## v1.1 — Integrations
- CRM: Salesforce/HubSpot (intent & caller enrichment)
- Ticketing: Zendesk/Jira for `takeMessage`
- Slack/Email alerting on intents (e.g., missed transfer)

## v1.2 — Quality & UX
- Barge-in improvements; duplex stability
- Prompt tuning with business style & disambiguation
- SSML prosody presets; multiple voices

## v1.3 — Analytics
- Intent resolution rate, time to resolution
- Cohort comparisons by channel/time
- Export to CSV / webhook sinks

## Stretch
- Multi-tenant, per-tenant branding & KB
- PCI/HIPAA variants (recording handling)
- Spam/fraud detection for robocalls
- Call recording storage lifecycle & redaction
