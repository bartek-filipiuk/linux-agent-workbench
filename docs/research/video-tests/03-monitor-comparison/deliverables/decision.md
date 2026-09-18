# Decision Record: Self-Hosted Uptime Monitor Selection

## Recommendation
We recommend **Gatus** (`twinproduction/gatus` / `ghcr.io/twin/gatus`). Gatus satisfies all requirements: single Linux Docker host deployment, 12 HTTP checks, 3 TCP checks, native Slack notifications, and a public status page. Uniquely among candidates, Gatus provides officially documented declarative monitor configuration in YAML managed via Git. Gatus achieves the top score of **100/100** and is the highest-scoring qualifying product.

## Evidence-Backed Comparison

| Feature | Gatus | Uptime Kuma | Tianji |
| :--- | :--- | :--- | :--- |
| **Docker Host** | Yes (`ghcr.io/twin/gatus:stable`) | Yes (`louislam/uptime-kuma:2`) | Yes (Compose + PostgreSQL) |
| **HTTP Checks** | Yes (`endpoints[].url`, status/body) | Yes (HTTP/HTTPS monitor type) | Yes (HTTP monitor type) |
| **TCP Checks** | Yes (`tcp://host:port`) | Yes (TCP Port monitor type) | Yes (TCP monitor type) |
| **Slack Alerts** | Yes (Native `alerting.slack`) | Yes (Native Slack provider) | Yes (Via built-in Apprise integration) |
| **Status Page** | Yes (Built-in dashboard / custom domain) | Yes (Public status pages) | Yes (Status pages + custom domain) |
| **Config-as-Code** | Yes (Native YAML in Git) | Unknown (No official docs) | Unknown (No official docs) |
| **License** | Apache-2.0 | MIT | Apache-2.0 |
| **Latest Release (UTC)** | v5.36.0 (2026-05-19) | 2.5.5 (2026-09-16) | v1.33.2 (2026-09-17) |
| **Score / Qualification** | **100** (Qualified) | **80** (Qualified) | **80** (Qualified) |

### Documented Features vs. Judgments & Tradeoffs
- **Gatus** ([README](https://raw.githubusercontent.com/TwiN/gatus/master/README.md)): Documented features include native YAML config files (`config.yaml`), automated file merging, live reloading (`skip-invalid-config-update`), TCP checks via `tcp://`, native Slack alerting, and custom status page branding. As an engineering judgment, Gatus is optimal for developer GitOps workflows because all checks live in version-controlled files without an external database service. The tradeoff is the lack of a point-and-click administrative web UI.
- **Uptime Kuma** ([Docs/Wiki](https://github.com/louislam/uptime-kuma/wiki/Status-Page)): Documented features include Docker installation, HTTP/TCP monitors, 90+ notification services including Slack, and public status pages. It stores monitors in internal SQLite/MariaDB databases. As an engineering judgment, lack of documented Git file configuration means managing monitors in Git requires unsupported community wrappers.
- **Tianji** ([Intro](https://tianji.dev/docs/intro), [Dockerfile](https://raw.githubusercontent.com/msgbyte/tianji/master/Dockerfile), [Apprise Provider](https://raw.githubusercontent.com/msgbyte/tianji/master/src/server/model/notification/provider/apprise.ts)): Documented features include Docker Compose setup, HTTP/TCP monitors, public status pages ([Page Manager](https://raw.githubusercontent.com/msgbyte/tianji/master/src/server/model/page/manager.ts)), and Slack alerts via built-in Apprise CLI (`pip install apprise` in official image). Tradeoffs include requiring a PostgreSQL service and configuring monitors through the web UI/API rather than Git.

## Unknowns & Unresolved Checks
- **Declarative Monitor Configuration**: Official documentation for Uptime Kuma and Tianji does not document native declarative monitor configuration in Git. Under evaluation rules, missing documentation is classified as `unknown` rather than `no`.
- **Third-Party Ecosystem**: While community Terraform providers exist for Uptime Kuma, native Git-based declarative file configuration remains undocumented in core releases.

## Score Explanation
- Weights: Docker=20, HTTP=20, TCP=15, Slack=15, status_page=10, config_as_code=20.
- Mandatory qualification requires Docker, HTTP, TCP, and Slack all to be `yes`.
- **Gatus**: 20 + 20 + 15 + 15 + 10 + 20 = **100** (Qualified).
- **Uptime Kuma**: 20 + 20 + 15 + 15 + 10 + 0 = **80** (Qualified).
- **Tianji**: 20 + 20 + 15 + 15 + 10 + 0 = **80** (Qualified; Slack enabled via Apprise).

## Five-Step Proposed Rollout Checklist
1. **Git Repository Setup**: Create a Git repository containing `config/config.yaml` declaring Slack alerting (`alerting.slack.webhook-url`), 12 HTTP endpoints, and 3 TCP endpoints (`tcp://<host>:<port>`).
2. **Host Environment Preparation**: On the Linux Docker host, create `/opt/gatus/config` and clone the Git repository.
3. **Docker Compose Deployment**: Deploy Gatus via Docker Compose mounting `/opt/gatus/config/config.yaml:/config/config.yaml:ro` and publishing port 8080.
4. **Validation & Alert Verification**: Start the container (`docker compose up -d`), inspect logs, simulate an endpoint failure, and confirm delivery of the Slack alert.
5. **Reverse Proxy & Status Page Routing**: Deploy Caddy or Nginx with TLS termination upstream of port 8080 to publish the status dashboard at `status.yourdomain.com`.
