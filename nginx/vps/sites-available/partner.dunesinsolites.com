server {
    server_name partner.dunesinsolites.com;

    include /etc/nginx/snippets/dunes-security-headers.conf;
    location / {
        proxy_pass http://127.0.0.1:3110;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.dunesinsolites.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.dunesinsolites.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = partner.dunesinsolites.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name partner.dunesinsolites.com;
    return 404; # managed by Certbot


}