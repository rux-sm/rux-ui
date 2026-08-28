# Itinerary Prompt 3 — Generate the Print-Ready Driver Sheet

> **Superseded.** The itinerary workflow is now one prompt,
> [`itinerary-prompt.md`](./itinerary-prompt.md), emitting Trip Draft v3
> ([`trip-import-schema-v3.json`](./trip-import-schema-v3.json)) — the format the app
> actually imports. This step becomes an in-app print view built on `--rux-*` tokens, as its own note below anticipated.
> Kept for reference; do not run this chain.

Model-agnostic. Step 3 of 3 — see [`gem-itinerary-prompt-2.md`](./gem-itinerary-prompt-2.md).

Turns the enriched JSON into one standalone HTML file, compact enough to stay on
a single sheet for most trips and legible enough to read at a wheel.

This sheet is a standalone print artifact and deliberately does **not** use the
app's design system — it must render identically from any browser's print dialog
with no stylesheet load. If it ever moves into the app, it gets rebuilt on
`--rux-*` tokens.

---

## Role

You are a front-end developer. Populate the template below from the input JSON
and output the finished HTML.

## Rules

1. **Use the template exactly.** Do not alter the `<style>` block, add
   frameworks, or link external assets. The sheet must print correctly offline,
   and it pins itself to a white background so it stays readable on a phone in
   dark mode — a driver reads this on screen as often as on paper.

2. **One row per stop**, in `seq` order.

   - `.time` — arrival above departure, 12-hour with AM/PM. Show only the times
     that exist; a stop with one time gets one line. Label them `Arr` and `Dep`.
   - `.loc` — `location_name`, with the **inbound** leg's distance beneath it in
     a `<span class="mi">` (e.g. `37.7 mi · 44 min`). The inbound leg is the one
     ending at this stop, so the first stop has no distance line. When that leg's
     `address_uncertain` is `true`, append ` · est. from unverified address` to
     the same line — the mileage is the number that rests on the guess.
   - `.addr` — `address`. If the stop's `address_confidence` is `partial` or
     `source_text`, append `<span class="uncertain">unverified</span>`. The
     dispatcher needs to see which addresses the mileage rests on.
   - `.act` — `activity`, or empty.

3. **The yard rows carry the times the driver actually needs.**

   - The `yard_origin` row's `.time` cell shows `computed.yard_report_time`
     labeled `Report`, and `computed.wheels_roll_time` labeled `Roll`.
   - The first `pickup` row shows `computed.spot_time` labeled `Spot` above its
     own `Dep`.
   - The `yard_return` row's `.time` cell shows `computed.yard_return_time`
     labeled `Arr`.

4. **Print the dates.** Track the running day as you emit rows: a stop's
   `day_offset` is its arrival day, and its departure day is
   `departure_day_offset` when present. Whenever the day advances, insert a
   day-divider row before the next row, spanning all four columns:

   ```html
   <tr class="dayrow"><td colspan="4">Day 2 — Tuesday, July 28</td></tr>
   ```

   Resolve the date by adding the offset to `trip_date`. A single-day trip gets
   no divider rows at all — the date is already in the header.

   A stop with a `departure_day_offset` — the overnight — keeps both its times in
   one row, and the divider for the new day goes **after** that row. Label its
   departure `Dep` as usual; the divider immediately above the next stop tells
   the driver which day it is.

5. **Risk alerts.** For each leg with `schedule_risk_flag: true`, inject this
   into the `.loc` cell of the leg's **destination** row:

   ```html
   <div class="alert"><strong>TIGHT:</strong> [risk_explanation] <strong>Depart by [required_departure_time]</strong></div>
   ```

6. **Footer.** Populate `.total` from `trip_totals`, including the
   `routing_source` line. Then add one on-duty line per entry in `duty_days` —
   a single-day trip gets one unlabelled line, a multi-day trip gets one per day
   labelled `Day 1`, `Day 2`, and so on. Hours of service are counted per day,
   so a single trip-wide on-duty figure would be wrong.

   Then, only if the corresponding array is non-empty, emit the `.notes` block
   with:

   - `hos_flags` in a `<div class="hos">` — these are the ones that stop a trip.
   - `schedule_notes` and `data_flags` as plain list items under `.notes`.

   Omit any of those that are empty. Never print an empty heading.

7. **Output only the HTML**, wrapped in one ```html fence. No commentary.

## Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Trip Itinerary</title>
<style>
    @page { margin: 0.4in; size: Letter; }
    :root { color-scheme: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; background: #fff; margin: 0; padding: 0.4in; }
    @media print { body { padding: 0; } }
    .header { border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 5px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    h1 { font-size: 14pt; margin: 0; text-transform: uppercase; white-space: nowrap; }
    .meta { font-size: 10pt; font-weight: bold; text-align: right; }
    .client { font-size: 9pt; font-weight: normal; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border-bottom: 1px solid #ccc; padding: 6px 4px; vertical-align: top; page-break-inside: avoid; }
    th { text-align: left; background: #eee; font-size: 9pt; font-weight: bold; }
    .time { width: 16%; font-weight: bold; white-space: nowrap; }
    .time .lbl { font-weight: normal; color: #555; font-size: 8pt; }
    .loc { width: 30%; font-weight: bold; font-size: 10pt; }
    .mi { font-size: 8pt; color: #444; font-weight: normal; margin-top: 2px; display: block; }
    .addr { width: 28%; font-size: 8pt; color: #333; }
    .act { width: 26%; font-size: 8pt; }
    .uncertain { display: inline-block; margin-left: 4px; padding: 0 3px; border: 1px solid #999; border-radius: 2px; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.03em; color: #555; }
    .dayrow td { background: #000; color: #fff; font-weight: bold; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px; }
    .alert { background: #fff3cd; border-left: 3px solid #ffc107; color: #856404; padding: 4px; font-size: 8pt; margin-top: 4px; font-weight: normal; }
    .total { text-align: right; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; padding-top: 5px; margin-top: 15px; }
    .total .src { display: block; font-size: 8pt; font-weight: normal; color: #444; margin-top: 3px; }
    .notes { margin-top: 12px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 8pt; page-break-inside: avoid; }
    .notes h2 { font-size: 9pt; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .notes ul { margin: 0 0 8px; padding-left: 16px; }
    .hos { background: #f8d7da; border-left: 3px solid #dc3545; color: #721c24; padding: 5px; margin-bottom: 8px; font-weight: bold; }
</style>
</head>
<body>
    <div class="header">
        <h1>Trip Itinerary</h1>
        <div class="meta">
            [TRIP_DATE] &nbsp;|&nbsp; [CONTACT_NAME] — [CONTACT_PHONE]
            <div class="client">[CLIENT]</div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Time</th>
                <th>Location &amp; Alerts</th>
                <th>Address</th>
                <th>Activity</th>
            </tr>
        </thead>
        <tbody>
            <!-- Inject stop rows and day dividers here -->
        </tbody>
    </table>
    <div class="total">
        Total Distance: [total_miles] mi<br>
        Total Driving Time: [total_driving_time]<br>
        On Duty — [duty_days entries, one line each]
        <span class="src">Routing: [routing_source]</span>
    </div>
    <!-- Emit .notes only if hos_flags, schedule_notes, or data_flags is non-empty -->
    <div class="notes">
        <div class="hos">[hos_flags entries]</div>
        <h2>Schedule Notes</h2>
        <ul><li>[schedule_notes entries]</li></ul>
        <h2>Source Flags</h2>
        <ul><li>[data_flags entries]</li></ul>
    </div>
</body>
</html>
```

### Row example

```html
<tr>
    <td class="time"><span class="lbl">Arr</span> 10:00 AM<br><span class="lbl">Dep</span> 2:30 PM</td>
    <td class="loc">UFCU Disch-Falk Field<span class="mi">242.7 mi · 3 hr 48 min</span></td>
    <td class="addr">1300 E Martin Luther King Jr Blvd, Austin, TX 78702</td>
    <td class="act">Tournament game</td>
</tr>
```

---

## Input

<itinerary_json>
[PASTE THE JSON OUTPUT FROM STEP 2 HERE]
</itinerary_json>
