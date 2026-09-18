# Decision Record: Self-Hosted Uptime Monitor Selection

## Recommendation
We recommend **Gatus** (`twinproduction/gatus` or `ghcr.io/twin/gatus`). Gatus satisfies all requirements—Docker deployment, 12 HTTP checks, 3 TCP checks, native Slack alerts, and public status page—while uniquely offering native, officially documented declarative monitor configuration in YAML managed via Git. Gatus scores **100/100** and is fully qualified.

## Evidence-Backed Comparison

| Feature | Gatus | Uptime Kuma | Tianji |
| :--- | :--- | :--- | :--- |
| **Docker Host** | Yes (`ghcr.io/twin/gatus:stable`) | Yes (`louislam/uptime-kuma:2`) | Yes (Docker Compose + Postgres) |
| **HTTP Checks** | Yes (`endpoints[].url`, status/body) | Yes (HTTP/HTTPS monitor type) | Yes (HTTP monitor type) |
| **TCP Checks** | Yes (`tcp://host:port`) | Yes (TCP Port monitor type) | Yes (TCP monitor type) |
| **Slack Alerts** | Yes (Native `alerting.slack`) | Yes (Native Slack notification) | No (Webhook, Apprise, Feishu, Teams, Telegram, SMTP) |
| **Status Page** | Yes (Built-in dashboard / custom domain) | Yes (Public status pages) | Yes (Status pages + custom domain) |
| **Declarative Git Config** | Yes (Native YAML configuration files) | No (Database-driven UI) | No (Database-driven UI/API) |
| **License** | Apache-2.0 | MIT | Apache-2.0 |
| **Latest Release** | v5.36.0 (2026-05-20) | 2.5.5 (2026-09-16) | v1.33.2 (2026-09-17) |
| **Score / Qualification** | **100** (Qualified) | **70** (Qualified) | **65** (Disqualified: Slack=no) |

### Tradeoffs & Judgments
- **Gatus**: Tailored for GitOps. Monitors, thresholds, alerts, and UI branding are declared in YAML files versioned in Git and automatically reloaded (`skip-invalid-config-update`). It runs as a low-resource Go container without requiring a database service. The tradeoff is the lack of a point-and-click administrative web UI, matching this 3-person team's Git preference.
- **Uptime Kuma**: Offers a feature-rich, intuitive GUI and extensive notification support. However, monitor configurations live in an internal SQLite/MariaDB database without official file-based declarative Git workflows. Managing configuration in Git requires community wrappers.
- **Tianji**: Combines analytics, server telemetry, and uptime monitoring. However, it lacks native Slack integration (only generic Webhook or Apprise CLI), requires a PostgreSQL service, and manages monitors via UI/API rather than Git YAML files.

## Unknowns & Unresolved Checks
- **Third-Party Declarative Tools**: Community Terraform providers exist for Uptime Kuma, but official documentation lacks native declarative Git file management.
- **Tianji Slack Compatibility via Apprise**: While Apprise CLI can forward to Slack, Tianji has no documented native Slack provider in official documentation or core provider code. Native Slack is scored `no`.

## Score Explanation
- Weights: Docker=20, HTTP=20, TCP=15, Slack=15, status_page=10, config_as_code=20.
- Mandatory qualification requires Docker, HTTP, TCP, and Slack all to be `yes`.
- **Gatus**: 20 + 20 + 15 + 15 + 10 + 20 = **100** (Qualified).
- **Uptime Kuma**: 20 + 20 + 15 + 15 + 10 + 0 = **70** (Qualified).
- **Tianji**: 20 + 20 + 15 + 0 + 10 + 0 = **65** (Disqualified due to Slack).

## Five-Step Proposed Rollout Checklist

1. **Git Repository Setup**: Create a Git repository containing `config/config.yaml` defining the Slack webhook alert, 12 HTTP endpoints, and 3 TCP endpoints (`tcp://<host>:<port>`).
2. **Host Environment Preparation**: On the Linux Docker host, create `/opt/gatus/config` and clone the repository.
3. **Docker Compose Deployment**: Deploy Gatus mounting `/opt/gatus/config/config.yaml:/config/config.yaml:ro` and publishing port 8080.
4. **Validation & Alert Verification**: Start container (`docker compose up -d`), verify logs, trigger a synthetic check failure, and confirm receipt of the Slack alert.
5. **Reverse Proxy & Status Page Routing**: Place Nginx/Caddy with TLS in front of port 8080 to expose the public status page.
