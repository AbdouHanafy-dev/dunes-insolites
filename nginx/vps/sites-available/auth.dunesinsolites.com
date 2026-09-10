server {
    server_name auth.dunesinsolites.com;

    # Keycloak hardening: the admin console and the master realm must not be
    # reachable from the internet. Manage Keycloak via an SSH tunnel to :8280.
    location ~ ^/admin(/|$)            { return 404; }
    location ~ ^/realms/master(/|$)    { return 404; }
    location ~ ^/metrics(/|$)          { return 404; }

    location / {
        proxy_pass http://127.0.0.1:8280;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.dunesinsolites.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.dunesinsolites.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = auth.dunesinsolites.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name auth.dunesinsolites.com;
    return 404;
}
