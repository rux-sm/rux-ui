# Driver Assignment Card

The public driver schedule uses one normalized assignment object and one
connected card surface. `driver-share.js` adapts Supabase trip records;
`driver-assignment-model.js` formats and selects modules; and
`driver-assignment-card.js` renders independently testable modules.

Modules never render empty headings or placeholder dividers. The stable
workflow order is Assignment Summary, Spot Time & Location, Trip Contact,
special Role detail, Crew, Notes, and Documents.

## Module Button Primitive

Contextual module actions use the generic `.rux-module-button` primitive.
Assignment cards add `.assignment-module__action` only as a layout hook.

```html
<a
  class="rux-module-button rux-module-button--info"
  href="..."
>
  <span class="rux-icon" aria-hidden="true">navigation</span>
  <span>Navigate</span>
</a>
```

- Anatomy: Centered icon with a visually hidden accessible label.
- Footprint: All variants are exactly 44×44px.
- Variants: `--neutral`, `--info`, `--success`, `--warning`, and `--danger`.
- Semantics: Use an `a` for navigation, telephone, or messaging destinations;
  use a `button` for in-application actions.
- Accessibility: Supply an accessible name that includes the action target.
  All states retain a visible focus indicator and a 44×44px touch target.
- Empty behavior: Do not render a module action when it cannot be performed.

## Assignment Header

- Purpose: Identifies the assignment and exposes its response state.
- Required data: Date, role, and assignment status.
- Optional data: Assigned bus and response callbacks.
- Visibility: Always.
- Primary action: Accept when pending.
- Layout: Places the complete date range at the upper left and a prominent
  blue `Bus 763` badge at the upper right. `Donna, TX → Austin, TX` follows on
  its own row, with trip type and role badges beneath it. Response status and
  equal-width pending actions complete the section. Date, bus, route, and
  Spot Time share a compact 24px primary scale.
- Date behavior: Uses the complete operational range, such as
  `SUNDAY, JUL 26 – JUL 29`, as the card heading. One-day assignments render
  one date and cross-month or cross-year ranges retain the necessary context.
- Empty behavior: Reporting details display `Bus Unassigned` when a bus is not
  assigned.
- Loading behavior: Disables the active action and shows `Accepting…` or
  `Declining…`; duplicate submission is prevented.
- Accessibility: Uses the card's `h2`, visible status icon and text, real
  buttons, inline `role="alert"` failures, and a page-level polite live region.
  Route cities remain real text and can wrap at 200% zoom.

## Spot Time & Location

- Purpose: Shows when and where the driver must report.
- Required data: Spot Time, customer/location name, or report address.
- Optional data: Coordinates and any one of the required fields.
- Visibility: When report-time or report-location information exists.
- Primary action: Navigate.
- Layout: Places Spot Time immediately before Spot Location. Location name and
  address occupy separate lines; the 44×44 Navigate action aligns at the right
  of the combined block.
- Empty behavior: Does not render when neither time nor location exists.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses semantic `time` and `address` elements, tabular numerals,
  and a Navigate label containing the complete destination.

## Role

- Purpose: Explains exceptional responsibility or a relief handoff without
  repeating the role badge in the header.
- Required data: Relief Driver role or operational handoff/instruction detail.
- Optional data: Takeover time/location, relieved driver, and instructions.
- Visibility: For relief assignments or when takeover time/location, relieved
  driver, or special role instructions exist.
- Primary action: None.
- Empty behavior: Ordinary Driver assignments do not render this module.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Responsibility and handoff details remain plain readable
  text; `Relief Driver` is never shortened in normal layouts.

## Crew & Fleet

- Purpose: Coordinates assignments involving multiple buses or crew members.
- Required data: More than one fleet assignment or at least one external crew
  member.
- Optional data: Phone, messaging/calling capabilities, and current-bus identity.
- Visibility: Based on the normalized fleet and crew counts.
- Primary actions: Message followed by Call, when a phone number is available
  and the corresponding capability is enabled.
- Layout: Uses contextual groups without a visible `Crew & Fleet` heading,
  large module icon, or header divider. Current-bus companions are headed by
  their role, followed by name and phone on separate lines. Additional buses
  are headed by `Bus 746` and list each person as `James Cole (Driver)` with
  their phone beneath. Role and bus headings use the shared module-label
  typography. The 44×44 Message and Call actions remain at the right; Call
  always follows Message.
- Empty behavior: Does not render for a simple one-driver, one-bus assignment.
  Fleet entries without crew are omitted.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses nested lists, full message labels, and an
  `aria-expanded`/`aria-controls` disclosure after two populated buses.

## Trip Contact

- Purpose: Shows the trip contact and phone number.
- Required data: Contact name or phone.
- Optional data: Either field may appear independently.
- Visibility: When contact data exists.
- Primary actions: Text followed by Call, when the phone number and
  corresponding capability are available.
- Layout: Follows Spot Location as a compact two-column row. The label, contact
  name, and phone number occupy separate lines; the 44×44 Call action aligns
  at the right beside Text. It does not use a large module icon or internal
  divider. Compact operational modules use 12px from label to primary content
  and 8px from primary to secondary content.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses dedicated `sms:` and `tel:` action links and includes the
  contact's name in each accessible label.

## Documents

- Purpose: Opens the two driver-facing trip resources: Itinerary and Envelope.
- Required data: An itinerary document or generated trip envelope.
- Optional data: URL, status, and an application callback.
- Visibility: When resources exist.
- Primary action: Open the selected resource.
- Layout: The final card section has no visible Documents heading. Itinerary
  and Envelope render as equal-width warning-tone actions in one 50/50 row.
- Empty behavior: Does not render. Unavailable resources render as
  non-clickable items. Purchase orders and unrelated
  operational attachments are excluded before rendering.
- Loading behavior: Document availability is resolved with the assignment.
- Accessibility: The section keeps an accessible name, uses buttons or links,
  exposes availability details as a title when supplied, reserves disabled
  contrast for unavailable resources, and retains full keyboard focus treatment.

## Notes

- Purpose: Shows meaningful trip-wide notes.
- Required data: Non-whitespace notes.
- Optional data: Long-note disclosure.
- Visibility: When notes contain text.
- Primary action: View Full Notes when the note exceeds 240 characters.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Preserves whitespace, lightly normalizes short all-lowercase
  operational notes for presentation, uses plain label-and-text formatting,
  and exposes disclosure state with `aria-expanded` and `aria-controls`.

## Extension Contract

Future modules should call the shared `createAssignmentModule` anatomy:

```text
Icon + Label | Flexible Content | Optional Action
```

Each module must provide a stable key, icon, label, tone, content node, and
optional action. Its visibility rule belongs in `visibleAssignmentModules`, so
selection stays separate from rendering and remains directly testable.
