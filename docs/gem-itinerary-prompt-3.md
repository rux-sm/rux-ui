# Gemini Itinerary Prompt 3 — Generate Print-Ready HTML

You are an expert front-end developer. Your task is to process the enriched itinerary JSON provided below and output a highly compact, print-ready HTML file designed to minimize paper usage while maintaining perfect legibility for a driver.

## Input Data

```
[INSERT YOUR ENRICHED JSON OUTPUT FROM STEP 2 HERE]
```

## Execution Rules & Design Requirements

1. **Document Structure:**
   - Create a standalone HTML document using the EXACT compact CSS/HTML template provided below. Do not alter the `<style>` block.
   - Output ONLY valid HTML wrapped in an ```html ``` code block.

2. **Data Population:**
   - Header: Map the `trip_date`, `contact_name`, and `contact_phone` to the header placeholders.
   - Table Rows: Generate one `<tr>` for every stop in the chronological sequence.
   - Times: Convert arrival/departure times to 12-hour AM/PM format. Place them in the `.time` column.
   - Location: Place the location name and the calculated leg distance (e.g., "37.7 mi") in the `.loc` column.
   - Address & Activity: Place the `address` in the `.addr` column and `activity` in the `.act` column.

3. **Smart Warnings (Crucial):**
   - Check the `schedule_risk_flag` for each leg.
   - If `true`, inject a distinct warning alert `<div>` directly inside the `.loc` cell for that specific row. Format: `<div class="alert"><strong>Warning ALERT:</strong> [risk_explanation] <strong>Required Dep: [required_departure_time]</strong></div>`

4. **Footer Totals:**
   - Extract `total_miles`, `total_driving_time`, and `total_on_duty_time` from the `trip_totals` object in the JSON and populate the `.total` block at the bottom of the table.

## Base HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 0.4in; size: Letter; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; margin: 0; }
    .header { border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 5px; display: flex; justify-content: space-between; align-items: baseline; }
    h1 { font-size: 14pt; margin: 0; text-transform: uppercase; }
    .meta { font-size: 10pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border-bottom: 1px solid #ccc; padding: 6px 4px; vertical-align: top; page-break-inside: avoid; }
    th { text-align: left; background: #eee; font-size: 9pt; font-weight: bold; }
    .time { width: 18%; font-weight: bold; white-space: nowrap; }
    .loc { width: 32%; font-weight: bold; font-size: 10pt; }
    .mi { font-size: 8pt; color: #444; font-weight: normal; margin-top: 2px; display: block; }
    .addr { width: 25%; font-size: 8pt; color: #333; }
    .act { width: 25%; font-size: 8pt; }
    .alert { background: #fff3cd; border-left: 3px solid #ffc107; color: #856404; padding: 4px; font-size: 8pt; margin-top: 4px; font-weight: normal; }
    .total { text-align: right; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; padding-top: 5px; margin-top: 15px; }
</style>
</head>
<body>
    <div class="header">
        <h1>Trip Itinerary</h1>
        <div class="meta">Date: [TRIP_DATE] | Contact: [CONTACT_NAME] - [CONTACT_PHONE]</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Time (Arrv/Dept)</th>
                <th>Location & Alerts</th>
                <th>Address</th>
                <th>Activity</th>
            </tr>
        </thead>
        <tbody>
            <!-- Inject <tr> rows here -->
        </tbody>
    </table>
    <div class="total">
        Total Trip Distance: [trip_totals.total_miles] mi<br>
        Total Driving Time: [trip_totals.total_driving_time]<br>
        Total On-Duty Time: [trip_totals.total_on_duty_time]
    </div>
</body>
</html>
```
