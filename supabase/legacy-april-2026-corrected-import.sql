begin;

-- Corrected April 2026 legacy import.
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
  ('f40f10b4-90a9-4589-9e1c-9cb7a932e3e4', 'TRIP-20260331-0002', '2026-04-01', '2026-04-01', 'Local', 'Vaguard Beethoven'),
  ('1c4cc73d-bc67-417e-85b6-772465b46122', 'TRIP-20260401-0001', '2026-04-01', '2026-04-05', 'Dallas, TX', 'Hombres G'),
  ('38652c8e-50fe-4de9-9dae-5eb127614a1d', 'TRIP-20260401-0002', '2026-04-01', '2026-04-03', 'Mesa, AZ', 'MVM / The Charter Bus'),
  ('2ed8d1a3-feb5-4363-8055-cbf79d787273', 'TRIP-20260402-0001', '2026-04-02', '2026-04-02', 'Corpus Christi, TX', 'Marine Military Academuy'),
  ('6a810757-0771-4863-b409-73e3832793d0', 'TRIP-20260402-0001', '2026-04-02', '2026-04-02', 'San Antonio, TX', 'Todd Middle School'),
  ('19795cc0-eb0e-4104-a78c-26a65c7f9e4d', 'TRIP-20260402-0002', '2026-04-02', '2026-04-02', 'Corpus Christi, TX', 'IDEA Donna'),
  ('3b0d737a-8f84-4d5b-a90f-2c12af71985d', 'TRIP-20260402-0003', '2026-04-02', '2026-04-02', 'Brownsville, TX', 'St. Theresa Catholic C.'),
  ('795e7adc-e8a9-464d-9dee-42463e020eb8', 'TRIP-20260406-0001', '2026-04-06', '2026-04-13', 'Daytona, FL', 'TAMIU'),
  ('fcfc417b-8970-4179-af00-48d4bfe8e0f3', 'TRIP-20260407-0002', '2026-04-07', '2026-04-08', 'Jourdanton, TX', 'IDEA Palmview'),
  ('67abdcf2-9859-42bf-b95f-cc528c9894b0', 'TRIP-20260410-0001', '2026-04-10', '2026-04-10', 'San Antonio, TX', 'UTRGV'),
  ('683fb45e-3ca9-4b35-83cd-f6c57bdecf77', 'TRIP-20260410-0002', '2026-04-10', '2026-04-10', 'San Antonio, TX', 'The Charter Bus'),
  ('2300532f-3801-4f8d-9f93-82fee0d3fce2', 'TRIP-20260410-0003', '2026-04-10', '2026-04-10', 'San Antonio, TX', 'Donna North HS'),
  ('e25a3eff-a1c6-4bfa-b111-41a8ac9d5679', 'TRIP-20260410-0003', '2026-04-10', '2026-04-12', 'Austin, TX', 'Brownsville ISD'),
  ('c21b1772-2991-476c-a3c1-790bd843d655', 'TRIP-20260410-0004', '2026-04-10', '2026-04-12', 'San Antonio, TX', 'K White Jr High'),
  ('3605a888-83b0-43cc-8e48-ff81958fd04c', 'TRIP-20260411-0001', '2026-04-11', '2026-04-11', 'Local', 'UTRGV'),
  ('8f28a710-3656-49b8-8fb6-d320b08e82b8', 'TRIP-20260411-0001', '2026-04-11', '2026-04-19', 'Cincinnati, OH', 'Synergy Indoor'),
  ('69444428-726e-4a6d-9543-892ce3c39e09', 'TRIP-20260411-0002', '2026-04-11', '2026-04-20', 'Dayton, OH', 'Vaquero Indoor Inc.'),
  ('5b68743a-db8f-4e6c-bf63-cbca6dedd80e', 'TRIP-20260411-0003', '2026-04-11', '2026-04-11', 'Brownsville, TX', 'The Charter Bus'),
  ('66defa28-5f1f-414f-952e-35280e1d4889', 'TRIP-20260412-0001', '2026-04-12', '2026-04-12', 'Mission, TX (D/O)', 'San Cristobal'),
  ('78b3abe1-d407-4ade-9122-138bdc278db8', 'TRIP-20260412-0001', '2026-04-12', '2026-04-12', 'San Antonio, TX', 'Border Patrol'),
  ('cc19b489-3317-4f53-b865-211cb5d69b8e', 'TRIP-20260413-0001', '2026-04-13', '2026-04-15', 'Paragon Casino', '-'),
  ('a00dfafa-496c-48a3-bbb3-68e577b99f85', 'TRIP-20260415-0001', '2026-04-15', '2026-04-15', 'Local', 'Bus Bank'),
  ('e7b273f4-c861-4e49-a168-4359fdeb9918', 'TRIP-20260415-0002', '2026-04-15', '2026-04-16', 'Victoria, TX (bus 1)', '7-Eleven'),
  ('a67d838e-7f8c-4d06-815b-8719d2217f56', 'TRIP-20260416-0003', '2026-04-16', '2026-04-17', 'Austin, TX', 'UTRGV'),
  ('6dda4390-5e83-494a-8876-3ba73ca4f562', 'TRIP-20260416-0004', '2026-04-16', '2026-04-16', 'Corpus Christi, TX (bus 2)', '7-Eleven'),
  ('26242057-8aeb-4ddb-8335-8a400344aaef', 'TRIP-20260416-0006', '2026-04-16', '2026-04-16', 'Local', 'Bus Bank'),
  ('6f4703f9-f849-4ece-af40-f9ef9cf007c8', 'TRIP-20260410-0005', '2026-04-17', '2026-04-18', 'San Antonio, TX', 'IDEA Robindale'),
  ('2767a777-edac-4478-8e51-04527db83cf9', 'TRIP-20260417-0001', '2026-04-17', '2026-04-17', 'Local', 'Excellence in Leadership'),
  ('a6b52054-add8-41fd-8160-5b63a2632097', 'TRIP-20260417-0002', '2026-04-17', '2026-04-17', 'Local (D/O)', 'St Benedicts Church'),
  ('1e6455b7-6a46-4af1-8077-4e9cdd30ac82', 'TRIP-20260417-0005', '2026-04-17', '2026-04-17', 'Local', 'Bus Bank'),
  ('0862d4ca-8357-4712-a4f8-8ea57034c817', 'TRIP-20260418-0001', '2026-04-18', '2026-04-18', 'Local', 'Bus Bank'),
  ('3a7f39dc-90cd-46cd-894c-9c30ec2f108f', 'TRIP-20260418-0002', '2026-04-18', '2026-04-18', 'San Antonio, TX', 'UTSA'),
  ('20eb7366-fd30-4d0e-9b7d-5311dd0e3349', 'TRIP-20260418-0003', '2026-04-18', '2026-04-19', 'San Antonio, TX', 'Edinburg Memorial MS'),
  ('71540e51-5018-4e3d-9292-8ff9abab8f95', 'TRIP-20260419-0001', '2026-04-19', '2026-04-21', 'Paragon Casino', 'Pearl Elite'),
  ('61c4fdc9-03a9-4e8a-8d31-a7f4cc7e46fa', 'TRIP-20260419-0002', '2026-04-19', '2026-04-19', 'Local (P/U)', 'St Benedicts Church'),
  ('7d57db2d-c422-4c32-a9ee-034ce8f75b1f', 'TRIP-20260419-0003', '2026-04-19', '2026-04-25', 'St. Louis, MO', 'PSJA T-Stem'),
  ('96317c93-1f84-4a2d-95e3-a5e2fa7a8ad3', 'TRIP-20260419-0005', '2026-04-19', '2026-04-19', 'Local', 'Bus Bank'),
  ('d24d5f22-5b87-4065-b675-b1e9c31105f3', 'TRIP-20260420-0003', '2026-04-20', '2026-04-20', 'Edinburg, TX', 'TEKS Institute'),
  ('8fae5186-13bb-4e0e-b742-d48616ad8eb9', 'TRIP-20260420-0005', '2026-04-20', '2026-04-20', 'Local', 'Bus Bank'),
  ('68ae2256-1d93-4f77-8088-973c1b0aa7fb', 'TRIP-20260420-0006', '2026-04-20', '2026-04-21', 'Austin, TX', 'Imperial Bus Company'),
  ('460ad43d-d3bc-4c41-9935-13cdd039309e', 'TRIP-20260330-0002', '2026-04-22', '2026-04-22', 'San Marcos, TX', 'Donna High School'),
  ('20bc0096-5004-4f60-a252-bb49f412ea41', 'TRIP-20260423-0001', '2026-04-23', '2026-04-24', 'San Antonio, TX', 'IDEA Tres Lagos'),
  ('960f7cc1-a08e-4e4f-923a-940da7338fa5', 'TRIP-20260423-0004', '2026-04-23', '2026-04-23', 'San Marcos, TX', 'Sharyland A3'),
  ('tk_1776443718218_221122232', 'TRIP-20260423-0005', '2026-04-23', '2026-04-23', 'Corpus Christi, TX', 'Mission High School'),
  ('0dcc58aa-28a7-48aa-a1d3-39f4ed5fbc29', 'TRIP-20260424-0001', '2026-04-24', '2026-04-24', 'Corpus Christi, TX', 'PSJA Bldg Blocks Ac.'),
  ('de2d17ba-f0a6-41e1-965b-b2c6f00435c5', 'TRIP-20260424-0001', '2026-04-24', '2026-04-24', 'Corpus Christi, TX', 'Pathways  Toward Independence'),
  ('f31e84fd-a69e-43de-8277-f19a86abdf87', 'TRIP-20260424-0002', '2026-04-24', '2026-04-24', 'Brownsville, TX', 'America & Beyond'),
  ('db26e871-bb01-4d72-b014-90cdc53f7960', 'TRIP-20260424-0004', '2026-04-24', '2026-04-24', 'Edinburg TX  (D/O)', 'Sacred Heart Catholic Church'),
  ('4eb8ad94-17cc-48b2-bc41-66d14f459a2a', 'TRIP-20260424-0006', '2026-04-24', '2026-04-24', 'South Padre Island TX', 'MMA'),
  ('f6f485ea-1834-4034-ab7d-4d13546363a7', 'TRIP-20260424-0008', '2026-04-24', '2026-04-24', 'Corpus Christi, TX', 'Valley View HS'),
  ('7989f8ad-5b1f-4636-8300-dbce052b5b10', 'TRIP-20260424-0009', '2026-04-24', '2026-04-24', 'Brownsville TX', 'UTRGV'),
  ('6dd11639-1c8a-4489-bc6c-fa331b11ca47', 'TRIP-20260425-0001', '2026-04-25', '2026-04-25', 'Edinburg TX (P/U)', 'Sacred Heart Catholic Church'),
  ('d16eed6a-9b80-4b31-83fb-479f195668e3', 'TRIP-20260425-0002', '2026-04-25', '2026-04-25', 'Edinburg, TX', 'UTRGV'),
  ('91329ec7-8156-4c82-aa5f-8f4b93950d12', 'TRIP-20260425-0003', '2026-04-25', '2026-04-25', 'San Antonio, TX', 'Morris MS (Choir)'),
  ('ae3e452f-3499-4665-a1a2-e8e58aeb375d', 'TRIP-20260425-0004', '2026-04-25', '2026-04-25', 'Brownsville, TX', 'America & Beyond'),
  ('bbfbff52-5b50-4a1e-98b9-5983b0f48a43', 'TRIP-20260425-0004', '2026-04-25', '2026-04-25', 'San Antonio, TX', 'Morris MS (Band)'),
  ('5866db16-f8df-43de-a281-f975af571f31', 'TRIP-20260425-0005', '2026-04-25', '2026-04-25', 'San Antonio, TX', 'Morris MS (Orch)'),
  ('cbff43a6-aff3-4d28-a6cf-32537f822e0b', 'TRIP-20260426-0001', '2026-04-26', '2026-04-26', 'Brownsville, TX', 'America & Beyond'),
  ('3803f5b2-4669-4d02-8d9f-96e4a3fe9530', 'TRIP-20260428-0001', '2026-04-28', '2026-04-28', 'Edinburg, TX', 'AP Solis Middle School'),
  ('42d0ddda-7108-4c4c-b1e4-79ae52a8f9b3', 'TRIP-20260428-0001', '2026-04-28', '2026-04-28', 'Brownsville, TX', 'Covenant Christian A.'),
  ('e0e823eb-3c09-4481-96de-40790c12ce3e', 'TRIP-20260428-0002', '2026-04-28', '2026-04-28', 'Corpus Christi, TX', 'IDEA North Mission'),
  ('d0a8fbf0-163a-43f0-86d0-cc590f418537', 'TRIP-20260429-0001', '2026-04-29', '2026-05-03', 'Round Rock, TX', 'PSJA ECHS'),
  ('8b0d3f68-9a59-457d-9d6a-3e3f7df5e149', 'TRIP-20260429-0002', '2026-04-29', '2026-04-29', 'Corpus Christi, TX', 'IDEA San Benito'),
  ('tk_1776722870784_815089443', 'TRIP-20260429-0002', '2026-04-29', '2026-04-29', 'Corpus Christi, TX', 'Mission High School'),
  ('9a0b4da3-5522-43b3-8520-1a363a8ac073', 'TRIP-20260429-0003', '2026-04-29', '2026-04-29', 'Corpus Christi, TX', 'Out of Service'),
  ('52aa60c9-2fb4-49bd-873f-35e516821298', 'TRIP-20260430-0001', '2026-04-30', '2026-05-03', 'Melissa, TX', 'Brownsville ISD'),
  ('c1ba8b03-f3f3-402a-85af-f551a77b1c95', 'TRIP-20260430-0001', '2026-04-30', '2026-04-30', 'Somerset, TX', 'Roma High School'),
  ('a652d1e4-7c96-4846-941a-891196476acb', 'TRIP-20260430-0002', '2026-04-30', '2026-04-30', 'Huntsville, TX', 'Vanguard Rembrandt'),
  ('e88b91df-b50f-4cf9-a0bf-8790cd225adf', 'TRIP-20260430-0002', '2026-04-30', '2026-04-30', 'San Antonio, TX', 'IDEA North Mission'),
  ('71e6a63b-f8a8-41b0-a9fa-03e81416dc99', 'TRIP-20260430-0003', '2026-04-30', '2026-04-30', 'South Padre Island, TX', 'Covenant Christian Academy'),
  ('tk_1776870385445_610762717', 'TRIP-20260430-0003', '2026-04-30', '2026-05-03', 'Melissa, TX', 'Brownsville ISD'),
  ('9f138bd2-0532-434e-b7b2-c02d71296da1', 'TRIP-20260430-0004', '2026-04-30', '2026-04-30', 'SA, TX (Sea World)', 'Memorial ES');

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
  ('853', '0862d4ca-8357-4712-a4f8-8ea57034c817', '470', 'David', null, null, null),
  ('873', '0dcc58aa-28a7-48aa-a1d3-39f4ed5fbc29', '763', 'Maria', null, null, null),
  ('785', '19795cc0-eb0e-4104-a78c-26a65c7f9e4d', '746', 'Jorge', null, null, null),
  ('786', '19795cc0-eb0e-4104-a78c-26a65c7f9e4d', '607', 'Maria', null, null, null),
  ('787', '19795cc0-eb0e-4104-a78c-26a65c7f9e4d', '897', 'Raul', null, null, null),
  ('765', '1c4cc73d-bc67-417e-85b6-772465b46122', 'WAITING_LIST', null, null, null, null),
  ('848', '1e6455b7-6a46-4af1-8077-4e9cdd30ac82', '470', 'Maria', null, null, null),
  ('878', '20bc0096-5004-4f60-a252-bb49f412ea41', '218', 'George', null, null, null),
  ('863', '20eb7366-fd30-4d0e-9b7d-5311dd0e3349', '897', 'Jose', null, null, null),
  ('826', '2300532f-3801-4f8d-9f93-82fee0d3fce2', '898', 'George', null, null, null),
  ('856', '26242057-8aeb-4ddb-8335-8a400344aaef', '470', 'Maria', null, null, null),
  ('857', '2767a777-edac-4478-8e51-04527db83cf9', '897', 'Jose', null, null, null),
  ('821', '2ed8d1a3-feb5-4363-8055-cbf79d787273', '133', 'Arredondo', null, null, null),
  ('829', '3605a888-83b0-43cc-8e48-ff81958fd04c', '897', 'Felipe', null, null, null),
  ('910', '3803f5b2-4669-4d02-8d9f-96e4a3fe9530', '898', 'Juvel', null, null, null),
  ('789', '38652c8e-50fe-4de9-9dae-5eb127614a1d', '218', 'George', 'Rigo', null, null),
  ('859', '3a7f39dc-90cd-46cd-894c-9c30ec2f108f', '746', 'Benny', null, null, null),
  ('788', '3b0d737a-8f84-4d5b-a90f-2c12af71985d', '898', 'Luis', null, null, null),
  ('893', '42d0ddda-7108-4c4c-b1e4-79ae52a8f9b3', '133', 'Maria', null, null, null),
  ('877', '460ad43d-d3bc-4c41-9935-13cdd039309e', '763', 'Sanchez', null, 'Jose', null),
  ('870', '4eb8ad94-17cc-48b2-bc41-66d14f459a2a', '897', 'Jose', null, null, null),
  ('897', '52aa60c9-2fb4-49bd-873f-35e516821298', '218', 'Rigo', 'George', null, null),
  ('885', '5866db16-f8df-43de-a281-f975af571f31', '133', 'Lozano', null, null, null),
  ('886', '5866db16-f8df-43de-a281-f975af571f31', '607', 'Julie', null, null, null),
  ('827', '5b68743a-db8f-4e6c-bf63-cbca6dedd80e', '474', 'Jay', null, null, null),
  ('828', '5b68743a-db8f-4e6c-bf63-cbca6dedd80e', '898', 'Vasquez', null, null, null),
  ('860', '61c4fdc9-03a9-4e8a-8d31-a7f4cc7e46fa', '474', 'Lozano', null, null, null),
  ('820', '66defa28-5f1f-414f-952e-35280e1d4889', '898', 'Felipe', null, null, null),
  ('804', '67abdcf2-9859-42bf-b95f-cc528c9894b0', '897', 'Felipe', null, null, null),
  ('830', '683fb45e-3ca9-4b35-83cd-f6c57bdecf77', '474', 'Cortinas', null, 'Hector', null),
  ('867', '68ae2256-1d93-4f77-8088-973c1b0aa7fb', '897', 'Jose', null, 'Jorge', null),
  ('807', '69444428-726e-4a6d-9543-892ce3c39e09', '763', 'Sanchez', 'Cortinas', null, null),
  ('808', '69444428-726e-4a6d-9543-892ce3c39e09', '133', 'Jonathan', 'Raul', null, null),
  ('780', '6a810757-0771-4863-b409-73e3832793d0', '470', 'Jose', null, null, null),
  ('781', '6a810757-0771-4863-b409-73e3832793d0', '763', 'Jonathan', null, null, null),
  ('895', '6dd11639-1c8a-4489-bc6c-fa331b11ca47', '897', 'Raul', null, null, null),
  ('833', '6dda4390-5e83-494a-8876-3ba73ca4f562', '607', 'Felipe', null, null, null),
  ('861', '6f4703f9-f849-4ece-af40-f9ef9cf007c8', '607', 'Ivan', 'Sergio', null, null),
  ('862', '6f4703f9-f849-4ece-af40-f9ef9cf007c8', '898', 'Felipe', 'Arredondo', null, null),
  ('866', '71540e51-5018-4e3d-9292-8ff9abab8f95', '506', 'Maria', null, 'Hector', null),
  ('905', '71e6a63b-f8a8-41b0-a9fa-03e81416dc99', '506', 'Raul', null, null, null),
  ('819', '78b3abe1-d407-4ade-9122-138bdc278db8', '897', 'Griselda', null, null, null),
  ('824', '795e7adc-e8a9-464d-9dee-42463e020eb8', '746', 'Ernesto', 'Jorge', null, null),
  ('874', '7989f8ad-5b1f-4636-8300-dbce052b5b10', 'WAITING_LIST', 'Benny', null, null, null),
  ('876', '7d57db2d-c422-4c32-a9ee-034ce8f75b1f', '746', 'Arredondo', 'Oscar', null, null),
  ('911', '8b0d3f68-9a59-457d-9d6a-3e3f7df5e149', '898', 'Raul', null, null, null),
  ('912', '8b0d3f68-9a59-457d-9d6a-3e3f7df5e149', '607', 'Maria', null, null, null),
  ('913', '8b0d3f68-9a59-457d-9d6a-3e3f7df5e149', '474', 'Jonathan', null, null, null),
  ('806', '8f28a710-3656-49b8-8fb6-d320b08e82b8', '218', 'George', 'Rigo', null, null),
  ('875', '8fae5186-13bb-4e0e-b742-d48616ad8eb9', '470', 'David', null, null, null),
  ('868', '91329ec7-8156-4c82-aa5f-8f4b93950d12', '763', 'Felipe', null, null, null),
  ('879', '960f7cc1-a08e-4e4f-923a-940da7338fa5', '133', 'Jonathan', 'Juvel', null, null),
  ('847', '96317c93-1f84-4a2d-95e3-a5e2fa7a8ad3', '470', 'David', null, null, null),
  ('908', '9a0b4da3-5522-43b3-8520-1a363a8ac073', '746', 'Oscar', null, null, null),
  ('898', '9f138bd2-0532-434e-b7b2-c02d71296da1', '133', 'Cortinas', null, null, null),
  ('899', '9f138bd2-0532-434e-b7b2-c02d71296da1', '746', 'Luis', null, null, null),
  ('900', '9f138bd2-0532-434e-b7b2-c02d71296da1', '897', 'Juvel', null, null, null),
  ('854', 'a00dfafa-496c-48a3-bbb3-68e577b99f85', '470', 'Maria', null, null, null),
  ('901', 'a652d1e4-7c96-4846-941a-891196476acb', '898', 'Jorge', 'Oscar', null, null),
  ('858', 'a67d838e-7f8c-4d06-815b-8719d2217f56', '474', 'Luis', null, null, null),
  ('846', 'a6b52054-add8-41fd-8160-5b63a2632097', '506', 'Lozano', null, null, null),
  ('849', 'ae3e452f-3499-4665-a1a2-e8e58aeb375d', '474', 'Rigo', null, null, null),
  ('887', 'bbfbff52-5b50-4a1e-98b9-5983b0f48a43', '470', 'Jorge', null, null, null),
  ('888', 'bbfbff52-5b50-4a1e-98b9-5983b0f48a43', '506', 'Juvel', null, null, null),
  ('903', 'c1ba8b03-f3f3-402a-85af-f551a77b1c95', '474', 'Hector', null, null, null),
  ('825', 'c21b1772-2991-476c-a3c1-790bd843d655', '470', 'Maria', null, null, null),
  ('871', 'cbff43a6-aff3-4d28-a6cf-32537f822e0b', '474', 'Rigo', null, null, null),
  ('855', 'cc19b489-3317-4f53-b865-211cb5d69b8e', '506', 'Arredondo', null, 'Felipe', 'Jorge'),
  ('896', 'd0a8fbf0-163a-43f0-86d0-cc590f418537', '470', 'Sanchez', null, null, null),
  ('894', 'd16eed6a-9b80-4b31-83fb-479f195668e3', '218', 'Sanchez', null, null, null),
  ('864', 'd24d5f22-5b87-4065-b675-b1e9c31105f3', '607', 'Felipe', null, null, null),
  ('865', 'd24d5f22-5b87-4065-b675-b1e9c31105f3', '898', 'Luis', null, null, null),
  ('884', 'db26e871-bb01-4d72-b014-90cdc53f7960', '506', 'Raul', null, null, null),
  ('881', 'de2d17ba-f0a6-41e1-965b-b2c6f00435c5', '607', 'Luis', null, null, null),
  ('882', 'de2d17ba-f0a6-41e1-965b-b2c6f00435c5', '470', 'David', null, null, null),
  ('889', 'e0e823eb-3c09-4481-96de-40790c12ce3e', '218', 'Jorge', null, null, null),
  ('890', 'e0e823eb-3c09-4481-96de-40790c12ce3e', '763', 'Oscar', null, null, null),
  ('831', 'e25a3eff-a1c6-4bfa-b111-41a8ac9d5679', '607', 'Andy', null, 'Lozano', null),
  ('832', 'e25a3eff-a1c6-4bfa-b111-41a8ac9d5679', '506', 'Arredondo', null, null, null),
  ('834', 'e7b273f4-c861-4e49-a168-4359fdeb9918', '898', 'Sergio', null, null, null),
  ('914', 'e88b91df-b50f-4cf9-a0bf-8790cd225adf', '607', 'David', null, null, null),
  ('872', 'f31e84fd-a69e-43de-8277-f19a86abdf87', '474', 'Rigo', null, null, null),
  ('783', 'f40f10b4-90a9-4589-9e1c-9cb7a932e3e4', '506', 'Vasquez', null, null, null),
  ('883', 'f6f485ea-1834-4034-ab7d-4d13546363a7', '898', 'Sanchez', null, null, null),
  ('803', 'fcfc417b-8970-4179-af00-48d4bfe8e0f3', '218', 'Jonathan', null, null, null),
  ('880', 'tk_1776443718218_221122232', '607', 'Jorge', null, null, null),
  ('909', 'tk_1776722870784_815089443', '506', 'Felipe', null, null, null),
  ('904', 'tk_1776870385445_610762717', '763', 'Jonathan', 'George', null, null);

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
    where lower(trim(d.short_name)) = lower(trim(r.driver_name))
       or lower(trim(d.name)) = lower(trim(r.driver_name))
  )
)
insert into public.drivers (name, short_name, status, employment_type, notes)
select
  driver_name || ' (Historical)',
  driver_name,
  'inactive',
  'full-time',
  'Inactive historical placeholder created for the corrected April 2026 legacy import.'
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
      on lower(trim(d.short_name)) = lower(trim(required.driver_name))
      or (
        not exists (
          select 1
          from public.drivers preferred
          where lower(trim(preferred.short_name)) = lower(trim(required.driver_name))
        )
        and lower(trim(d.name)) = lower(trim(required.driver_name))
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
  'LEGACY-APR26-' || upper(substr(replace(t.legacy_trip_key::text, '-', ''), 1, 8)) as target_trip_ref,
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
  where coalesce(t.notes, '') not like '[Legacy corrected APR26:%';

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
  '[Legacy corrected APR26: tripKey=' || p.legacy_trip_key::text ||
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
  on lower(trim(d.short_name)) = lower(trim(r.driver_name))
  or (
    not exists (
      select 1
      from public.drivers preferred
      where lower(trim(preferred.short_name)) = lower(trim(r.driver_name))
    )
    and lower(trim(d.name)) = lower(trim(r.driver_name))
  )
where r.driver_name is not null
  and not exists (
    select 1 from public.trip_drivers td
    where td.assignment_id = ta.id
      and td.driver_id = d.id
      and td.role = r.role
  );

commit;

-- Verification: expected 72 trips, 88 assignments, 106 driver-role rows, 2 waiting-list rows.
select
  count(distinct t.id) as trips,
  count(distinct ta.id) as assignments,
  count(distinct td.id) as driver_assignments,
  count(distinct ta.id) filter (where ta.bus_id is null) as waiting_list_assignments
from public.trips t
left join public.trip_assignments ta on ta.trip_id = t.id
left join public.trip_drivers td on td.assignment_id = ta.id
where t.notes like '[Legacy corrected APR26:%';
