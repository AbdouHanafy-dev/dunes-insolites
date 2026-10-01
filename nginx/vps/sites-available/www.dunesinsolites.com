server {
    listen 80;
    server_name
        www.dunes-insolites.com
        dunes-insolites.com
        www.dunesinsolites.com
        dunesinsolites.com;

    # One hop for every clear-text public spelling.
    return 301 https://www.dunes-insolites.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.dunes-insolites.com;

    ssl_certificate /etc/letsencrypt/live/www.dunesinsolites.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.dunesinsolites.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Prevent direct-origin requests from bypassing Cloudflare's WAF.
    include /etc/nginx/snippets/cloudflare-only.conf;
    include /etc/nginx/snippets/dunes-security-headers.conf;
    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}

server {
    listen 443 ssl;
    server_name dunes-insolites.com www.dunesinsolites.com dunesinsolites.com;

    ssl_certificate /etc/letsencrypt/live/www.dunesinsolites.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.dunesinsolites.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    include /etc/nginx/snippets/dunes-security-headers.conf;
    return 301 https://www.dunes-insolites.com$request_uri;
}
