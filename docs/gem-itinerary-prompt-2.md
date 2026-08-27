# Gemini Itinerary Prompt 2 — Calculate Routing, Buffers & Risk

You are an expert logistics routing engine and schedule validator. Your task is to process the structured itinerary JSON provided below, determine precise routing metrics, and calculate schedule viability.

## Input Data

```
[INSERT YOUR JSON OUTPUT FROM STEP 1 HERE]
```

## Execution Rules

1. **Calculate Leg Metrics (STRICT ANTI-HALLUCINATION RULE):**
   - You MUST use the **@Google Maps** tool to find the exact real-world driving distance in miles (`distance_miles`) and standard driving time in minutes (`base_drive_time_mins`) between each sequential stop (Yard Origin -> Customer Pickup -> Intermediate Stops -> Customer Dropoff -> Yard Return).
   - NEVER guess, estimate, or rely on internal knowledge for mileage or drive times.
   - Calculate a separate `traffic_drive_time_mins` by adding a 15% conservative congestion buffer to the base time you retrieved. Round up to the nearest minute.

2. **Deadhead & Buffer Logic:**
   - **Yard Departure:** Calculate the exact `calculated_yard_departure_time` by subtracting the `traffic_drive_time_mins` PLUS a 15-minute pre-trip inspection buffer from the Customer Pickup arrival time.
   - **Yard Return:** Calculate the `calculated_yard_return_time` by adding the `traffic_drive_time_mins` to the Customer Dropoff departure time.

3. **Schedule Validation (Smart Warnings):**
   - For every leg, calculate the `scheduled_time_gap_mins` (the time between departure from Stop A and scheduled arrival at Stop B).
   - Compare `traffic_drive_time_mins` to `scheduled_time_gap_mins`.
   - If the traffic-adjusted drive time leaves less than a 5-minute buffer, set `schedule_risk_flag` to `true`.
   - If `true`, write a concise `risk_explanation` and calculate the true `required_departure_time` the driver must hit to avoid being late.

4. **Calculate Trip Totals:**
   Sum the `traffic_drive_time_mins` across all legs for "total_driving_time". Calculate "total_on_duty_time" based on the duration from `calculated_yard_departure_time` to `calculated_yard_return_time`.

## Output Requirements

Output ONLY a raw, valid JSON block containing a `calculated_legs` array and a `trip_totals` object. Do not include markdown formatting or conversational text outside the JSON block.

```json
{
  "calculated_legs": [
    {
      "leg_number": 1,
      "start_location": "Bus Yard",
      "end_location": "Customer Pickup",
      "distance_miles": 0.0,
      "base_drive_time_mins": 0,
      "traffic_drive_time_mins": 0,
      "scheduled_time_gap_mins": 0,
      "required_departure_time": "HH:MM",
      "schedule_risk_flag": false,
      "risk_explanation": ""
    }
  ],
  "trip_totals": {
    "total_miles": 0.0,
    "total_driving_time": "X hours Y minutes",
    "total_on_duty_time": "X hours Y minutes"
  }
}
```
