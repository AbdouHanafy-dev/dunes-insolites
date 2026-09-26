-- Wording of the public site's booking forms, edited from the back office. One row per
-- (language, message key); a missing row means the text shipped with the site is used.
CREATE TABLE site_text_override (
    locale      VARCHAR(5)   NOT NULL,
    text_key    VARCHAR(160) NOT NULL,
    text_value  TEXT         NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    PRIMARY KEY (locale, text_key)
);
