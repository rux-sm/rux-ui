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
- Layout: Uses two header rows: Date ↔ Bus, then Destination + Customer ↔
  Role. Destination and Customer share one grid cell with a 4px internal gap;
  the customer appears as muted supporting text without creating a third row.
  Both metadata controls use the shared Info status badge with familiar icons, a
  tokenized 12% background tint, a solid semantic border, and the shared 44px
  module-button height. Ordinary badges remain 22px. The two header rows use
  an 8px gap. This preserves the solid accent treatment for the primary Accept
  action while keeping badge color behavior consistent with Success, Warning,
  and Danger badges across the application. Trip Type is intentionally omitted
  from the header and
  may be communicated in Notes when operationally useful. A quiet divider
  separates this summary from the response row. Pending assignments show only
  the equal-width `Not Available` and `Accept` actions. Every response control
  uses the shared standard button height, radius, padding, and type treatment
  in two exact 50/50 columns at every card width. Accepted
  assignments replace Accept with a green, non-interactive `Accepted` status
  control and use `Unable to Drive` for the exception action. Declined and
  changes-requested assignments use the same two-column contract: the status
  occupies the left half and `Accept` occupies the right half. The destination
  uses the shared `--rux-text-500` 24px typography token, remains on one line,
  and truncates safely with its complete value exposed as an accessible label
  and tooltip.
- Date behavior: Uses the complete operational range, such as
  `SUNDAY, JUL 26 – JUL 29`, as the card heading. One-day assignments render
  one date and cross-month or cross-year ranges retain the necessary context.
- Empty behavior: Displays `Bus Unassigned` when a bus is not assigned.
- Loading behavior: Disables the active action and shows `Accepting…` or
  `Declining…`; duplicate submission is prevented.
- Accessibility: Uses the card's `h2`, real action buttons, a polite status
  control for Accepted, inline `role="alert"` failures, and a page-level polite
  live region. Route cities retain their full accessible label when visually
  truncated.

## Reporting Details

- Purpose: Shows when and where the driver must report and identifies the
  primary trip contact.
- Required data: Spot Time, report address/location, or trip
  contact.
- Optional data: Coordinates and any one of the required fields.
- Visibility: When report-time, report-location, or trip-contact information
  exists.
- Primary actions: Navigate, Text, and Call when their corresponding data is
  available.
- Layout: Presents Spot Time first and the report address directly beneath it
  as one compact stack without redundant visible field labels. Customer is
  owned by the assignment header and is not repeated here. The 44×44 Navigate
  action is vertically centered at the right. Trip Contact appears as a second
  compact row inside the same connected card section.
- Empty behavior: Does not render when time, location, and contact are all
  unavailable.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses a semantic `time`, a semantic `address`, tabular
  numerals, an explicit accessible Spot Time or Report Time
  label, and a Navigate label containing the complete destination. Contact
  actions include the contact's name in their accessible labels.

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
- Layout: Renders one connected card section per bus without a redundant
  `Crew & Fleet` heading or large module icon. The current assignment is headed
  `Your Bus`; additional groups use `Bus 746`, `Bus 752`, and so on. Each
  section presents the crew member's name as primary text and their role on a
  smaller muted line. A shared 96px action rail holds the 44×44 Message and Call
  actions at the right. Phone numbers remain action destinations but are not
  repeated visually.
- Empty behavior: Does not render for a simple one-driver, one-bus assignment.
  Fleet entries without crew are omitted.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses nested lists, full message labels, and an
  `aria-expanded`/`aria-controls` disclosure after two populated buses.

## Trip Contact

- Purpose: Identifies the trip contact and provides direct contact actions.
- Required data: Contact name or phone.
- Optional data: Either field may appear independently.
- Visibility: When contact data exists.
- Primary actions: Text followed by Call, when the phone number and
  corresponding capability are available.
- Layout: Appears inside Reporting Details as a compact two-column row. The
  label, contact name, and 44×44 actions form one compact row. The stored phone
  number is not repeated visually because Text and Call expose the same
  destination. Call aligns at the right beside Text.
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
  and Envelope render as equal-width neutral actions in one 50/50 row. Amber is
  reserved for resources whose status is `required` or otherwise needs
  attention.
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
