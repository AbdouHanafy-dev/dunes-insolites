server {
    listen 80;
    server_name mon.dunesinsolites.com;

    return 301 https://mon.dunesinsolites.com$request_uri;
}

server {
    listen 443 ssl;
    server_name mon.dunesinsolites.com;

    # This shared certificate must include mon.dunesinsolites.com in its SANs.
    # See docs/runbooks/domain-routing.md before deploying this vhost.
    ssl_certificate /etc/letsencrypt/live/api.dunesinsolites.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.dunesinsolites.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    include /etc/nginx/snippets/dunes-security-headers.conf;
    location / {
        proxy_pass http://127.0.0.1:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
