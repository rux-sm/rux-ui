begin;

-- Corrected March 2026 legacy import.
-- Generated from the full legacy trips and bus_assignments exports.
-- Source joins use tripKey, never the reusable tripId.

create temporary table mar26_trips_source (
  legacy_trip_key uuid primary key,
  original_trip_ref text,
  start_date date not null,
  end_date date not null,
  destination text,
  customer text
) on commit drop;

insert into mar26_trips_source values
  ('d190fb2b-904f-4301-86b1-c95806da1caf', 'TRIP-20260301-0001', '2026-03-01', '2026-03-01', 'Rio Grande City (P/U)', 'Ressurrection Catholic C.'),
  ('f0ea14a4-962b-4e64-b92a-07e2bf4836f7', 'TRIP-20260301-0002', '2026-03-01', '2026-03-01', 'Local', 'California Baptist Church'),
  ('99de6c96-0189-49db-acec-bab60fab3714', 'TRIP-20260302-0002', '2026-03-02', '2026-03-05', 'Oklahoma City, OK', 'IDEA Owassa'),
  ('7905cb4d-0d83-44c0-adef-2c3e53eb9071', 'TRIP-20260303-0001', '2026-03-03', '2026-03-03', 'Sandia, TX (D/O)', 'Edinburg CISD R.O.T.C.'),
  ('c668e4f8-7be8-4dde-b4e6-f17cb3d3d938', 'TRIP-20260303-0002', '2026-03-03', '2026-03-03', 'Alice, TX', 'McAllen High School'),
  ('c01f7cb8-c1af-49fa-882b-aa616afe5595', 'TRIP-20260303-0003', '2026-03-03', '2026-03-03', 'Alice, TX', 'McAllen High School'),
  ('3cb62f5c-439f-4c44-bf75-867935bd93c3', 'TRIP-20260304-0001', '2026-03-04', '2026-03-09', 'Dallas, TX', 'McAllen Memorial HS'),
  ('e7d91f43-67dd-49cb-9c55-3efea2cf84a5', 'TRIP-20260304-0001', '2026-03-04', '2026-03-06', 'Arizona', 'MVM/The Charter Bus'),
  ('292adfc3-9049-47e4-b082-b08b4b245549', 'TRIP-20260305-0001', '2026-03-05', '2026-03-05', 'San Marcos, TX', 'Distance Bros.'),
  ('a4db85a5-3fe8-492f-b940-af1ec51577cb', 'TRIP-20260305-0001', '2026-03-05', '2026-03-06', 'San Antonio, TX', 'IDEA Alamo'),
  ('31124515-bc9d-4c7b-aece-320643cc5ab4', 'TRIP-20260305-0002', '2026-03-05', '2026-03-07', 'Victoria, TX', 'McAllen High School'),
  ('7c5725d7-f578-4944-a813-84a9945bfd77', 'TRIP-20260305-0003', '2026-03-05', '2026-03-08', 'Dallas, TX', 'Sharyland High School'),
  ('572af4ce-618e-4876-ae64-884256e3db4e', 'TRIP-20260305-0004', '2026-03-05', '2026-03-08', 'Dallas, TX', 'Sharyland Pioneer HS'),
  ('a2e6f456-25d2-477c-af5f-f4019756a36f', 'TRIP-20260303-0001', '2026-03-06', '2026-03-06', 'Sandia, TX (P/U)', 'Edinburg CISD R.O.T.C.'),
  ('8ccd6d9c-7725-4f75-8734-89d529202c62', 'TRIP-20260306-0001', '2026-03-06', '2026-03-08', 'Grapevine TX', 'Rayburn Elementry'),
  ('32b11bd8-324a-4f15-84a2-92bad70a33eb', 'TRIP-20260306-0002', '2026-03-06', '2026-03-08', 'San Marcos, TX', 'Edinburg High School'),
  ('21d6691c-38ba-4072-b327-4e714a85049a', 'TRIP-20260307-0001', '2026-03-07', '2026-03-07', 'Local', 'UTRGV'),
  ('67b0dba5-3b2b-4aea-8210-db8856208b20', 'TRIP-20260307-0001', '2026-03-07', '2026-03-07', 'Seguin, TX', 'Nikki Rowe HS'),
  ('52f62c14-b7b5-4bb3-b990-1d371b955883', 'TRIP-20260307-0002', '2026-03-07', '2026-03-08', 'Dilley, TX', 'MVM'),
  ('5f8d127f-9918-4261-9e80-19de41a182ff', 'TRIP-20260307-0002', '2026-03-07', '2026-03-07', 'Corpus Christi, TX', 'PSJA Austin MS'),
  ('34468e0d-67d6-4883-8bdd-e4be689453a6', 'TRIP-20260308-0001', '2026-03-08', '2026-03-13', 'Washington D.C.', 'IDEA Pharr'),
  ('539d550d-8539-417d-872e-b43246ad5690', 'TRIP-20260309-0001', '2026-03-09', '2026-03-09', 'San Antonio, TX', 'IDEA Weslaco'),
  ('961d8844-35c1-4ee2-bcd4-503dca182fdb', 'TRIP-20260309-0002', '2026-03-09', '2026-04-05', 'OUT OF SERVICE', '-'),
  ('8876f71f-6239-4fa3-a50e-9b58e5eace16', 'TRIP-20260310-0001', '2026-03-10', '2026-03-10', 'Local (BUS 2)', 'Los Fresnos CISD'),
  ('88ed5b04-9f1b-40ae-ac6d-abbc133bd4c4', 'TRIP-20260310-0001', '2026-03-10', '2026-03-12', 'Austin, TX', 'IDEA Mission'),
  ('5e180e18-fb3a-4b6a-b9c9-173c87e55b95', 'TRIP-20260310-0002', '2026-03-10', '2026-03-10', 'La Joya, TX', 'Morris Middle School'),
  ('5710560a-79c3-44ca-947a-50503b35a2d0', 'TRIP-20260310-0003', '2026-03-10', '2026-03-10', 'La Joya TX', 'Fossum Middle School'),
  ('badb7a5d-7e10-4bd4-9651-a212ae133664', 'TRIP-20260310-0004', '2026-03-10', '2026-03-10', 'Local (Bus 1)', 'Los Fresnos CISD'),
  ('623b9520-b602-455c-95a2-340e55874986', 'TRIP-20260319-0005', '2026-03-10', '2026-03-10', 'La Joya, TX', 'De Leon Middle School'),
  ('9a921fbd-cc5f-4bb5-9f1c-e69603feee5a', 'TRIP-20260111-0002', '2026-03-11', '2026-03-12', 'San Antonio, TX', 'IDEA San Juan'),
  ('2b711ae9-cfd8-4985-9320-8fb0d613c448', 'TRIP-20260311-0002', '2026-03-11', '2026-03-13', 'Fort Worth, TX', 'IDEA North Mission'),
  ('57c332ff-0907-48c4-92fd-52ac7a792604', 'TRIP-20260311-0002', '2026-03-11', '2026-03-11', 'Brownsville, TX', 'Our Lady of Sorrows'),
  ('2accd0cb-5289-4cd5-9d40-a8e34d22fdc2', 'TRIP-20260311-0003', '2026-03-11', '2026-03-11', 'Local', 'Los Fresnos CISD'),
  ('b7169073-c66a-4782-8a36-a46d6bfe640d', 'TRIP-20260311-0004', '2026-03-11', '2026-03-12', 'San Antonio, TX', 'Maldonatti Tours'),
  ('079195f2-16ce-4b38-8649-b2ef686b6d44', 'TRIP-20260311-0001', '2026-03-12', '2026-03-13', 'Dallas, TX', 'IDEA North Mission'),
  ('099274d1-fc0f-4763-8ac6-2d2da5bf7ed5', 'TRIP-20260312-0001', '2026-03-12', '2026-03-12', 'Hidalgo, TX', 'Vanguard Beethoven'),
  ('a202ad73-003b-47c2-85d9-f5fc88e5f8d6', 'TRIP-20260313-0001', '2026-03-13', '2026-03-13', 'San Antonio, TX', 'JP LeNoir Elementary'),
  ('b87a3556-b105-42c5-9f07-bcb6f984a4cb', 'TRIP-20260313-0003', '2026-03-13', '2026-03-15', 'OUT OF SERVICE', '-'),
  ('853d0fc8-8789-4077-a00f-eb0bde0320da', 'TRIP-20260315-0001', '2026-03-15', '2026-03-17', 'Paragon Casino', '-'),
  ('d6bd6b59-372e-4e50-a955-702baab6c768', 'TRIP-20260316-0001', '2026-03-16', '2026-03-18', 'Paragon Casino', 'Valley Casino Tours'),
  ('15080fec-d6d2-4c88-97b7-a5bdc3e7347f', 'TRIP-20260316-0002', '2026-03-16', '2026-03-16', 'Rio Grande CIty, TX (D/O)', 'St. Theresa Church'),
  ('0e5bdbd7-da55-4bf7-bd44-1a4523eafe56', 'TRIP-20260318-0001', '2026-03-18', '2026-03-18', 'Rio Grande City, TX', 'St. Theresa Church'),
  ('a837b474-eaf2-4bbc-bfed-0b3e3e1706dc', 'TRIP-20260319-0001', '2026-03-19', '2026-03-19', 'Edinburg, TX', 'St. Joan of Arc'),
  ('f8409fb6-7481-44d0-b927-4aa92bb5bf08', 'TRIP-20260319-0001', '2026-03-19', '2026-03-23', 'Waco, TX', 'McAllen High School'),
  ('0ab2c50c-8665-4c1f-a3f7-eafcfc0b284c', 'TRIP-20260319-0006', '2026-03-19', '2026-03-19', 'Mercedes, TX', 'City of McAllen, TX'),
  ('95f77679-30f6-489f-93a4-df2d0b0b44ed', 'TRIP-20260319-0007', '2026-03-19', '2026-03-19', 'Corpus Christi, TX', 'Mission High School'),
  ('2d5ce7fe-72b3-45ab-a55e-a3b94f995006', 'TRIP-20260320-0001', '2026-03-20', '2026-03-23', 'Waco, TX', 'Acheve ECHS'),
  ('f1ac7982-e2dd-40a0-96d1-10a3f36a8eea', 'TRIP-20260320-0001', '2026-03-20', '2026-03-20', 'Corpus Christi, TX', 'Maria Chacon'),
  ('f17a794d-55fb-42b0-8103-3e2f3b0b93ea', 'TRIP-20260320-0003', '2026-03-20', '2026-03-21', 'San Antonio, TX', 'Maldonatti Tours'),
  ('c53f19bc-07cc-439d-badc-f6e783a664a7', 'TRIP-20260320-0006', '2026-03-20', '2026-03-22', 'Burleson, TX', 'Edinburg High School'),
  ('19df1e5b-2a93-4fcb-9b18-7d22492bcd63', 'TRIP-20260324-0001', '2026-03-24', '2026-03-26', 'Corpus Christi, TX', 'Memorial High School'),
  ('0d67aeef-4c3c-4071-b8b4-8334f52bfbec', 'TRIP-20260324-0002', '2026-03-24', '2026-03-24', 'Corpus Christi, TX', 'San Benito HS'),
  ('9c9b7465-dc5d-4f8c-8580-eb9d58fcb48b', 'TRIP-20260324-0003', '2026-03-24', '2026-03-24', 'Beeville TX', 'IDEA Donna'),
  ('dddb9eb2-bd47-4b0f-a1b5-6cfa32eca8e5', 'TRIP-20260324-0004', '2026-03-24', '2026-03-24', 'Corpus Christi, TX', 'Freedom Charters & Tours'),
  ('15951a51-b135-4b63-a623-54bec4c35a12', 'TRIP-20260325-0002', '2026-03-25', '2026-03-25', 'San Antonio, TX', 'Donna North HS'),
  ('22876a22-e593-4c33-9865-980b4176012d', 'TRIP-20260325-0003', '2026-03-25', '2026-03-25', 'Local', 'La Feria CISD'),
  ('7942d3a4-86f0-45a5-865d-a7cafbda55b8', 'TRIP-20260326-0001', '2026-03-26', '2026-03-29', 'College Station, TX', 'Brownsville CISD'),
  ('c28a2f52-2dfb-4081-a94a-0c3e541a7b7d', 'TRIP-20260326-0003', '2026-03-26', '2026-03-28', 'Corpus Christi, TX', 'Veterans Memorial HS'),
  ('e3dca827-2885-47e2-85c1-369c44b23d01', 'TRIP-20260326-0004', '2026-03-26', '2026-03-26', 'Brownsville TX', 'UTRGV'),
  ('94a2c66c-0032-440b-b173-c18cdba1d39c', 'TRIP-20260326-0007', '2026-03-26', '2026-03-26', 'Corpus Christi, TX', 'Mchi  Girls soccer'),
  ('74e20e70-7c6a-4c01-822d-4b4b20f9790e', 'TRIP-20260327-0001', '2026-03-27', '2026-03-29', 'Galveston, TX', 'Edinburg High School'),
  ('ff9bfa4a-768f-4cd4-88cc-73924ed6c643', 'TRIP-20260327-0002', '2026-03-27', '2026-03-29', 'Galveston, TX', 'Valley View HS'),
  ('a627aab4-1e86-485a-a821-e1e93e6d0e40', 'TRIP-20260327-0003', '2026-03-27', '2026-03-30', 'Galveston, TX', 'Edinburg North HS'),
  ('75050798-b4bc-4c39-b85b-0d0c1317cdad', 'TRIP-20260327-0005', '2026-03-27', '2026-03-27', 'Corpus Christi, TX', 'McAllen Memorial HS'),
  ('c7ceb498-cd05-410b-92cc-e688e8eacbbe', 'TRIP-20260327-0006', '2026-03-27', '2026-03-27', 'Corpus Christi, TX', 'Memorial Cheer'),
  ('f4988dfb-b461-4f6f-bc53-2171be00bd5e', 'TRIP-20260327-0007', '2026-03-27', '2026-03-27', 'Rockport TX', 'Nikki Rowe HS'),
  ('96698a7d-2685-4fab-b43c-e284f026094d', 'TRIP-20260327-0001', '2026-03-28', '2026-03-29', 'Galveston TX', 'Veterans Memorial ECHS'),
  ('3507e8a2-57fe-4c53-9090-7b561c0afbce', 'TRIP-20260328-0001', '2026-03-28', '2026-03-28', 'Kingsville, TX', 'McAllen Memorial HS'),
  ('0c683243-c7b5-48a3-85d2-28637119c874', 'TRIP-20260328-0003', '2026-03-28', '2026-03-28', 'Pharr, TX', 'Marine Military Academy'),
  ('6437f3d4-de73-4728-af8c-092258839fcb', 'TRIP-20260331-0003', '2026-03-31', '2026-03-31', 'Local', 'Vanguard Beethoven');

create temporary table mar26_assignments_source (
  legacy_assignment_id text primary key,
  legacy_trip_key uuid not null,
  bus_number text,
  primary_driver text,
  co_driver text,
  relief_start text,
  relief_end text
) on commit drop;

insert into mar26_assignments_source values
  ('732', '079195f2-16ce-4b38-8649-b2ef686b6d44', '746', 'Oscar', 'Vasquez', null, null),
  ('722', '099274d1-fc0f-4763-8ac6-2d2da5bf7ed5', '470', 'Maria', null, null, null),
  ('736', '0ab2c50c-8665-4c1f-a3f7-eafcfc0b284c', '607', 'Raul', null, null, null),
  ('776', '0c683243-c7b5-48a3-85d2-28637119c874', '897', 'Arredondo', null, null, null),
  ('764', '0d67aeef-4c3c-4071-b8b4-8334f52bfbec', '763', 'George', null, null, null),
  ('748', '0e5bdbd7-da55-4bf7-bd44-1a4523eafe56', '898', 'Jose', null, null, null),
  ('745', '15080fec-d6d2-4c88-97b7-a5bdc3e7347f', '746', 'Jose', null, null, null),
  ('743', '15951a51-b135-4b63-a623-54bec4c35a12', '133', 'Felipe', null, null, null),
  ('744', '15951a51-b135-4b63-a623-54bec4c35a12', '470', 'Maria', null, null, null),
  ('742', '19df1e5b-2a93-4fcb-9b18-7d22492bcd63', '607', 'Jorge', null, null, null),
  ('696', '21d6691c-38ba-4072-b327-4e714a85049a', 'WAITING_LIST', 'Vicente Solar', null, null, null),
  ('768', '22876a22-e593-4c33-9865-980b4176012d', '898', 'Raul', null, null, null),
  ('769', '22876a22-e593-4c33-9865-980b4176012d', '897', 'David', null, null, null),
  ('700', '292adfc3-9049-47e4-b082-b08b4b245549', '474', 'George', 'Maria', null, null),
  ('701', '292adfc3-9049-47e4-b082-b08b4b245549', '506', 'Jonathan', null, null, null),
  ('835', '2accd0cb-5289-4cd5-9d40-a8e34d22fdc2', '133', 'Sergio', null, null, null),
  ('747', '2b711ae9-cfd8-4985-9320-8fb0d613c448', '133', 'Benny', 'Sergio', null, null),
  ('733', '2d5ce7fe-72b3-45ab-a55e-a3b94f995006', '218', 'Jonathan', null, null, null),
  ('686', '31124515-bc9d-4c7b-aece-320643cc5ab4', '470', 'Sanchez', null, null, null),
  ('687', '32b11bd8-324a-4f15-84a2-92bad70a33eb', '474', 'Oscar', null, null, null),
  ('716', '34468e0d-67d6-4883-8bdd-e4be689453a6', '218', 'George', 'Rigo', null, null),
  ('717', '34468e0d-67d6-4883-8bdd-e4be689453a6', '763', 'Sanchez', 'Jonathan', null, null),
  ('777', '3507e8a2-57fe-4c53-9090-7b561c0afbce', '607', 'Jorge', null, null, null),
  ('706', '3cb62f5c-439f-4c44-bf75-867935bd93c3', '133', 'Raul', null, null, null),
  ('707', '3cb62f5c-439f-4c44-bf75-867935bd93c3', '746', 'Sergio', null, null, null),
  ('713', '52f62c14-b7b5-4bb3-b990-1d371b955883', '898', 'Cortinas', 'Griselda', null, null),
  ('719', '539d550d-8539-417d-872e-b43246ad5690', '898', 'Maria', 'Vasquez', null, null),
  ('720', '539d550d-8539-417d-872e-b43246ad5690', '470', 'Oscar', 'Vasquez', null, null),
  ('709', '5710560a-79c3-44ca-947a-50503b35a2d0', '133', 'David', null, null, null),
  ('712', '572af4ce-618e-4876-ae64-884256e3db4e', '607', 'David', null, null, null),
  ('718', '57c332ff-0907-48c4-92fd-52ac7a792604', '470', 'Maria', null, null, null),
  ('710', '5e180e18-fb3a-4b6a-b9c9-173c87e55b95', '506', 'Sergio', null, null, null),
  ('688', '5f8d127f-9918-4261-9e80-19de41a182ff', '218', 'Maria', null, null, null),
  ('708', '623b9520-b602-455c-95a2-340e55874986', '470', 'Vasquez', null, null, null),
  ('782', '6437f3d4-de73-4728-af8c-092258839fcb', '763', 'Jorge', null, null, null),
  ('689', '67b0dba5-3b2b-4aea-8210-db8856208b20', '763', 'Juan', null, null, null),
  ('2652', '74e20e70-7c6a-4c01-822d-4b4b20f9790e', '506', 'George', null, null, null),
  ('750', '75050798-b4bc-4c39-b85b-0d0c1317cdad', '133', 'Felipe', null, null, null),
  ('790', '7905cb4d-0d83-44c0-adef-2c3e53eb9071', '898', 'Maria', null, null, null),
  ('774', '7942d3a4-86f0-45a5-865d-a7cafbda55b8', '218', 'Jonathan', null, null, null),
  ('775', '7942d3a4-86f0-45a5-865d-a7cafbda55b8', '763', 'Jose', null, null, null),
  ('714', '7c5725d7-f578-4944-a813-84a9945bfd77', '897', 'Felipe', null, null, null),
  ('823', '853d0fc8-8789-4077-a00f-eb0bde0320da', '218', 'Rigo', null, 'Jorge', null),
  ('730', '8876f71f-6239-4fa3-a50e-9b58e5eace16', '897', 'Cortinas', null, null, null),
  ('731', '88ed5b04-9f1b-40ae-ac6d-abbc133bd4c4', '607', 'Jorge', null, null, null),
  ('711', '8ccd6d9c-7725-4f75-8734-89d529202c62', '506', 'Jose', null, null, null),
  ('751', '94a2c66c-0032-440b-b173-c18cdba1d39c', '470', 'Vasquez', null, null, null),
  ('739', '95f77679-30f6-489f-93a4-df2d0b0b44ed', '897', 'Sanchez', null, null, null),
  ('763', '961d8844-35c1-4ee2-bcd4-503dca182fdb', '474', null, null, null, null),
  ('766', '96698a7d-2685-4fab-b43c-e284f026094d', '133', 'Maria', null, null, null),
  ('698', '99de6c96-0189-49db-acec-bab60fab3714', '218', 'Oscar', 'Jorge', null, null),
  ('727', '9a921fbd-cc5f-4bb5-9f1c-e69603feee5a', '897', 'Arredondo', null, null, null),
  ('728', '9a921fbd-cc5f-4bb5-9f1c-e69603feee5a', '898', 'Raul', null, null, null),
  ('767', '9c9b7465-dc5d-4f8c-8580-eb9d58fcb48b', '506', 'Sanchez', null, null, null),
  ('723', 'a202ad73-003b-47c2-85d9-f5fc88e5f8d6', '897', 'Felipe', 'Jose', null, null),
  ('724', 'a202ad73-003b-47c2-85d9-f5fc88e5f8d6', '898', 'Ernesto', 'Jose', null, null),
  ('725', 'a202ad73-003b-47c2-85d9-f5fc88e5f8d6', '470', 'David', 'Miguel', null, null),
  ('726', 'a202ad73-003b-47c2-85d9-f5fc88e5f8d6', '607', 'Cortinas', 'Miguel', null, null),
  ('702', 'a2e6f456-25d2-477c-af5f-f4019756a36f', '218', 'Maria', null, null, null),
  ('699', 'a4db85a5-3fe8-492f-b940-af1ec51577cb', '763', 'Rigo', null, null, null),
  ('778', 'a627aab4-1e86-485a-a821-e1e93e6d0e40', '470', 'Rigo', null, null, null),
  ('735', 'a837b474-eaf2-4bbc-bfed-0b3e3e1706dc', '506', 'Maria', null, null, null),
  ('721', 'b7169073-c66a-4782-8a36-a46d6bfe640d', '506', 'David', null, null, null),
  ('704', 'b87a3556-b105-42c5-9f07-bcb6f984a4cb', '506', null, null, null, null),
  ('729', 'badb7a5d-7e10-4bd4-9651-a212ae133664', '746', 'Felipe', null, null, null),
  ('705', 'c01f7cb8-c1af-49fa-882b-aa616afe5595', '897', 'David', null, null, null),
  ('772', 'c28a2f52-2dfb-4081-a94a-0c3e541a7b7d', '898', 'Miguel', null, null, null),
  ('738', 'c53f19bc-07cc-439d-badc-f6e783a664a7', '746', 'Sanchez', null, null, null),
  ('685', 'c668e4f8-7be8-4dde-b4e6-f17cb3d3d938', '506', 'Cortinas', null, null, null),
  ('753', 'c7ceb498-cd05-410b-92cc-e688e8eacbbe', '607', 'David', null, null, null),
  ('642', 'd190fb2b-904f-4301-86b1-c95806da1caf', '898', 'Jonathan', null, null, null),
  ('822', 'd6bd6b59-372e-4e50-a955-702baab6c768', '470', 'George', null, 'David', null),
  ('773', 'dddb9eb2-bd47-4b0f-a1b5-6cfa32eca8e5', '746', 'Rigo', null, null, null),
  ('749', 'e3dca827-2885-47e2-85c1-369c44b23d01', '506', 'Raul', null, null, null),
  ('715', 'e7d91f43-67dd-49cb-9c55-3efea2cf84a5', '898', 'Cortinas', 'Prudenciano', null, null),
  ('695', 'f0ea14a4-962b-4e64-b92a-07e2bf4836f7', '470', 'Jay', null, null, null),
  ('746', 'f17a794d-55fb-42b0-8103-3e2f3b0b93ea', '763', 'David', null, null, null),
  ('737', 'f1ac7982-e2dd-40a0-96d1-10a3f36a8eea', '898', 'Arredondo', null, null, null),
  ('771', 'f4988dfb-b461-4f6f-bc53-2171be00bd5e', '897', 'Raul', null, null, null),
  ('734', 'f8409fb6-7481-44d0-b927-4aa92bb5bf08', '133', 'Vasquez', null, null, null),
  ('770', 'ff9bfa4a-768f-4cd4-88cc-73924ed6c643', '746', 'Sanchez', null, null, null);

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
  'Inactive historical placeholder created for the corrected March 2026 legacy import.'
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
  'LEGACY-MAR26-' || upper(substr(replace(t.legacy_trip_key::text, '-', ''), 1, 8)) as target_trip_ref,
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
  where coalesce(t.notes, '') not like '[Legacy corrected MAR26:%';

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
  '[Legacy corrected MAR26: tripKey=' || p.legacy_trip_key::text ||
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

-- Verification: expected 70 trips, 81 assignments, 95 driver-role rows, 1 waiting-list row.
select
  count(distinct t.id) as trips,
  count(distinct ta.id) as assignments,
  count(distinct td.id) as driver_assignments,
  count(distinct ta.id) filter (where ta.bus_id is null) as waiting_list_assignments
from public.trips t
left join public.trip_assignments ta on ta.trip_id = t.id
left join public.trip_drivers td on td.assignment_id = ta.id
where t.notes like '[Legacy corrected MAR26:%';
