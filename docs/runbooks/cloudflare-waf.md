# Cloudflare WAF and origin protection

The customer-facing site is `www.dunes-insolites.com`. Cloudflare must proxy
this hostname (orange cloud). The API and backoffice hostnames are separate and
are not changed by this runbook.

## Origin protection

`nginx/vps/snippets/cloudflare-only.conf` permits Cloudflare's published proxy
networks and localhost, then denies every other source. It is included only by
the canonical customer HTTPS vhost. Port 80 remains available for redirects and
ACME certificate renewal.

Deploy with `scripts/deploy-cloudflare-origin-protection.sh`. After deployment:

1. `https://www.dunes-insolites.com/` must return normally through Cloudflare.
2. Resolving that hostname directly to the VPS IP must return HTTP 403.
3. `api.dunesinsolites.com`, `admin.dunesinsolites.com` and
   `auth.dunesinsolites.com` must remain reachable.

Cloudflare announces IP changes before using new ranges. Compare the committed
snippet periodically with `https://www.cloudflare.com/ips-v4` and
`https://www.cloudflare.com/ips-v6`, then redeploy if they differ.

## Live WAF baseline

Applied to the `dunes-insolites.com` zone on 2026-10-01:

- SSL/TLS encryption mode: **Full (strict)**.
- Edge minimum TLS version: **TLS 1.2**; enable TLS 1.3.
- **Cloudflare Free Managed Ruleset**, which Cloudflare deploys by default on
  Free zones.
- Custom block rule `dunes_block_sensitive_paths` for `.env`, `.git`,
  `/actuator`, `/server-status`, `/phpmyadmin`, and `/wp-admin`.
- The Free plan permits one rate-limit rule and only a 10-second counting and
  mitigation period. `dunes_rate_limit_sensitive_api` therefore combines the
  authentication and public write endpoints at 10 requests per 10 seconds per
  source IP. Application rate limits remain the slower second layer.
- Never challenge or aggressively rate-limit the future ClickToPay
  server-to-server notification endpoint. Give that endpoint its own strict
  method/signature validation in the application.
- Cache Rules still require a token with Zone Cache Rules permission. When
  configured, bypass cache for `/api/*`, `/account*`, `/book*`, `/bookings*`
  and `/login*`; static `/_next/static/*` assets may be cached.

Run `scripts/configure-cloudflare-waf.ps1` to apply or update this baseline.
The script identifies its rules by stable `ref` values and does not replace
unrelated rules.

## Access required to automate the dashboard changes

Create a scoped Cloudflare API token for this one zone, with:

- Zone > Zone > Read
- Zone > Zone Settings > Edit
- Zone > WAF > Edit

Restrict the token resource to `dunes-insolites.com`. Do not commit the token.
The local `.env.cloudflare.local` file used by the script is covered by the
repository's `.env.*` ignore rule. Delete the file and revoke the temporary
token after configuration.
