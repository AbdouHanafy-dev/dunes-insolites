# Domain routing and TLS contract

This is the production hostname contract. Do not add a public hostname without
assigning it one of the roles below and adding a production smoke test.

## Active application hosts

| Host | Role | Expected response |
|---|---|---|
| `www.dunes-insolites.com` | Canonical public and customer site | Serves the frontend |
| `api.dunesinsolites.com` | API and future payment webhooks | Serves the backend |
| `admin.dunesinsolites.com` | Single backoffice UI | Serves the admin app |
| `auth.dunesinsolites.com` | Keycloak/OIDC only | Serves Keycloak |
| `mon.dunesinsolites.com` | Grafana monitoring | Serves Grafana over valid HTTPS |

`auth` is an identity provider, not the backoffice UI. The backoffice UI is
`admin`; successful OIDC login returns there.

## Redirect-only hosts

These names remain in DNS and on a valid certificate so an HTTPS request can
be redirected safely. They must never proxy an application or return a site
with status 200.

| Source | Permanent target |
|---|---|
| `dunes-insolites.com` | `https://www.dunes-insolites.com$request_uri` |
| `dunesinsolites.com` | `https://www.dunes-insolites.com$request_uri` |
| `www.dunesinsolites.com` | `https://www.dunes-insolites.com$request_uri` |
| `partner.dunesinsolites.com` | `https://admin.dunesinsolites.com$request_uri` |
| `camping.dunesinsolites.com` | `https://admin.dunesinsolites.com$request_uri` |

The `partner` and `camping` applications were replaced by the role-aware
`admin` application. Keeping redirect-only vhosts preserves old bookmarks
without exposing three copies of the same backoffice.

Do not create a wildcard/catch-all redirect for `*.dunesinsolites.com`: it
would intercept `api`, `auth`, `admin`, and `mon`.

`mq.dunesinsolites.com` is not an application host: RabbitMQ is bound to the
private Docker/VPS network and no nginx vhost references this name. Its old
standalone Certbot certificate is orphaned and may be deleted after confirming
that the DNS record is not used by an external monitoring integration.

## Certificate coverage

Two domain families exist and a wildcard for one cannot cover the other:

- Cloudflare/public certificate: `dunes-insolites.com` and
  `*.dunes-insolites.com`.
- VPS Let's Encrypt certificates: the `dunesinsolites.com` names above.

Before deploying the `mon` HTTPS vhost, expand the existing shared VPS
certificate so its SAN list also contains `mon.dunesinsolites.com`:

```bash
sudo certbot certonly --nginx --cert-name api.dunesinsolites.com \
  -d api.dunesinsolites.com \
  -d admin.dunesinsolites.com \
  -d auth.dunesinsolites.com \
  -d camping.dunesinsolites.com \
  -d partner.dunesinsolites.com \
  -d mon.dunesinsolites.com
sudo certbot renew --dry-run
```

Keep `dunesinsolites.com` and `www.dunesinsolites.com` on their existing
redirect certificate. A redirect does not remove the TLS requirement: the
browser validates the source host before it accepts the 301.

## Deployment order

1. Expand the shared certificate for `mon` using the command above.
2. Install the committed files from `nginx/vps/sites-available/` and keep the
   existing `sites-enabled` symlinks. If Certbot previously created a regular
   `sites-enabled/www.dunesinsolites.com` file, replace it with a symlink to
   the reviewed `sites-available` file.
3. Remove the old `bare-domain-redirect.conf` file or symlink. Its rules are now
   consolidated into `www.dunesinsolites.com`, avoiding duplicate
   `server_name` ownership.
4. Run `sudo nginx -t`; do not reload on any error.
5. Run `sudo systemctl reload nginx`.
6. Deploy the backend CORS change.
7. Run the smoke checks below.

The repository script `scripts/deploy-domain-routing.sh` performs steps 2–5
with a timestamped backup and automatic rollback if validation or reload fails.

```bash
curl -sSI https://dunesinsolites.com/test-path?q=1 | grep -Ei 'HTTP/|location:'
curl -sSI https://www.dunesinsolites.com/test-path?q=1 | grep -Ei 'HTTP/|location:'
curl -sSI https://partner.dunesinsolites.com/reservations | grep -Ei 'HTTP/|location:'
curl -sSI https://camping.dunesinsolites.com/reservations | grep -Ei 'HTTP/|location:'
curl -sSI https://mon.dunesinsolites.com/ | grep -Ei 'HTTP/|location:'
```

The first two must return one `301` to the canonical public hostname. The next
two must return one `301` to `admin`. The monitoring request must complete
without a certificate-name error.

## DNS cleanup rule

Keep DNS records for every active or redirect-only host listed above. Remove
any other `dunesinsolites.com` record only after confirming it is absent from
the repository, access logs, OAuth redirect URIs, email templates, analytics,
and payment-provider callback configuration. Never delete `api` or `auth` as
part of public-site cleanup.
