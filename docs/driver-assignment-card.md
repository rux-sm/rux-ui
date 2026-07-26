# Driver Assignment Card

The public driver schedule uses one normalized assignment object and one
connected card surface. `driver-share.js` adapts Supabase trip records;
`driver-assignment-model.js` formats and selects modules; and
`driver-assignment-card.js` renders independently testable modules.

Modules never render empty headings or placeholder dividers. Critical alerts
are the only information allowed to move ahead of the normal workflow order.

## Assignment Header

- Purpose: Identifies the assignment and exposes its response state.
- Required data: Date, role, and assignment status.
- Optional data: Assigned bus and response callbacks.
- Visibility: Always.
- Primary action: Accept Assignment when pending.
- Empty behavior: Displays `Bus Unassigned` when a bus is not assigned.
- Loading behavior: Disables the active action and shows `Accepting…` or
  `Declining…`; duplicate submission is prevented.
- Accessibility: Uses the card's `h2`, visible status icon and text, real
  buttons, inline `role="alert"` failures, and a page-level polite live region.

## Critical Alerts

- Purpose: Shows safety-critical or departure-blocking information before trip
  details.
- Required data: At least one alert with `severity: "critical"`.
- Optional data: Alert description.
- Visibility: Before Trip when critical alerts exist.
- Primary action: None.
- Empty behavior: Does not render.
- Loading behavior: Rendered with the assignment after data normalization.
- Accessibility: Uses a semantic list, icon, severity text context, and does
  not rely on color alone.

## Trip Summary

- Purpose: Shows the customer, route, and trip type.
- Required data: A trip, customer, origin, or destination.
- Optional data: Customer and explicit trip type.
- Visibility: When any trip summary data exists.
- Primary action: None.
- Empty behavior: Missing endpoints fall back to `Pickup` or `Destination`.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Route text remains real text and may wrap at 200% zoom.

## Role

- Purpose: Explains the driver's responsibility and assigned bus.
- Required data: Role, bus, or role detail.
- Optional data: Takeover time/location, relieved driver, and instructions.
- Visibility: When any role-specific field exists.
- Primary action: None.
- Empty behavior: Omits unavailable detail labels.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Role details use a definition list; `Relief Driver` is never
  shortened in normal layouts.

## Spot Time

- Purpose: Shows when and where the driver must report.
- Required data: Spot time or spot location.
- Optional data: Location name and full address.
- Visibility: When time or location exists.
- Primary action: Navigate.
- Empty behavior: Renders whichever of time or location is available.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses `time` and `address`; the navigation label contains the
  complete destination.

## Crew & Fleet

- Purpose: Coordinates assignments involving multiple buses or crew members.
- Required data: More than one fleet assignment or more than one external crew
  member.
- Optional data: Phone/message capability and current-bus identity.
- Visibility: Based on the normalized fleet and crew counts.
- Primary action: Message, only when a phone number is available.
- Empty behavior: Does not render for a simple one-driver, one-bus assignment.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses nested lists, full message labels, `Your Bus` text, and
  an `aria-expanded`/`aria-controls` disclosure after two buses.

## Trip Contact

- Purpose: Shows the trip contact and phone number.
- Required data: Contact name or phone.
- Optional data: Either field may appear independently.
- Visibility: When contact data exists.
- Primary action: Call.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses a `tel:` link and includes the contact's name in the
  accessible call label.

## Alerts

- Purpose: Shows warning and informational requirements as individual rows.
- Required data: At least one non-critical alert.
- Optional data: Description.
- Visibility: After Trip Contact when warning or informational alerts exist.
- Primary action: None.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses a semantic list plus distinct icons and text.

## Documents

- Purpose: Opens trip resources such as itineraries, envelopes, rosters, and
  permits.
- Required data: At least one normalized document or generated trip resource.
- Optional data: URL, status, and an application callback.
- Visibility: When resources exist.
- Primary action: Open the selected resource.
- Empty behavior: Does not render. Unavailable resources render as
  non-clickable items with availability text.
- Loading behavior: Document availability is resolved with the assignment.
- Accessibility: Uses buttons or links, visible names/statuses, and full
  keyboard focus treatment.

## Notes

- Purpose: Shows meaningful trip-wide notes.
- Required data: Non-whitespace notes.
- Optional data: Long-note disclosure.
- Visibility: When notes contain text.
- Primary action: View Full Notes when the note exceeds 240 characters.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Preserves whitespace and exposes disclosure state with
  `aria-expanded` and `aria-controls`.

## Extension Contract

Future modules should call the shared `createAssignmentModule` anatomy:

```text
Icon + Label | Flexible Content | Optional Action
```

Each module must provide a stable key, icon, label, tone, content node, and
optional action. Its visibility rule belongs in `visibleAssignmentModules`, so
selection stays separate from rendering and remains directly testable.
