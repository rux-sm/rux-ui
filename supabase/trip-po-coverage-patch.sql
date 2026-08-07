-- Adds structured purchase-order coverage to a trip. A PO authorizes
-- invoicing; it is not a payment and remains separate from trip_payments.
alter table public.trips
	add column if not exists po_amount numeric(12, 2);

alter table public.trips
	drop constraint if exists trips_po_amount_nonnegative;
alter table public.trips
	add constraint trips_po_amount_nonnegative
	check (po_amount is null or po_amount >= 0);

-- Existing received POs previously implied complete authorization. Preserve
-- that behavior until a dispatcher enters the PO's actual authorized amount.
update public.trips
set po_amount = quoted_price
where coalesce(po_received, false)
	and po_amount is null
	and quoted_price is not null;

comment on column public.trips.po_amount is
	'Amount authorized by the purchase order; does not represent payment received.';
