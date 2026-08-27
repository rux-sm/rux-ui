# Itinerary Prompt 2 — Route the Legs, Time the Yard, Flag the Risk

Model-agnostic. Step 2 of 3 — see [`gem-itinerary-prompt-1.md`](./gem-itinerary-prompt-1.md).

**This step requires a real routing tool.** It exists to attach measured mileage
and drive times to the stop list from step 1, and to derive the yard times from
them. It does not guess, and if it cannot measure, it stops.

> **When the trip is already in the app, skip this step.** The app routes every
> leg through the Mapbox Directions API and records whether each number was
> measured or entered by hand
> ([`js/components/itinerary.js`](../js/components/itinerary.js)). Measured beats
> asked-for. This prompt is for trips that are not in the app yet.

---

## Routing tool — required

Before anything else, determine whether this environment has a routing tool:

- **Gemini** — the `@Google Maps` extension.
- **An assistant with shell or HTTP access** — the Mapbox Directions API
  (`https://api.mapbox.com/directions/v5/mapbox/driving/{lng},{lat};{lng},{lat}`)
  or the Google Directions API. The app's Mapbox token is in its Settings panel.
- **Anything else** — none.

If no routing tool is available, output exactly this and stop:

```
ROUTING UNAVAILABLE — no routing tool in this environment. Mileage and drive
times were not calculated. Re-run step 2 where a routing tool is available, or
enter the trip in the app and let it route the legs.
```

Do not estimate, approximate, or fall back on general knowledge of the distance
between two cities. A plausible number on a printed driver sheet is worse than a
missing one, because nobody checks it.

## Constants

| Constant | Value | Meaning |
|---|---|---|
| `SPOT_PADDING` | 15 min | Bus staged and ready before scheduled passenger departure |
| `PRE_TRIP` | 15 min | Driver's pre-trip inspection at the yard, before wheels roll |
| `TRAFFIC_BUFFER` | 15% | Congestion allowance on measured drive time |
| `RISK_MARGIN` | 5 min | Slack below which a leg is flagged |

## Time arithmetic

Every time in the input carries a day offset. Convert each one to absolute
minutes before comparing anything:

```
offset(stop, "arrival_time")   = stop.day_offset
offset(stop, "departure_time") = stop.departure_day_offset ?? stop.day_offset

abs(stop, field) = offset(stop, field) * 1440 + HH * 60 + MM
```

A stop that spans midnight — an overnight hotel — carries
`departure_day_offset`. Using the stop's `day_offset` for its departure there
under-counts the trip by a full day.

Do all subtraction on those absolute minutes, then convert back to `HH:MM` plus a
`day_offset`. **Never subtract two `HH:MM` strings directly** — an overnight leg
produces a negative gap and every risk flag after it is wrong.

## Execution

1. **Measure each leg.** Leg `n` runs from stop `n` to stop `n+1`. For each leg,
   use the routing tool to get real driving distance in miles
   (`distance_miles`, one decimal) and drive time in minutes
   (`base_drive_time_mins`).

   Then `traffic_drive_time_mins = ceil(base_drive_time_mins * 1.15)`.

   If a stop's `address_confidence` is `partial` or `source_text`, still route
   it, but set `address_uncertain: true` on both legs touching that stop. Step 3
   marks those rows so the dispatcher knows which numbers rest on a guess.

2. **Derive the yard times.** Let the first `pickup` stop's ready time be its
   `departure_time` minus `SPOT_PADDING`, or its `arrival_time` if no departure
   time was stated.

   ```
   spot_time         = pickup ready time
   wheels_roll_time  = spot_time − traffic_drive_time_mins(leg 1)
   yard_report_time  = wheels_roll_time − PRE_TRIP
   yard_return_time  = final passenger stop's departure (or arrival, if it is
                       the last stated time) + traffic_drive_time_mins(final leg)
   ```

   `yard_report_time` is when the driver goes on duty and starts the pre-trip.
   `wheels_roll_time` is when the bus leaves the yard. They are different times
   and the driver needs both.

   If step 1 recorded a `stated_departure_time` on the yard origin, compare it to
   `wheels_roll_time`. If they differ by more than 10 minutes, add a
   `schedule_notes` entry saying so and give both values. The customer was told
   something; the dispatcher should know it disagrees.

3. **Flag the tight legs.** For each leg where both endpoint times were stated in
   the source:

   ```
   scheduled_gap_mins = abs(stop n+1, arrival_time) − abs(stop n, departure_time)
   ```

   If `scheduled_gap_mins − traffic_drive_time_mins < RISK_MARGIN`, set
   `schedule_risk_flag: true`, write a one-sentence `risk_explanation`, and
   compute `required_departure_time` — the latest the bus can leave stop `n` and
   still arrive on time.

   **Leg 1 and the final leg are never flagged.** Their yard endpoints were
   derived in step 2, not scheduled by the customer, so a gap check there only
   measures your own arithmetic.

4. **Total the trip.**

   ```
   total_miles        = sum of distance_miles
   total_driving_mins = sum of traffic_drive_time_mins
   ```

5. **Split the trip into duty days and check the hours.**

   Hours of service are counted per duty day, never across the whole trip. A
   two-day charter with a hotel night in the middle is two duty periods, and
   measuring from yard report to yard return would bill the driver's sleep as
   on-duty time and make every check meaningless.

   Group the stops by day offset. For each day that has any activity:

   ```
   on_duty_start = earliest time on that day
                   (day 0 starts at yard_report_time)
   on_duty_end   = latest time on that day
                   (the final day ends at yard_return_time)
   on_duty_mins  = on_duty_end − on_duty_start
   driving_mins  = sum of traffic_drive_time_mins for legs arriving that day
   ```

   Then apply the FMCSA **passenger-carrying** limits to each duty day
   separately, and record what trips:

   - `driving_mins > 600` (10-hour driving limit) → `hos_flags` entry.
   - `on_duty_mins > 900` (15-hour on-duty window) → `hos_flags` entry.

   Each entry names the day, the limit, the actual figure, and the overage.

   This is an advisory check on one trip's schedule, not a compliance
   determination — it knows nothing about the driver's preceding 7 days, their
   last 8 consecutive hours off, or whether a second driver is assigned. Say so
   in the entry. A flagged day usually means the trip needs a relief driver or an
   earlier start, and that is a dispatcher's call.

## Output

Return **the entire step-1 object unchanged**, plus the keys this step adds:
`legs`, `computed`, `duty_days`, `trip_totals`, `schedule_notes`, and
`hos_flags`. Step 3 needs the stop addresses, activities, contact, and date, and
this is the only place they can come from.

Output the JSON object and nothing else — no commentary before or after. A
```json fence is fine.

```json
{
  "schema_version": 1,
  "trip_date": "…",
  "client": "…",
  "contact_name": "…",
  "contact_phone": "…",
  "stops": [ "… every stop from step 1, unchanged …" ],
  "data_flags": [ "… from step 1, unchanged …" ],

  "legs": [
    {
      "leg_number": 1,
      "from_seq": 1,
      "to_seq": 2,
      "distance_miles": 0.0,
      "base_drive_time_mins": 0,
      "traffic_drive_time_mins": 0,
      "scheduled_gap_mins": null,
      "schedule_risk_flag": false,
      "risk_explanation": "",
      "required_departure_time": null,
      "address_uncertain": false
    }
  ],

  "computed": {
    "yard_report_time": "HH:MM",
    "yard_report_day_offset": 0,
    "wheels_roll_time": "HH:MM",
    "wheels_roll_day_offset": 0,
    "spot_time": "HH:MM",
    "spot_day_offset": 0,
    "yard_return_time": "HH:MM",
    "yard_return_day_offset": 0
  },

  "duty_days": [
    {
      "day_offset": 0,
      "date": "YYYY-MM-DD",
      "on_duty_start": "HH:MM",
      "on_duty_end": "HH:MM",
      "on_duty_time": "X hours Y minutes",
      "driving_time": "X hours Y minutes"
    }
  ],

  "trip_totals": {
    "total_miles": 0.0,
    "total_driving_time": "X hours Y minutes",
    "routing_source": "Google Maps | Mapbox Directions"
  },

  "schedule_notes": [],
  "hos_flags": []
}
```

Set `scheduled_gap_mins`, `required_departure_time`, and `risk_explanation` to
`null` / `""` on legs where no check applies. Record which routing tool you
actually used in `routing_source` — step 3 prints it on the sheet.

---

## Input

<itinerary_json>
[PASTE THE JSON OUTPUT FROM STEP 1 HERE]
</itinerary_json>
