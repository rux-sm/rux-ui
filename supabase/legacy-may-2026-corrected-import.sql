begin;

-- Corrected May 2026 legacy import.
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
  ('698e0152-b4df-43f6-924f-8cdff8d5fdea', 'TRIP-20260501-0001', '2026-05-01', '2026-05-01', 'San Antonio, TX', 'IDEA Pharr'),
  ('2f982723-9bc0-447f-82c6-e726c8f61df8', 'TRIP-20260501-0002', '2026-05-01', '2026-05-01', 'Corpus Christi, TX', 'Vanguard Van Gogh'),
  ('2cd30fcc-3eed-455a-8ed8-10bf21a37fc8', 'TRIP-20260601-0001', '2026-05-01', '2026-05-01', 'San Antonio, TX', 'IDEA Pharr'),
  ('d7453b4c-6504-44e6-b0c2-d18e97356fa2', 'TRIP-20260502-0001', '2026-05-02', '2026-05-02', 'San Antonio, TX', 'PSJA Memorial HS'),
  ('db3cf009-ef45-4983-868a-61c9aa4a1ac0', 'TRIP-20260502-0003', '2026-05-02', '2026-05-02', 'South Padre Island, TX', '-'),
  ('d2fcc371-ad43-43d4-a9c6-1daad546a75e', 'TRIP-20260502-0005', '2026-05-02', '2026-05-02', 'Edinburg, TX', 'UTRGV'),
  ('3054f416-10c3-413a-83fc-e7fa59333ff7', 'TRIP-20260503-0001', '2026-05-03', '2026-05-03', 'Pharr, TX', 'Mother Cabrini Parish'),
  ('dd7965bf-9795-41ce-b299-f87140d59926', 'TRIP-20260504-0003', '2026-05-04', '2026-05-05', 'Houston, TX', 'IDEA San Juan'),
  ('499e2522-44ea-4e0c-ae2c-2c13275d90b5', 'TRIP-20260505-0001', '2026-05-05', '2026-05-05', 'Brownsville, TX', 'Vanguard Rembrandt'),
  ('tk_1777576556733_640509030', 'TRIP-20260505-0003', '2026-05-05', '2026-05-05', 'Corpus Christi, TX', 'Hidalgo ISD'),
  ('68f59be3-d4a3-4d23-8727-a65fea654bd5', 'TRIP-20260505-0004', '2026-05-05', '2026-05-07', 'Dallas, TX', 'IDEA Weslaco Pike'),
  ('544dc88d-d25a-4657-8271-ad05a53ae4f0', 'TRIP-20260206-0003', '2026-05-06', '2026-05-06', 'Houston, TX', 'Jesus Vela MS'),
  ('f01048c0-64ce-4dd8-8438-effaea9425d4', 'TRIP-20260506-0001', '2026-05-06', '2026-05-06', 'San Antonio, TX', 'Memorial Elementary'),
  ('cf1f0320-ab60-4ee5-8bb6-39d215d57e02', 'TRIP-20260506-0002', '2026-05-06', '2026-05-06', 'Corpus Christi, TX', 'Excellance In Leadership'),
  ('c45ef99e-3754-42b7-86a1-01b2e16ae737', 'TRIP-20260506-0003', '2026-05-06', '2026-05-06', 'Corpus Christi, TX', 'PSJA Santo Livas ES'),
  ('468bbb60-9bb8-4c3d-b6d0-f5938bc391a8', 'TRIP-20260207-0002', '2026-05-07', '2026-05-07', 'San Juan, TX', 'San Martin De Porres- ALTON TX'),
  ('9784d3cd-3f24-46ab-b716-44e3897f553a', 'TRIP-20260507-0001', '2026-05-07', '2026-05-07', 'San Antonio, TX', 'IDEA Weslaco'),
  ('76d23963-d171-431a-a8d8-97af47e23c3c', 'TRIP-20260507-0002', '2026-05-07', '2026-05-07', 'Corpus Christi, TX', 'IDEA Pharr'),
  ('7770893b-407f-40f7-8467-de92ff4e8f22', 'TRIP-20260507-0003', '2026-05-07', '2026-05-07', 'San Antonio, TX', 'IDEA North Mission'),
  ('tk_1778187397915_518501066', 'TRIP-20260507-0004', '2026-05-07', '2026-05-09', 'Valdosta, GA', 'S.P. Harvester'),
  ('8f6bacdd-1b41-4227-a44e-215e03bf8b2d', 'TRIP-20260508-0001', '2026-05-08', '2026-05-08', 'Corpus Christi, TX', 'Vanguard Rembrandt'),
  ('65ecdaf4-ccee-441d-b8cb-28bf3bc3e441', 'TRIP-20260508-0002', '2026-05-08', '2026-05-08', 'San Antonio, TX', 'The Arts Educational Tours'),
  ('a64ba654-9e21-473a-9614-3ba6688cd6e5', 'TRIP-20260508-0003', '2026-05-08', '2026-05-08', 'San Antonio, TX', 'Cavazos Elementary'),
  ('62fcfc50-d801-494d-bf67-009092f1072b', 'TRIP-20260508-0004', '2026-05-08', '2026-05-08', 'Corpus Christi, TX', 'IDEA Pharr'),
  ('91b2a04e-6a61-4b5f-a6b5-7454e8d9f2bc', 'TRIP-20260509-0001', '2026-05-09', '2026-05-09', 'San Antonio, TX', 'Valley View JHS'),
  ('7b036767-2b42-4c6a-a026-722f92abde6a', 'TRIP-20260509-0004', '2026-05-09', '2026-05-09', 'South Padre Island TX', 'Marine Military Academy'),
  ('8bc01d9f-41be-4364-8773-d9d77eccfb5d', 'TRIP-20260509-0004', '2026-05-09', '2026-05-09', 'San Antonio, TX', 'Donna North HS'),
  ('7a9ad96a-5b53-47ff-bfda-cd3048a1a621', 'TRIP-20260510-0002', '2026-05-10', '2026-05-10', 'San Juan, TX', 'San Martin De Porres - Alton'),
  ('8de30930-2836-46bb-b667-31de99f01699', 'TRIP-20260511-0001', '2026-05-11', '2026-05-11', 'Austin, TX', 'Todd Middle School'),
  ('0194a8b0-a3f5-4364-b24f-ca650ab7c5e7', 'TRIP-20260511-0002', '2026-05-11', '2026-05-11', 'Corpus Christi, TX', 'IDEA Brownsville'),
  ('08b75bdb-f90b-4190-b489-ccca791d92c7', 'TRIP-20260511-0003', '2026-05-11', '2026-05-11', 'South Padre Island, TX', 'Barrientes Middle School'),
  ('fcee3a86-5443-4a1f-8bd8-55b40a196646', 'TRIP-20260512-0001', '2026-05-12', '2026-05-12', 'Corpus Christi, TX', 'Vanguard Van Gogh'),
  ('6d3033d1-76ea-41b6-885a-3dd0c939358a', 'TRIP-20260512-0003', '2026-05-12', '2026-05-12', 'Hidalgo, TX', 'Excellance In Leadership'),
  ('ea4ad214-7530-46fb-9f08-126c3a1d6d30', 'TRIP-20260512-0004', '2026-05-12', '2026-05-12', 'San Antonio, TX', 'Munoz Elementry'),
  ('145460a4-b00a-4f14-b6f4-582e9a2128f9', 'TRIP-20260513-0001', '2026-05-13', '2026-05-14', 'Houston, TX', 'IDEA Weslaco'),
  ('5e60f601-9ec7-4cfc-85ef-3f07fba4fe5d', 'TRIP-20260513-0001', '2026-05-13', '2026-05-13', 'Edinburg, TX', 'Excellance In Leadership'),
  ('d264c671-8b9a-4c4a-a141-7e4ef8fb4e6d', 'TRIP-20260513-0002', '2026-05-13', '2026-05-13', 'San Antonio, TX', 'Vanguard Van Gogh'),
  ('4849f8df-caf5-466a-9f2f-60836e1a1d97', 'TRIP-20260514-0001', '2026-05-14', '2026-05-14', 'San Antonio, TX', 'Sauceda Middle School'),
  ('f75e044f-bd3f-41b4-b14d-34a6b8e196ee', 'TRIP-20260514-0002', '2026-05-14', '2026-05-14', 'San Antonio, TX', 'The Travel Center'),
  ('65cbb4c8-ae01-4d13-bb07-1d46a1128ab8', 'TRIP-20260514-0003', '2026-05-14', '2026-05-14', 'Houston, TX', 'IDEA North Mission'),
  ('e2510278-38c0-4d37-82f1-ac8acc0784b8', 'TRIP-20260514-0004', '2026-05-14', '2026-05-14', 'San Antonio, TX', 'IDEA Donna'),
  ('cd244abb-d49e-4195-922f-53c70e77a6d8', 'TRIP-20260427-0001', '2026-05-15', '2026-05-20', 'Orlando, FL', 'IDEA Owassa'),
  ('8f29486d-61fb-4d4b-9c09-2bd26ee31563', 'TRIP-20260515-0001', '2026-05-15', '2026-05-15', 'San Antonio, TX', 'Munoz Elementary'),
  ('3a319527-d15b-4527-8472-347609bc3694', 'TRIP-20260515-0003', '2026-05-15', '2026-05-15', 'Edinburg, TX', 'UTRGV'),
  ('e5d677b5-3709-4bf6-949f-471a7c1223d0', 'TRIP-20260515-0003', '2026-05-15', '2026-05-15', 'San Antonio, TX', 'IDEA Donna'),
  ('4ae6398d-84ed-4850-a4ac-c1fda0ceab28', 'TRIP-20260515-0004', '2026-05-15', '2026-05-15', 'San Antonio, TX', 'Cavazos Elementary'),
  ('2e086820-dabd-4760-a31f-a0617edf0c0c', 'TRIP-20260519-0001', '2026-05-15', '2026-05-15', 'San Antonio, TX', 'Vanguard Beethoven'),
  ('b2aa35de-78c1-44eb-9dc2-40924a18687f', 'TRIP-20260526-0002', '2026-05-15', '2026-05-15', 'San Antonio, TX', 'Liberty Middle School'),
  ('e9cddc4b-4c33-4310-996c-341afc6e2681', 'TRIP-20260516-0001', '2026-05-16', '2026-05-16', 'San Antonio, TX', 'Fossum Middle School'),
  ('90e46bb7-e6ec-4ca3-bc0a-840eea7bcd65', 'TRIP-20260516-0002', '2026-05-16', '2026-05-16', 'San Antonio, TX', 'Resaca Middle School'),
  ('73e2a9b0-79ea-43d8-845a-f00dd3be02df', 'TRIP-20260516-0003', '2026-05-16', '2026-05-16', 'New Braunfels, TX', 'Riverside MS'),
  ('0fe20a37-15f5-48de-958f-8cf05d99b1c2', 'TRIP-20260516-0004', '2026-05-16', '2026-05-16', 'San Antonio, TX', 'Austin Middle School'),
  ('57ad2263-e04d-4930-bcc0-7471573797bc', 'TRIP-20260516-0005', '2026-05-16', '2025-05-16', 'San Antonio, TX', 'Donna High School'),
  ('2c55950c-62cc-483a-81bf-f31a69298c87', 'TRIP-20260517-0001', '2026-05-17', '2026-05-20', 'SA / Ausitn / Houston', 'IDEA Owassa'),
  ('1231adc9-93ba-4a2d-89fa-947f8127ba47', 'TRIP-20260517-0002', '2026-05-17', '2026-05-17', 'Rockport, TX', '-'),
  ('65c5b4d0-2f6b-493d-8d7b-f0035e413497', 'TRIP-20260517-0003', '2026-05-17', '2026-05-17', 'Houston, TX', 'Edinburg High School'),
  ('16c5df9c-e62a-4b02-9d88-65af6ea09137', 'TRIP-20260518-0001', '2026-05-18', '2026-05-18', 'San Antonio TX', 'Vanguard Mozart'),
  ('943801b3-92de-4597-b317-914614af7a01', 'TRIP-20260518-0002', '2026-05-18', '2026-05-18', 'Corpus Christi, TX', 'Cavazos ES'),
  ('39c7ed28-a812-450b-a1e8-c81864f14c72', 'TRIP-20260518-0003', '2026-05-18', '2026-05-18', 'San Antonio, TX', 'Roma Middle School'),
  ('6d38e61d-f595-44b7-b35c-2a44336d41ab', 'TRIP-20260518-0004', '2026-05-18', '2026-05-19', 'Austin, TX', 'IDEA Rio Grande City'),
  ('f735a950-cf9a-4325-8e23-60a8afb21661', 'TRIP-20260518-0005', '2026-05-18', '2026-05-18', 'San Antonio, TX', 'Todd Middle School'),
  ('tk_1779209479687_777405573', null, '2026-05-20', '2026-05-20', 'San Antonio, TX', 'Red Charters'),
  ('61f2a213-1ada-4bb2-b27d-38a12c922b2c', 'TRIP-20260520-0002', '2026-05-20', '2026-05-20', 'Edinburg, TX', 'Excellance In Leadership'),
  ('8c34702e-f65e-4f7c-907e-eff6ec120414', 'TRIP-20260520-0003', '2026-05-20', '2026-05-20', 'San Antonio, TX', 'Jesus Vela MS'),
  ('be617caf-b56d-4878-967b-0eabf14461d9', 'TRIP-20260520-0006', '2026-05-20', '2026-05-20', 'South Padre Island, TX', 'City of McAllen'),
  ('mpbn5j45-fkcdqmb10', 'TRIP-20260520-0007', '2026-05-20', '2026-05-20', 'Corpus Christi, TX', 'The Charter Bus'),
  ('cf9d311e-bf2e-4d30-ba64-a38bdb857455', 'TRIP-20260527-0002', '2026-05-20', '2026-05-20', 'San Antonio, TX', 'IDEA San Juan'),
  ('61a3a21e-64e3-4efd-acd4-786e44c47b5a', 'TRIP-20260521-0001', '2026-05-21', '2026-05-21', 'San Antonio, TX', 'PSJA Audie Murphy MS'),
  ('2fab35c9-4df6-4ac8-a0b1-f5243ac41a97', 'TRIP-20260521-0002', '2026-05-21', '2026-05-21', 'San Antonio, TX', 'Rio Hondo HS'),
  ('255e4351-81cf-482f-91f0-1e977226598d', 'TRIP-20260521-0004', '2026-05-21', '2026-05-21', 'San Antonio, TX', 'LBJ Band'),
  ('d3d2fbcd-987e-422d-bc95-2311215082cf', 'TRIP-20260521-0005', '2026-05-21', '2026-05-21', 'Los Fresnos, TX', 'Covenant Christian Academy'),
  ('47cad0ec-a382-4334-972f-8d443438a3ae', 'TRIP-20260521-0006', '2026-05-21', '2026-05-21', 'San Antonio, TX', 'Covenant Christian Academy'),
  ('b26a3ea4-7d84-4ddf-8115-5a182d4ef455', 'TRIP-20260519-0001', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'PSJA North'),
  ('373080c3-d4ed-4bb0-8da8-8bc1e1980a69', 'TRIP-20260522-0001', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'IDEA Tres Lagos'),
  ('427a5d96-c24e-4064-9b00-6ed89729821a', 'TRIP-20260522-0002', '2026-05-22', '2026-05-23', 'Austin, TX', 'Vanguard Beethoven'),
  ('eb390a72-ae1a-49ca-8b4e-55271b9bb226', 'TRIP-20260522-0002', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'De Leon Middle School'),
  ('6cfab6cc-6b92-4578-9a4c-4201c4195517', 'TRIP-20260522-0003', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'IDEA McAllen'),
  ('d4f9be13-0d54-4cff-b6a6-ea199e647c77', 'TRIP-20260522-0004', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'IDEA Rio Grande City'),
  ('9d154b83-b88f-4b6a-b65f-430c978e6cb6', 'TRIP-20260523-0003', '2026-05-22', '2026-05-22', 'San Antonio, TX', 'PSJA Escalante MS'),
  ('3553a5b0-a5b1-4a89-9f89-29c41a0c356d', 'TRIP-20260523-0002', '2026-05-23', '2026-05-23', 'San Antonio, TX (SW)', 'IDEA Mission'),
  ('6f2c09fc-8646-41bf-874e-c35c6d230c20', 'TRIP-20260523-0002', '2026-05-23', '2026-05-23', 'San Antonio, TX', 'Ausin Middle School'),
  ('tk_1779309609713_727363081', null, '2026-05-24', '2026-05-26', 'San Marcos, TX', 'TMF'),
  ('48f65adb-6499-4038-a7f3-4b94ee8e05b6', 'TRIP-20260510-0001', '2026-05-24', '2026-05-24', 'San Antonio, TX', 'Donna High School'),
  ('526dd82b-30cd-47a6-acd7-d3eb5aaeb854', 'TRIP-20260524-0002', '2026-05-24', '2026-05-24', 'San Antonio, TX', 'Donna High School'),
  ('cef560bc-913c-4756-8252-72e12f51a957', 'TRIP-20260524-0002', '2026-05-24', '2026-05-25', 'Kyle, TX', 'Valley View HS'),
  ('a4dfb786-5fbe-48f0-aedd-660abcf223ec', 'TRIP-20260524-0005', '2026-05-24', '2026-05-26', 'Buda TX', 'Mission High School'),
  ('tk_1779482322782_696317227', 'TRIP-20260524-0006', '2026-05-24', '2026-05-25', 'Austin, TX', 'The Charter Bus'),
  ('f7132b47-c7c8-473b-810c-76b5b7ad3ae8', 'TRIP-20260509-0002', '2026-05-25', '2026-05-25', 'San Antonio, TX', 'PSJA ECHS'),
  ('7b16a57c-4472-4dc8-8d9b-21a0fc578241', 'TRIP-20260525-0002', '2026-05-25', '2026-05-28', 'Dallas, TX', null),
  ('1a2f261c-0a3a-4ba8-959e-68635ab90501', 'TRIP-20260502-0002', '2026-05-26', '2026-05-26', 'San Antonio, TX', 'BL Gray'),
  ('7c825e38-7934-4d63-b09e-46296cf39fe5', 'TRIP-20260526-0001', '2026-05-26', '2026-05-26', 'San Antonio, TX', 'IDEA Quest'),
  ('92ac6e3b-1d93-4634-86bc-59dfe9053fab', 'TRIP-20260526-0004', '2026-05-26', '2026-05-26', 'San Antonio, TX', 'PSJA Kennedy MS'),
  ('c88b4a52-8ee0-4611-8330-8c37531a3731', 'TRIP-20260526-0004', '2026-05-26', '2026-05-26', 'San Antonio, TX', 'La Joya High School'),
  ('feb9ce56-f6ca-4fc7-8c6e-2d687dcd082e', 'TRIP-20260527-0001', '2026-05-27', '2026-06-02', 'Orlando, FL', 'The Arts Educational Tours'),
  ('348b001a-539c-4602-a1cc-caa41792eeab', 'TRIP-20260527-0003', '2026-05-27', '2026-06-01', 'Orlando, FL', 'TMF'),
  ('7ebfb521-ca72-4bc1-90c4-d1e753bd6f69', 'TRIP-20260528-0001', '2026-05-28', '2026-05-28', 'San Antonio, TX', 'PSJA Kennedy MS'),
  ('8a96bda2-3582-4897-99ee-192a91b28a5d', 'TRIP-20260528-0002', '2026-05-28', '2026-05-28', 'San Antonio, TX', 'PSJA Audie Murphy MS'),
  ('ae3f46d5-015f-45f2-a945-e2ea091d732e', 'TRIP-20260529-0001', '2026-05-29', '2026-05-29', 'Corpus Christi, TX', 'Sam Houston ES'),
  ('15f93399-8ddf-4b78-bd4c-7476cc551e7c', 'TRIP-20260529-0002', '2026-05-29', '2026-05-29', 'San Antonio, TX', 'PSJA T-Stem'),
  ('8d0ef4ea-1646-48ec-aef5-bee31af4c150', 'TRIP-20260529-0002', '2026-05-29', '2026-05-29', 'San Antonio, TX', 'Sam Houston ES'),
  ('dba16829-b27f-4461-ac74-3f184407336b', 'TRIP-20260529-0003', '2026-05-29', '2026-05-29', 'Austin, TX', 'PSJA Carmen ES'),
  ('18d19882-0f93-4313-95f9-c2cdd8c2de15', 'TRIP-20260529-0004', '2026-05-29', '2026-05-29', 'Corpus Christi, TX', 'Freedom Charters'),
  ('c31b0614-670f-4151-9bd6-2560e27f348b', 'TRIP-20260530-0001', '2026-05-30', '2026-05-31', 'Dallas, TX', 'Cathey MS'),
  ('46cf5deb-d46e-49fd-aed3-9233fca8a34b', 'TRIP-20260530-0003', '2026-05-30', '2026-05-30', 'San Antonio TX', 'PSJA ECHS'),
  ('eb058201-5507-42ae-b32d-d0fdee125061', 'TRIP-20260530-0004', '2026-05-30', '2026-05-30', 'San Antonio, TX', 'PSJA Escobar ES'),
  ('4129b404-1938-47ec-8b2d-59e148f2b17c', null, '2026-05-31', '2026-06-02', 'Dallas, TX', 'TMF'),
  ('d54c4cd2-37b2-41c4-8540-74b6ffab5b4c', 'TRIP-20260531-0001', '2026-05-31', '2026-06-05', 'Orlando, FL', 'Group Travel Consultants');

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
  ('1076', '0194a8b0-a3f5-4364-b24f-ca650ab7c5e7', '746', 'Jorge', null, null, null),
  ('1077', '0194a8b0-a3f5-4364-b24f-ca650ab7c5e7', '474', 'Raul', null, null, null),
  ('1286', '08b75bdb-f90b-4190-b489-ccca791d92c7', '218', 'Maria', null, null, null),
  ('1271', '0fe20a37-15f5-48de-958f-8cf05d99b1c2', '474', 'George', null, null, null),
  ('1272', '0fe20a37-15f5-48de-958f-8cf05d99b1c2', '897', 'Padron', null, null, null),
  ('1274', '1231adc9-93ba-4a2d-89fa-947f8127ba47', '506', 'Ivan', null, null, null),
  ('1088', '145460a4-b00a-4f14-b6f4-582e9a2128f9', '218', 'Maria', null, 'Griselda', null),
  ('1089', '145460a4-b00a-4f14-b6f4-582e9a2128f9', '763', 'George', null, 'Hector', null),
  ('2025', '15f93399-8ddf-4b78-bd4c-7476cc551e7c', '898', 'Juan', null, null, null),
  ('1405', '16c5df9c-e62a-4b02-9d88-65af6ea09137', '898', 'George', null, null, null),
  ('2053', '18d19882-0f93-4313-95f9-c2cdd8c2de15', '506', 'Benny', null, null, null),
  ('1898', '1a2f261c-0a3a-4ba8-959e-68635ab90501', '897', 'Felipe', null, null, null),
  ('1899', '1a2f261c-0a3a-4ba8-959e-68635ab90501', '607', 'Maria', null, null, null),
  ('1900', '1a2f261c-0a3a-4ba8-959e-68635ab90501', '133', 'Lozano', null, null, null),
  ('1535', '255e4351-81cf-482f-91f0-1e977226598d', '133', 'Raul', null, null, null),
  ('1536', '255e4351-81cf-482f-91f0-1e977226598d', '218', 'Rigo', null, null, null),
  ('1537', '255e4351-81cf-482f-91f0-1e977226598d', '746', 'Jonathan', null, null, null),
  ('2452', '2c55950c-62cc-483a-81bf-f31a69298c87', '763', 'Lozano', null, null, null),
  ('918', '2cd30fcc-3eed-455a-8ed8-10bf21a37fc8', '746', 'Benny', null, null, null),
  ('919', '2cd30fcc-3eed-455a-8ed8-10bf21a37fc8', '607', 'Andy', null, null, null),
  ('920', '2cd30fcc-3eed-455a-8ed8-10bf21a37fc8', '898', 'Oscar', null, null, null),
  ('1068', '2e086820-dabd-4760-a31f-a0617edf0c0c', '898', 'Lozano', null, null, null),
  ('921', '2f982723-9bc0-447f-82c6-e726c8f61df8', '474', 'David', null, null, null),
  ('922', '2f982723-9bc0-447f-82c6-e726c8f61df8', '506', 'Ivan', null, null, null),
  ('1598', '2fab35c9-4df6-4ac8-a0b1-f5243ac41a97', '898', 'Vasquez', null, 'Padron', null),
  ('925', '3054f416-10c3-413a-83fc-e7fa59333ff7', '474', 'Cortinas', null, null, null),
  ('2222', '348b001a-539c-4602-a1cc-caa41792eeab', '746', 'Jorge', 'Ernesto', null, null),
  ('2223', '348b001a-539c-4602-a1cc-caa41792eeab', '133', 'Raul', 'Soto', null, null),
  ('1750', '3553a5b0-a5b1-4a89-9f89-29c41a0c356d', '763', 'Raul', null, null, null),
  ('1751', '3553a5b0-a5b1-4a89-9f89-29c41a0c356d', '218', 'Rigo', null, null, null),
  ('1752', '3553a5b0-a5b1-4a89-9f89-29c41a0c356d', '746', 'Jonathan', null, null, null),
  ('1613', '373080c3-d4ed-4bb0-8da8-8bc1e1980a69', '218', 'Sanchez', null, null, null),
  ('1614', '373080c3-d4ed-4bb0-8da8-8bc1e1980a69', '763', 'Maria', null, null, null),
  ('1789', '39c7ed28-a812-450b-a1e8-c81864f14c72', '133', 'Juvel', 'Felipe', null, null),
  ('1790', '39c7ed28-a812-450b-a1e8-c81864f14c72', '506', 'Oscar', 'Felipe', null, null),
  ('1791', '39c7ed28-a812-450b-a1e8-c81864f14c72', '746', 'Vasquez', 'Padron', null, null),
  ('1792', '39c7ed28-a812-450b-a1e8-c81864f14c72', '607', 'Rigo', 'Padron', null, null),
  ('1067', '3a319527-d15b-4527-8472-347609bc3694', '470', 'Hector', null, null, null),
  ('2262', '4129b404-1938-47ec-8b2d-59e148f2b17c', '897', 'Juan', null, null, null),
  ('1633', '427a5d96-c24e-4064-9b00-6ed89729821a', '133', 'Jorge', null, null, null),
  ('1293', '468bbb60-9bb8-4c3d-b6d0-f5938bc391a8', '897', 'Juvel', null, null, null),
  ('1974', '46cf5deb-d46e-49fd-aed3-9233fca8a34b', '898', 'David', null, null, null),
  ('1600', '47cad0ec-a382-4334-972f-8d443438a3ae', '763', 'Jorge', null, 'Hector', null),
  ('989', '4849f8df-caf5-466a-9f2f-60836e1a1d97', '897', 'Vasquez', null, null, null),
  ('990', '4849f8df-caf5-466a-9f2f-60836e1a1d97', '898', 'Sanchez', null, null, null),
  ('2037', '48f65adb-6499-4038-a7f3-4b94ee8e05b6', '218', 'George', null, null, null),
  ('2038', '48f65adb-6499-4038-a7f3-4b94ee8e05b6', '763', 'Oscar', null, null, null),
  ('993', '499e2522-44ea-4e0c-ae2c-2c13275d90b5', '898', 'Ernesto', null, null, null),
  ('994', '499e2522-44ea-4e0c-ae2c-2c13275d90b5', '474', 'Jonathan', null, null, null),
  ('1063', '4ae6398d-84ed-4850-a4ac-c1fda0ceab28', '897', 'Maria', null, null, null),
  ('1778', '526dd82b-30cd-47a6-acd7-d3eb5aaeb854', '474', 'Juvel', null, null, null),
  ('2363', '544dc88d-d25a-4657-8271-ad05a53ae4f0', '133', 'Luis', 'Arredondo', null, null),
  ('586', '57ad2263-e04d-4930-bcc0-7471573797bc', '898', null, null, null, null),
  ('1282', '5e60f601-9ec7-4cfc-85ef-3f07fba4fe5d', '607', 'Luis', null, null, null),
  ('1649', '61a3a21e-64e3-4efd-acd4-786e44c47b5a', '506', 'Juvel', null, 'Hector', null),
  ('1650', '61a3a21e-64e3-4efd-acd4-786e44c47b5a', '474', 'Jose P.', null, null, null),
  ('1399', '61f2a213-1ada-4bb2-b27d-38a12c922b2c', '470', 'Rigo', null, null, null),
  ('1005', '62fcfc50-d801-494d-bf67-009092f1072b', '470', 'Juvel', null, null, null),
  ('1006', '62fcfc50-d801-494d-bf67-009092f1072b', '898', 'Luis', null, null, null),
  ('1208', '65c5b4d0-2f6b-493d-8d7b-f0035e413497', '898', 'Luis', 'Ernesto', null, null),
  ('2453', '65cbb4c8-ae01-4d13-bb07-1d46a1128ab8', '746', 'Ernesto', 'Juvel', null, null),
  ('2454', '65cbb4c8-ae01-4d13-bb07-1d46a1128ab8', '607', 'Jonathan', 'Oscar', null, null),
  ('973', '65ecdaf4-ccee-441d-b8cb-28bf3bc3e441', '607', 'Vasquez', null, null, null),
  ('974', '65ecdaf4-ccee-441d-b8cb-28bf3bc3e441', '746', 'Ivan', null, null, null),
  ('991', '68f59be3-d4a3-4d23-8727-a65fea654bd5', '218', 'George', null, null, null),
  ('915', '698e0152-b4df-43f6-924f-8cdff8d5fdea', '133', 'Maria', 'Padron', null, null),
  ('916', '698e0152-b4df-43f6-924f-8cdff8d5fdea', '897', 'Raul', 'Padron', null, null),
  ('1618', '6cfab6cc-6b92-4578-9a4c-4201c4195517', '746', 'Soto', null, null, null),
  ('1619', '6cfab6cc-6b92-4578-9a4c-4201c4195517', '607', 'Oscar', null, null, null),
  ('1284', '6d3033d1-76ea-41b6-885a-3dd0c939358a', '506', 'Juvel', null, null, null),
  ('1418', '6d38e61d-f595-44b7-b35c-2a44336d41ab', '470', 'Jonathan', null, null, null),
  ('1756', '6f2c09fc-8646-41bf-874e-c35c6d230c20', '898', 'Griselda', null, null, null),
  ('1419', '73e2a9b0-79ea-43d8-845a-f00dd3be02df', '763', 'Oscar', 'Juvel', null, null),
  ('1420', '73e2a9b0-79ea-43d8-845a-f00dd3be02df', '133', 'Ernesto', 'Juvel', null, null),
  ('995', '76d23963-d171-431a-a8d8-97af47e23c3c', '763', 'Rigo', null, null, null),
  ('996', '76d23963-d171-431a-a8d8-97af47e23c3c', '133', 'Maria', null, null, null),
  ('972', '7770893b-407f-40f7-8467-de92ff4e8f22', '506', 'Jorge', null, null, null),
  ('981', '7a9ad96a-5b53-47ff-bfda-cd3048a1a621', '506', 'Juvel', null, null, null),
  ('980', '7b036767-2b42-4c6a-a026-722f92abde6a', '470', 'Maria', null, null, null),
  ('1903', '7b16a57c-4472-4dc8-8d9b-21a0fc578241', '474', 'Oscar', null, 'Sanchez', null),
  ('1901', '7c825e38-7934-4d63-b09e-46296cf39fe5', '506', 'Vasquez', null, null, null),
  ('1953', '7ebfb521-ca72-4bc1-90c4-d1e753bd6f69', '897', 'Felipe', null, null, null),
  ('2134', '8a96bda2-3582-4897-99ee-192a91b28a5d', '898', 'Maria', null, null, null),
  ('2135', '8a96bda2-3582-4897-99ee-192a91b28a5d', '506', 'Jose P', null, null, null),
  ('1000', '8bc01d9f-41be-4364-8773-d9d77eccfb5d', '133', 'Rigo', null, null, null),
  ('1788', '8c34702e-f65e-4f7c-907e-eff6ec120414', '133', 'Maria', null, null, null),
  ('1957', '8d0ef4ea-1646-48ec-aef5-bee31af4c150', '474', 'Lozano', null, null, null),
  ('979', '8de30930-2836-46bb-b667-31de99f01699', '763', 'George', null, 'Oscar', null),
  ('1793', '8f29486d-61fb-4d4b-9c09-2bd26ee31563', '506', 'Ivan', null, null, null),
  ('1794', '8f29486d-61fb-4d4b-9c09-2bd26ee31563', '763', 'Padron', null, 'Hector', null),
  ('1001', '8f6bacdd-1b41-4227-a44e-215e03bf8b2d', '133', 'Felipe', null, null, null),
  ('1002', '8f6bacdd-1b41-4227-a44e-215e03bf8b2d', '506', 'Arredondo', null, null, null),
  ('1003', '8f6bacdd-1b41-4227-a44e-215e03bf8b2d', '897', 'Raul', null, null, null),
  ('1004', '8f6bacdd-1b41-4227-a44e-215e03bf8b2d', '218', 'Jonathan', null, null, null),
  ('1146', '90e46bb7-e6ec-4ca3-bc0a-840eea7bcd65', '506', 'Jonathan', null, null, null),
  ('1147', '90e46bb7-e6ec-4ca3-bc0a-840eea7bcd65', '470', 'Soto', null, null, null),
  ('986', '91b2a04e-6a61-4b5f-a6b5-7454e8d9f2bc', '218', 'George', null, null, null),
  ('987', '91b2a04e-6a61-4b5f-a6b5-7454e8d9f2bc', '474', 'Jorge', null, null, null),
  ('1896', '92ac6e3b-1d93-4634-86bc-59dfe9053fab', '218', 'Benny', null, null, null),
  ('1897', '92ac6e3b-1d93-4634-86bc-59dfe9053fab', '763', 'Rigo', null, null, null),
  ('1134', '943801b3-92de-4597-b317-914614af7a01', '897', 'Raul', null, null, null),
  ('997', '9784d3cd-3f24-46ab-b716-44e3897f553a', '746', 'David', 'Benny', null, null),
  ('998', '9784d3cd-3f24-46ab-b716-44e3897f553a', '898', 'Cortinas', 'Benny', null, null),
  ('999', '9784d3cd-3f24-46ab-b716-44e3897f553a', '607', 'Ernesto', 'Benny', null, null),
  ('1612', '9d154b83-b88f-4b6a-b65f-430c978e6cb6', '898', 'Felipe', null, null, null),
  ('1759', 'a4dfb786-5fbe-48f0-aedd-660abcf223ec', '470', 'Sanchez', null, null, null),
  ('1007', 'a64ba654-9e21-473a-9614-3ba6688cd6e5', '474', 'Padron', null, null, null),
  ('1954', 'ae3f46d5-015f-45f2-a945-e2ea091d732e', '470', 'Andy', null, null, null),
  ('1638', 'b26a3ea4-7d84-4ddf-8115-5a182d4ef455', '474', 'George', null, null, null),
  ('1277', 'b2aa35de-78c1-44eb-9dc2-40924a18687f', '474', 'Rigo', null, null, null),
  ('1278', 'b2aa35de-78c1-44eb-9dc2-40924a18687f', '133', 'Luis', null, null, null),
  ('1393', 'be617caf-b56d-4878-967b-0eabf14461d9', '607', 'Juvel', null, null, null),
  ('1394', 'be617caf-b56d-4878-967b-0eabf14461d9', '897', 'David', null, null, null),
  ('2154', 'c31b0614-670f-4151-9bd6-2560e27f348b', '474', 'Maria', 'Griselda', null, null),
  ('971', 'c45ef99e-3754-42b7-86a1-01b2e16ae737', '474', 'Raul', null, null, null),
  ('1902', 'c88b4a52-8ee0-4611-8330-8c37531a3731', '746', 'Andy', null, null, null),
  ('1062', 'cd244abb-d49e-4195-922f-53c70e77a6d8', '218', 'Jorge', 'Sanchez', null, null),
  ('1779', 'cef560bc-913c-4756-8252-72e12f51a957', '746', 'David', null, null, null),
  ('970', 'cf1f0320-ab60-4ee5-8bb6-39d215d57e02', '898', 'Jonathan', null, null, null),
  ('1395', 'cf9d311e-bf2e-4d30-ba64-a38bdb857455', '746', 'Oscar', null, null, null),
  ('1396', 'cf9d311e-bf2e-4d30-ba64-a38bdb857455', '898', 'Felipe', null, null, null),
  ('1034', 'd264c671-8b9a-4c4a-a141-7e4ef8fb4e6d', '474', 'Jorge', null, null, null),
  ('917', 'd2fcc371-ad43-43d4-a9c6-1daad546a75e', '897', 'David', null, null, null),
  ('1557', 'd3d2fbcd-987e-422d-bc95-2311215082cf', '470', 'David', null, null, null),
  ('1630', 'd4f9be13-0d54-4cff-b6a6-ea199e647c77', '897', 'Lozano', null, null, null),
  ('2133', 'd54c4cd2-37b2-41c4-8540-74b6ffab5b4c', '470', 'Sanchez', 'Benny', null, null),
  ('906', 'd7453b4c-6504-44e6-b0c2-d18e97356fa2', '746', 'Jorge', null, null, null),
  ('923', 'db3cf009-ef45-4983-868a-61c9aa4a1ac0', '506', 'Juvel', null, null, null),
  ('2221', 'dba16829-b27f-4461-ac74-3f184407336b', '897', 'Vasquez', 'Cortinas', null, null),
  ('992', 'dd7965bf-9795-41ce-b299-f87140d59926', '746', 'Jorge', null, null, null),
  ('1400', 'e2510278-38c0-4d37-82f1-ac8acc0784b8', '470', 'Rigo', null, null, null),
  ('1401', 'e2510278-38c0-4d37-82f1-ac8acc0784b8', '506', 'Felipe', null, null, null),
  ('1402', 'e2510278-38c0-4d37-82f1-ac8acc0784b8', 'WAITING_LIST', null, null, null, null),
  ('1009', 'e5d677b5-3709-4bf6-949f-471a7c1223d0', '746', 'George', null, null, null),
  ('1010', 'e5d677b5-3709-4bf6-949f-471a7c1223d0', '607', 'Oscar', null, null, null),
  ('1266', 'e9cddc4b-4c33-4310-996c-341afc6e2681', '746', 'Raul', null, null, null),
  ('1267', 'e9cddc4b-4c33-4310-996c-341afc6e2681', '898', 'Benny', null, null, null),
  ('1268', 'e9cddc4b-4c33-4310-996c-341afc6e2681', '607', 'Felipe', null, null, null),
  ('1198', 'ea4ad214-7530-46fb-9f08-126c3a1d6d30', '133', 'Jonathan', null, null, null),
  ('1199', 'ea4ad214-7530-46fb-9f08-126c3a1d6d30', '746', 'Felipe', null, null, null),
  ('1975', 'eb058201-5507-42ae-b32d-d0fdee125061', '607', 'Felipe', null, null, null),
  ('1976', 'eb058201-5507-42ae-b32d-d0fdee125061', '897', 'Jose P', null, null, null),
  ('1651', 'eb390a72-ae1a-49ca-8b4e-55271b9bb226', '470', 'Juvel', null, null, null),
  ('1652', 'eb390a72-ae1a-49ca-8b4e-55271b9bb226', '506', 'David', null, null, null),
  ('976', 'f01048c0-64ce-4dd8-8438-effaea9425d4', '763', 'Sanchez', null, null, null),
  ('977', 'f01048c0-64ce-4dd8-8438-effaea9425d4', '506', 'Felipe', null, null, null),
  ('978', 'f01048c0-64ce-4dd8-8438-effaea9425d4', '897', 'Juvel', null, null, null),
  ('1906', 'f7132b47-c7c8-473b-810c-76b5b7ad3ae8', '897', 'Cortinas', null, null, null),
  ('1406', 'f735a950-cf9a-4325-8e23-60a8afb21661', '474', 'Maria', null, null, null),
  ('1280', 'f75e044f-bd3f-41b4-b14d-34a6b8e196ee', '474', 'Raul', null, null, null),
  ('1281', 'f75e044f-bd3f-41b4-b14d-34a6b8e196ee', '133', 'Benny', null, null, null),
  ('1040', 'fcee3a86-5443-4a1f-8bd8-55b40a196646', '898', 'Sanchez', null, null, null),
  ('1041', 'fcee3a86-5443-4a1f-8bd8-55b40a196646', '607', 'Rigo', null, null, null),
  ('1932', 'feb9ce56-f6ca-4fc7-8c6e-2d687dcd082e', '218', 'George', 'Rigo', null, null),
  ('1933', 'feb9ce56-f6ca-4fc7-8c6e-2d687dcd082e', '763', 'Jonathan', 'Juvel', null, null),
  ('1392', 'mpbn5j45-fkcdqmb10', '506', 'Ernesto', null, null, null),
  ('1225', 'tk_1777576556733_640509030', '607', 'Maria', null, null, null),
  ('975', 'tk_1778187397915_518501066', '763', 'Oscar', 'Soto', null, null),
  ('1390', 'tk_1779209479687_777405573', '474', 'George', null, null, null),
  ('2188', 'tk_1779309609713_727363081', '898', 'Ernesto', null, null, null),
  ('1787', 'tk_1779482322782_696317227', '133', 'Soto', null, null, null);

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
  'Inactive historical placeholder created for the corrected May 2026 legacy import.'
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
  'LEGACY-MAY26-' || upper(substr(replace(t.legacy_trip_key::text, '-', ''), 1, 8)) as target_trip_ref,
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
  where coalesce(t.notes, '') not like '[Legacy corrected MAY26:%';

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
  '[Legacy corrected MAY26: tripKey=' || p.legacy_trip_key::text ||
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

-- Verification: expected 107 trips, 161 assignments, 191 driver-role rows, 1 waiting-list row.
select
  count(distinct t.id) as trips,
  count(distinct ta.id) as assignments,
  count(distinct td.id) as driver_assignments,
  count(distinct ta.id) filter (where ta.bus_id is null) as waiting_list_assignments
from public.trips t
left join public.trip_assignments ta on ta.trip_id = t.id
left join public.trip_drivers td on td.assignment_id = ta.id
where t.notes like '[Legacy corrected MAY26:%';
