# Driver Assignment Card

The public driver schedule uses one normalized assignment object and one
connected card surface. `driver-share.js` adapts Supabase trip records;
`driver-assignment-model.js` formats and selects modules; and
`driver-assignment-card.js` renders independently testable modules.

Modules never render empty headings or placeholder dividers. The stable
workflow order is Trip Overview, Alerts, special Role detail, Crew, Contact,
Documents, and Notes.

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

- Anatomy: Icon above a centered label.
- Footprint: All variants are 112px wide with an 88px minimum height.
- Variants: `--neutral`, `--info`, `--success`, `--warning`, and `--danger`.
- Semantics: Use an `a` for navigation, telephone, or messaging destinations;
  use a `button` for in-application actions.
- Accessibility: Supply an accessible name that includes the action target
  when the visible label alone is not sufficient. All states retain a visible
  focus indicator and a touch target larger than 44px.
- Empty behavior: Do not render a module action when it cannot be performed.

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

## Trip Overview

- Purpose: Gives the complete departure briefing in the card's highest
  priority content area.
- Required data: Any trip-summary, spot-time, or spot-location field.
- Optional data: Customer, route, trip type, location name, full address, and
  coordinates.
- Visibility: When either trip or report information exists.
- Primary action: Navigate to the report location.
- Empty behavior: Trip and departure subsections render independently; the
  internal divider appears only when both exist.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Route text remains real text and may wrap at 200% zoom. Spot
  time uses `time`, location uses `address`, and Navigate includes the complete
  destination in its accessible name.

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
- Optional data: Phone/message capability and current-bus identity.
- Visibility: Based on the normalized fleet and crew counts.
- Primary action: Message, only when a phone number is available.
- Empty behavior: Does not render for a simple one-driver, one-bus assignment.
  A single-bus assignment uses a people-first `Crew` view and describes roles
  relative to “your bus” without repeating the bus number. Multiple buses use
  bus-grouped `Crew & Fleet`.
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

- Purpose: Shows preparation, warning, informational, and departure-blocking
  requirements directly after Trip Overview.
- Required data: At least one alert.
- Optional data: Description.
- Visibility: Immediately after Trip Overview when alerts exist.
- Primary action: None.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Uses a semantic list plus distinct icons and text. Critical,
  warning, and informational rows retain their own icon and tone; the module
  adopts the highest contained severity without relying on color alone.

## Documents

- Purpose: Opens the two driver-facing trip resources: Itinerary and Envelope.
- Required data: An itinerary document or generated trip envelope.
- Optional data: URL, status, and an application callback.
- Visibility: When resources exist.
- Primary action: Open the selected resource.
- Empty behavior: Does not render. Unavailable resources render as
  non-clickable items with availability text. Purchase orders and unrelated
  operational attachments are excluded before rendering.
- Loading behavior: Document availability is resolved with the assignment.
- Accessibility: Uses buttons or links, visible names/statuses, normal
  secondary contrast for available resources, disabled contrast only for
  unavailable resources, and full keyboard focus treatment.

## Notes

- Purpose: Shows meaningful trip-wide notes.
- Required data: Non-whitespace notes.
- Optional data: Long-note disclosure.
- Visibility: When notes contain text.
- Primary action: View Full Notes when the note exceeds 240 characters.
- Empty behavior: Does not render.
- Loading behavior: Covered by the assignment skeleton.
- Accessibility: Preserves whitespace, lightly normalizes short all-lowercase
  operational notes for presentation, uses a subtle non-alert inset surface,
  and exposes disclosure state with `aria-expanded` and `aria-controls`.

## Extension Contract

Future modules should call the shared `createAssignmentModule` anatomy:

```text
Icon + Label | Flexible Content | Optional Action
```

Each module must provide a stable key, icon, label, tone, content node, and
optional action. Its visibility rule belongs in `visibleAssignmentModules`, so
selection stays separate from rendering and remains directly testable.
