-- =====================================================
-- Migration 016: Shipping info on redemption orders
--
-- When an employee redeems an item, we need to know where
-- HR should ship it. Adds three required-ish columns:
-- recipient name, phone, and the address itself.
-- =====================================================

alter table public.redemption_orders
  add column if not exists shipping_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text;

comment on column public.redemption_orders.shipping_name    is 'Name of the person who should receive the shipment (defaults to employee name).';
comment on column public.redemption_orders.shipping_phone   is 'Phone number for the delivery service to contact.';
comment on column public.redemption_orders.shipping_address is 'Full shipping address (street, city, postal code, country).';
