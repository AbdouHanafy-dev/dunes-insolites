-- Runs automatically on first PostgreSQL container start
-- Creates the Keycloak database alongside your app database

CREATE DATABASE keycloak_db;
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO postgres;