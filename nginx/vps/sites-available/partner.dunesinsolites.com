server {
    listen 80;
    server_name partner.dunesinsolites.com;
    return 301 https://admin.dunesinsolites.com$request_uri;
}

server {
    listen 443 ssl;
    server_name partner.dunesinsolites.com;

    ssl_certificate /etc/letsencrypt/live/api.dunesinsolites.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.dunesinsolites.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    include /etc/nginx/snippets/dunes-security-headers.conf;
    return 301 https://admin.dunesinsolites.com$request_uri;
}
