-- Optional public sale price for a Tour's adult rate - lets the admin run
-- a real, honest discount (struck-through "was" price on cards), distinct
-- from user_product_remises (a private per-user discount, not a public
-- sale).

ALTER TABLE public.tours
    ADD COLUMN sale_price_adult numeric(15,3);
