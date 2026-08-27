-- The CHECK constraint on trips.trip_bar_color still carried the pre-step-17
-- color names (orange, cyan, yellow). Step 17 (js/core/trip-colors.js) renamed
-- cyan → teal, yellow → amber, and retired orange, but the database constraint
-- was never updated — so saving a trip with any new name (amber, teal) fails
-- with: "new row for relation trips violates check constraint
-- trips_trip_bar_color_check".
--
-- Existing rows keep their stored values; normalizeTripColor() maps them at
-- read time, so no data migration is needed. The constraint must allow both
-- the current names AND the retired ones that existing rows still hold.

ALTER TABLE trips
  DROP CONSTRAINT trips_trip_bar_color_check;

ALTER TABLE trips
  ADD CONSTRAINT trips_trip_bar_color_check
    CHECK (trip_bar_color IS NULL OR trip_bar_color IN
      ('teal', 'green', 'purple', 'amber', 'pink',
       'orange', 'cyan', 'yellow'));
