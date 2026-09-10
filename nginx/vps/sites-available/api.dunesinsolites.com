server {
    if ($host = api.dunesinsolites.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name api.dunesinsolites.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.dunesinsolites.com;
    ssl_certificate /etc/letsencrypt/live/api.dunesinsolites.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.dunesinsolites.com/privkey.pem; # managed by Certbot

    include /etc/nginx/snippets/dunes-security-headers.conf;
    client_max_body_size 10m;

    location = /api/auth/login {
        limit_req zone=dunes_auth burst=5 nodelay;
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/api/public/(bookings|stay-bookings|contact|subscribe)$ {
        limit_req zone=dunes_pub burst=10 nodelay;
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 24h;
    }
}
