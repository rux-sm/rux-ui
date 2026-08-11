begin;

-- Corrected June 1-29, 2026 legacy import.
-- Generated from the full legacy trips and bus_assignments exports.
-- Source joins use tripKey, never the reusable tripId.

create temporary table mar26_trips_source (
  legacy_trip_key text primary key,
  original_trip_ref text,
  start_date date not null,
  end_date date not null,
  destination text,
  customer text
) on commit drop;

insert into mar26_trips_source values
  ('cfb228d3-94b6-438c-b579-de7ab7162016', 'TRIP-20260601-0002', '2026-06-01', '2026-06-07', 'Orlando, FL', 'Donna North HS'),
  ('96b77c34-abdc-48df-b759-b264f17478da', 'TRIP-20260601-0003', '2026-06-01', '2026-06-04', 'Houston, TX', 'The Arts Educational Tours'),
  ('182c3f2d-c62c-4fbf-9d31-389f605000c4', 'TRIP-20260601-0004', '2026-06-01', '2026-06-03', 'Dallas, TX', 'The Arts Educational Tours'),
  ('af8e334d-3a6b-4f46-9258-8ba3502ebae6', 'TRIP-20260602-0001', '2026-06-02', '2026-06-02', 'San Antonio, TX', 'Rafael Cantu Jr High'),
  ('e271fb9d-fe6d-4e0c-8f26-830694df8432', 'TRIP-20260602-0001', '2026-06-02', '2026-06-02', 'San Antonio, TX', 'Rafael Cantu Jr High'),
  ('8c5a6473-43e4-4710-9194-f9e4acc39748', 'TRIP-20260603-0001', '2026-06-03', '2026-06-03', 'San Antonio, TX', 'Brown Middle School'),
  ('61653590-cfb3-418e-b9c5-3366a10f0859', 'TRIP-20260603-0002', '2026-06-03', '2026-06-03', 'San Antonio, TX', 'Cathey Middle School'),
  ('b261dd32-280d-47dc-94e9-f21d68ab427a', 'TRIP-20260603-0003', '2026-06-03', '2026-06-03', 'San Antonio, TX', null),
  ('cd565ead-6c3b-4aab-93ae-185f210a981f', 'TRIP-20260604-0001', '2026-06-04', '2026-06-07', 'Austin Tx', 'MCHI  Cheer'),
  ('0f484b86-f45c-46a9-ae10-0a1dcee9df33', 'TRIP-20260604-0002', '2026-06-04', '2026-06-06', 'Austin Tx', 'STC'),
  ('c507fe2b-59d7-42c9-a85c-3ea1e30ad6fc', 'TRIP-20260604-0003', '2026-06-04', '2026-06-06', 'Round Rock TX', 'Sharyland High School'),
  ('a366aacf-fe85-4fbc-ae14-360336a26817', 'TRIP-20260605-0003', '2026-06-05', '2026-06-05', 'Monte Alto', null),
  ('e2948b71-32b9-40a5-8363-c357973fea42', 'TRIP-20260605-0004', '2026-06-05', '2026-06-05', 'McAllen, TX', 'UTRGV'),
  ('caf0834a-c920-4ce1-91a1-c927431fc577', 'TRIP-20260605-0005', '2026-06-05', '2026-06-05', 'McAllen TX', 'Texas A&M C.A.'),
  ('e1566955-7271-4b33-8aa0-7b9c7ee37d26', 'TRIP-20260607-0001', '2026-06-07', '2026-06-09', 'Paragon Casino', 'Pearl Elite'),
  ('03be7ef4-bfd5-42c8-a85e-62ed0fd88941', 'TRIP-20260607-0002', '2026-06-07', '2026-06-13', 'Washington D.C.', 'Raymondville High School'),
  ('1e30cbba-7ccb-47e6-ac4b-d2f5ce1058f5', 'TRIP-20260608-0001', '2026-06-08', '2026-06-08', 'San Antonio, TX', 'McAllen Memorial HS'),
  ('a43e9c2a-e460-4dd1-8d32-0c8cbfd3e1dd', 'TRIP-20260608-0001', '2026-06-08', '2026-06-11', 'Dallas, TX', 'Rowe High School'),
  ('06ea52d1-75c8-4ef8-bf53-45fa982998f4', 'TRIP-20260608-0002', '2026-06-08', '2026-06-14', 'Dallas, TX', 'UTRGV Brownsville'),
  ('4784c47a-a35b-4af9-8747-37d975bde405', 'TRIP-20260608-0002', '2026-06-08', '2026-06-08', 'San Antonio TX', 'Memorial High School'),
  ('tk_1776808793188_105183261', 'TRIP-20260608-0003', '2026-06-08', '2026-06-08', 'New Branfels, TX', 'McAllen High School'),
  ('133d89e8-fd4b-46f6-94f6-406bab54de90', 'TRIP-20260609-0001', '2026-06-09', '2026-06-11', 'Houston, TX', 'TAMIU Kingsville'),
  ('tk_1779811640045_749625118', 'TRIP-20260610-0001', '2026-06-10', '2026-06-12', 'Austin, TX', 'Metropolitan Shuttle'),
  ('5e68482e-b61e-4b84-a708-6e839568e1b3', 'TRIP-20260611-0001', '2026-06-10', '2026-06-13', 'Bensalem, PA', null),
  ('900f1ed7-13cd-4f7d-a6c9-182b4fde03ec', 'TRIP-20260612-0004', '2026-06-11', '2026-06-11', 'Brownsville, TX', 'UTRGV'),
  ('f5dc9cbb-9577-4414-b953-5181f553809d', 'TRIP-20260612-0001', '2026-06-12', '2026-06-13', 'Houston, TX', 'Hidalgo ISD'),
  ('ede3acf9-e454-429d-8107-fdfa5ecbec62', 'TRIP-20260612-0002', '2026-06-12', '2026-06-15', 'Austin Tx', 'Veterans Memorial HS'),
  ('tk_1776808840871_183945782', 'TRIP-20260612-0003', '2026-06-12', '2026-06-12', 'New Branfels, TX P/U', 'McAllen High School'),
  ('4a66bda2-b607-47aa-a702-79b9b23747be', 'TRIP-20260614-0001', '2026-06-14', '2026-06-14', 'Port Isabel TX', 'South Padre Island'),
  ('e6ba0f45-38f1-45e4-90fb-7d39dcb3b3b3', 'TRIP-20260615-0001', '2026-06-15', '2026-06-17', 'Paragon Casino', '-'),
  ('2d08941a-9cb3-4f2b-b01e-1fe6c7973ba3', 'TRIP-20260615-0003', '2026-06-15', '2026-06-17', 'San Antonio, TX', 'McAllen High School'),
  ('6ca6282e-e454-4064-a555-63e9a275c72c', 'TRIP-20260617-0001', '2026-06-17', '2026-06-17', 'Pharr TX', 'UTRGV'),
  ('93c15372-2d01-4326-8c1b-28ab5779c678', 'TRIP-20260418-0004', '2026-06-18', '2026-06-18', 'Local Trip', 'Red Charter Buses'),
  ('608f3561-be39-4598-94cb-15cfc23dabb5', 'TRIP-20260619-0001', '2026-06-19', '2026-06-21', 'Irving, TX', 'Queen of Peace'),
  ('tk_1777407637014_458886714', 'TRIP-20260606-0002', '2026-06-20', '2026-06-20', 'Rockport, TX', 'San Martin De Porres'),
  ('fe7ea863-0a37-45ef-be0a-e582d96cbcc2', 'TRIP-20260620-0002', '2026-06-20', '2026-06-20', 'Harlingen TX', 'Dargel Boats'),
  ('70af13ef-e348-431d-8c95-a34b09c8a610', 'TRIP-20260623-0001', '2026-06-23', '2026-06-23', 'McAllen TX', 'BGCM Roney'),
  ('35948942-9266-466c-b6f4-43140058da4f', 'TRIP-20260616-0001', '2026-06-24', '2026-06-24', 'Mission, TX', 'B&GC McAllen'),
  ('926b178b-641d-4e5b-964c-b4fff2df6bf4', 'TRIP-20260625-0002', '2026-06-25', '2026-06-25', 'Brownsville, TX', 'RGV Foodbank'),
  ('tk_1777404138783_653347047', 'TRIP-20260625-0003', '2026-06-25', '2026-06-25', 'Local', 'Our Lady of Mercy'),
  ('635527fc-1a9d-4f15-b22b-7d08e30dec3b', 'TRIP-20260626-0002', '2026-06-25', '2026-06-28', 'Alexandria, LA', 'St Phillip The Apostle Youth'),
  ('260daf20-be99-4204-891b-1ecfd79279a2', 'TRIP-20260626-0001', '2026-06-26', '2026-06-26', 'Houston, TX', 'UTRGV');

create temporary table mar26_assignments_source (
  legacy_assignment_id text primary key,
  legacy_trip_key text not null,
  bus_number text,
  primary_driver text,
  co_driver text,
  relief_start text,
  relief_end text
) on commit drop;

insert into mar26_assignments_source values
  ('2388', '03be7ef4-bfd5-42c8-a85e-62ed0fd88941', '218', 'George', 'Rigo', null, null),
  ('2389', '03be7ef4-bfd5-42c8-a85e-62ed0fd88941', '763', 'Jonathan', 'Juvel', null, null),
  ('2404', '06ea52d1-75c8-4ef8-bf53-45fa982998f4', '898', 'Oscar', null, null, null),
  ('2321', '0f484b86-f45c-46a9-ae10-0a1dcee9df33', '133', 'Ernesto', null, null, null),
  ('2440', '133d89e8-fd4b-46f6-94f6-406bab54de90', '607', 'Jorge', null, null, null),
  ('2145', '182c3f2d-c62c-4fbf-9d31-389f605000c4', '898', 'Lozano', 'Arredondo', null, null),
  ('2146', '182c3f2d-c62c-4fbf-9d31-389f605000c4', '506', 'David', 'Arredondo', null, null),
  ('2407', '1e30cbba-7ccb-47e6-ac4b-d2f5ce1058f5', '607', 'Maria', null, null, null),
  ('2863', '260daf20-be99-4204-891b-1ecfd79279a2', '218', 'Raul', 'Jorge', null, null),
  ('2779', '2d08941a-9cb3-4f2b-b01e-1fe6c7973ba3', '218', 'Jorge', null, null, null),
  ('2751', '35948942-9266-466c-b6f4-43140058da4f', '218', 'George', null, null, null),
  ('2430', '4784c47a-a35b-4af9-8747-37d975bde405', '133', 'Soto', null, null, null),
  ('2606', '4a66bda2-b607-47aa-a702-79b9b23747be', '133', 'Andy', null, null, null),
  ('2607', '4a66bda2-b607-47aa-a702-79b9b23747be', '474', 'David', null, null, null),
  ('2463', '5e68482e-b61e-4b84-a708-6e839568e1b3', '470', 'Soto', 'Raul', null, null),
  ('2464', '5e68482e-b61e-4b84-a708-6e839568e1b3', '133', 'Ivan', 'Padron', null, null),
  ('2781', '608f3561-be39-4598-94cb-15cfc23dabb5', '763', 'Oscar', null, null, null),
  ('2270', '61653590-cfb3-418e-b9c5-3366a10f0859', '763', 'Soto', null, null, null),
  ('2880', '635527fc-1a9d-4f15-b22b-7d08e30dec3b', '763', 'Juvel', null, null, 'Maria'),
  ('2785', '6ca6282e-e454-4064-a555-63e9a275c72c', '607', 'Juvel', null, null, null),
  ('2798', '70af13ef-e348-431d-8c95-a34b09c8a610', '763', 'Hector', null, null, null),
  ('2269', '8c5a6473-43e4-4710-9194-f9e4acc39748', '218', 'Maria', null, null, null),
  ('2488', '900f1ed7-13cd-4f7d-a6c9-182b4fde03ec', '474', 'David', null, null, null),
  ('2836', '926b178b-641d-4e5b-964c-b4fff2df6bf4', '607', 'Luis', null, null, null),
  ('2782', '93c15372-2d01-4326-8c1b-28ab5779c678', '470', 'David', null, null, null),
  ('2147', '96b77c34-abdc-48df-b759-b264f17478da', '607', 'Oscar', null, null, null),
  ('2355', 'a366aacf-fe85-4fbc-ae14-360336a26817', '763', 'Raul', null, null, null),
  ('2356', 'a366aacf-fe85-4fbc-ae14-360336a26817', '506', 'Felipe', null, null, null),
  ('2405', 'a43e9c2a-e460-4dd1-8d32-0c8cbfd3e1dd', '746', 'Sanchez', null, null, null),
  ('2469', 'af8e334d-3a6b-4f46-9258-8ba3502ebae6', 'WAITING_LIST', null, null, null, null),
  ('2271', 'b261dd32-280d-47dc-94e9-f21d68ab427a', '897', 'Raul', null, null, null),
  ('2272', 'b261dd32-280d-47dc-94e9-f21d68ab427a', '133', 'Cortinas', null, null, null),
  ('2315', 'c507fe2b-59d7-42c9-a85c-3ea1e30ad6fc', '218', 'Maria', null, null, null),
  ('2362', 'caf0834a-c920-4ce1-91a1-c927431fc577', '898', 'Luis', null, null, null),
  ('2322', 'cd565ead-6c3b-4aab-93ae-185f210a981f', '746', 'Jorge', null, null, null),
  ('1986', 'cfb228d3-94b6-438c-b579-de7ab7162016', '474', 'Ivan', 'Padron', null, null),
  ('2421', 'e1566955-7271-4b33-8aa0-7b9c7ee37d26', '470', 'Juan', 'Hector', null, null),
  ('2361', 'e271fb9d-fe6d-4e0c-8f26-830694df8432', '746', 'Felipe', null, null, null),
  ('2325', 'e2948b71-32b9-40a5-8363-c357973fea42', '607', 'Juvel', null, null, null),
  ('2668', 'e6ba0f45-38f1-45e4-90fb-7d39dcb3b3b3', '506', 'George', null, 'Maria', null),
  ('2784', 'ede3acf9-e454-429d-8107-fdfa5ecbec62', '746', 'Luis', null, null, null),
  ('2549', 'f5dc9cbb-9577-4414-b953-5181f553809d', '897', 'Maria', null, null, null),
  ('2783', 'fe7ea863-0a37-45ef-be0a-e582d96cbcc2', '133', 'Luis', null, null, null),
  ('2406', 'tk_1776808793188_105183261', '506', 'Felipe', null, null, null),
  ('2598', 'tk_1776808840871_183945782', '474', 'Felipe', null, null, null),
  ('2842', 'tk_1777404138783_653347047', '506', 'Maria', null, null, null),
  ('2780', 'tk_1777407637014_458886714', '218', 'Juvel', null, null, null),
  ('2506', 'tk_1779811640045_749625118', '506', 'Lozano', null, null, null);

-- Every trip must have at least one exported assignment.
do $$
declare problems text;
begin
  select string_agg(t.legacy_trip_key::text, ', ')
  into problems
  from mar26_trips_source t
  left join mar26_assignments_source a on a.legacy_trip_key = t.legacy_trip_key
  where a.legacy_assignment_id is null;

  if problems is not null then
    raise exception 'Import stopped. Trips without assignments: %', problems;
  end if;
end $$;

-- Every numbered bus must resolve exactly once. WAITING_LIST becomes bus_id null.
do $$
declare problems text;
begin
  select string_agg(bus_number || ' (' || matches || ' matches)', ', ' order by bus_number)
  into problems
  from (
    select required.bus_number, count(b.id) as matches
    from (
      select distinct bus_number
      from mar26_assignments_source
      where bus_number is not null and bus_number <> 'WAITING_LIST'
    ) required
    left join public.buses b on trim(b.number) = trim(required.bus_number)
    group by required.bus_number
    having count(b.id) <> 1
  ) invalid;

  if problems is not null then
    raise exception 'Import stopped. Bus matching problem: %', problems;
  end if;
end $$;

-- Create inactive placeholders only for legacy names absent from the target roster.
with required_names as (
  select distinct driver_name
  from (
    select primary_driver as driver_name from mar26_assignments_source
    union all select co_driver from mar26_assignments_source
    union all select relief_start from mar26_assignments_source
    union all select relief_end from mar26_assignments_source
  ) names
  where driver_name is not null
), missing_names as (
  select r.driver_name
  from required_names r
  where not exists (
    select 1 from public.drivers d
    where regexp_replace(lower(trim(d.short_name)), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(trim(r.driver_name)), '[^a-z0-9]+', '', 'g')
       or regexp_replace(lower(trim(d.name)), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(trim(r.driver_name)), '[^a-z0-9]+', '', 'g')
  )
)
insert into public.drivers (name, short_name, status, employment_type, notes)
select
  driver_name || ' (Historical)',
  driver_name,
  'inactive',
  'full-time',
  'Inactive historical placeholder created for the corrected June 1-29, 2026 legacy import.'
from missing_names;

-- After placeholder creation, every name must resolve exactly once.
do $$
declare problems text;
begin
  select string_agg(driver_name || ' (' || matches || ' matches)', ', ' order by driver_name)
  into problems
  from (
    select required.driver_name, count(d.id) as matches
    from (
      select distinct driver_name
      from (
        select primary_driver as driver_name from mar26_assignments_source
        union all select co_driver from mar26_assignments_source
        union all select relief_start from mar26_assignments_source
        union all select relief_end from mar26_assignments_source
      ) names
      where driver_name is not null
    ) required
    left join public.drivers d
      on regexp_replace(lower(trim(d.short_name)), '[^a-z0-9]+', '', 'g') =
         regexp_replace(lower(trim(required.driver_name)), '[^a-z0-9]+', '', 'g')
      or (
        not exists (
          select 1
          from public.drivers preferred
          where regexp_replace(lower(trim(preferred.short_name)), '[^a-z0-9]+', '', 'g') =
                regexp_replace(lower(trim(required.driver_name)), '[^a-z0-9]+', '', 'g')
        )
        and regexp_replace(lower(trim(d.name)), '[^a-z0-9]+', '', 'g') =
            regexp_replace(lower(trim(required.driver_name)), '[^a-z0-9]+', '', 'g')
      )
    group by required.driver_name
    having count(d.id) <> 1
  ) invalid;

  if problems is not null then
    raise exception 'Import stopped. Driver matching problem: %', problems;
  end if;
end $$;

create temporary table mar26_prepared on commit drop as
select
  t.*,
  'LEGACY-JUN26-' || upper(substr(md5(t.legacy_trip_key), 1, 12)) as target_trip_ref,
  count(a.legacy_assignment_id)::integer as bus_count
from mar26_trips_source t
join mar26_assignments_source a on a.legacy_trip_key = t.legacy_trip_key
group by t.legacy_trip_key, t.original_trip_ref, t.start_date, t.end_date, t.destination, t.customer;

-- Reject unrelated collisions while allowing safe reruns of this exact batch.
do $$
declare collisions text;
begin
  select string_agg(t.trip_ref, ', ' order by t.trip_ref)
  into collisions
  from public.trips t
  join mar26_prepared p on p.target_trip_ref = t.trip_ref
  where coalesce(t.notes, '') not like '[Legacy corrected JUN26-01-29:%';

  if collisions is not null then
    raise exception 'Import stopped. Existing target trip references: %', collisions;
  end if;
end $$;

insert into public.trips (
  trip_ref, destination, customer, start_date, end_date,
  bus_count, confirmed, trip_type, notes
)
select
  p.target_trip_ref,
  p.destination,
  p.customer,
  p.start_date,
  p.end_date,
  p.bus_count,
  true,
  'round_trip',
  '[Legacy corrected JUN26-01-29: tripKey=' || p.legacy_trip_key::text ||
    '; original_trip_ref=' || coalesce(p.original_trip_ref, '') || ']'
from mar26_prepared p
where not exists (
  select 1 from public.trips t where t.trip_ref = p.target_trip_ref
);

create temporary table mar26_assignment_prepared on commit drop as
select
  a.*,
  p.target_trip_ref,
  row_number() over (
    partition by a.legacy_trip_key
    order by
      case when a.bus_number = 'WAITING_LIST' then 1 else 0 end,
      a.bus_number,
      a.legacy_assignment_id
  )::integer - 1 as assignment_position
from mar26_assignments_source a
join mar26_prepared p on p.legacy_trip_key = a.legacy_trip_key;

insert into public.trip_assignments (trip_id, bus_id, position, active_roles, leg)
select
  t.id,
  b.id,
  a.assignment_position,
  array_remove(array[
    case when a.primary_driver is not null then 'driver' end,
    case when a.co_driver is not null then 'co-driver' end,
    case when a.relief_start is not null then 'relief-start' end,
    case when a.relief_end is not null then 'relief-end' end
  ]::text[], null),
  'outbound'
from mar26_assignment_prepared a
join public.trips t on t.trip_ref = a.target_trip_ref
left join public.buses b
  on a.bus_number <> 'WAITING_LIST'
 and trim(b.number) = trim(a.bus_number)
where not exists (
  select 1 from public.trip_assignments ta
  where ta.trip_id = t.id
    and ta.bus_id is not distinct from b.id
    and ta.leg = 'outbound'
    and ta.position = a.assignment_position
);

with requested_drivers as (
  select target_trip_ref, bus_number, assignment_position, 'driver'::text role, primary_driver driver_name
  from mar26_assignment_prepared
  union all
  select target_trip_ref, bus_number, assignment_position, 'co-driver', co_driver
  from mar26_assignment_prepared
  union all
  select target_trip_ref, bus_number, assignment_position, 'relief-start', relief_start
  from mar26_assignment_prepared
  union all
  select target_trip_ref, bus_number, assignment_position, 'relief-end', relief_end
  from mar26_assignment_prepared
)
insert into public.trip_drivers (assignment_id, driver_id, role)
select ta.id, d.id, r.role
from requested_drivers r
join public.trips t on t.trip_ref = r.target_trip_ref
left join public.buses b
  on r.bus_number <> 'WAITING_LIST'
 and trim(b.number) = trim(r.bus_number)
join public.trip_assignments ta
  on ta.trip_id = t.id
 and ta.bus_id is not distinct from b.id
 and ta.leg = 'outbound'
 and ta.position = r.assignment_position
join public.drivers d
  on regexp_replace(lower(trim(d.short_name)), '[^a-z0-9]+', '', 'g') =
     regexp_replace(lower(trim(r.driver_name)), '[^a-z0-9]+', '', 'g')
  or (
    not exists (
      select 1
      from public.drivers preferred
      where regexp_replace(lower(trim(preferred.short_name)), '[^a-z0-9]+', '', 'g') =
            regexp_replace(lower(trim(r.driver_name)), '[^a-z0-9]+', '', 'g')
    )
    and regexp_replace(lower(trim(d.name)), '[^a-z0-9]+', '', 'g') =
        regexp_replace(lower(trim(r.driver_name)), '[^a-z0-9]+', '', 'g')
  )
where r.driver_name is not null
  and not exists (
    select 1 from public.trip_drivers td
    where td.assignment_id = ta.id
      and td.driver_id = d.id
      and td.role = r.role
  );

commit;

-- Verification: expected 42 trips, 48 assignments, 58 driver-role rows, 1 waiting-list row.
select
  count(distinct t.id) as trips,
  count(distinct ta.id) as assignments,
  count(distinct td.id) as driver_assignments,
  count(distinct ta.id) filter (where ta.bus_id is null) as waiting_list_assignments
from public.trips t
left join public.trip_assignments ta on ta.trip_id = t.id
left join public.trip_drivers td on td.assignment_id = ta.id
where t.notes like '[Legacy corrected JUN26-01-29:%';
