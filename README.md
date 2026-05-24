
# CEvent Planner — Obsidian Plugin

> A powerful, in-note event planner and calendar dashboard for Obsidian. Write events in plain Markdown, visualize them in a beautiful calendar, and never miss a deadline with built-in alarms.

---

## Table of Contents

- [What Is CEvent Planner?](#what-is-cevent-planner)
- [Features](#features)
- [Installation](#installation)
- [How to Use It](#how-to-use-it)
  - [Writing Events in Markdown](#writing-events-in-markdown)
  - [Embedding the Dashboard](#embedding-the-dashboard)
  - [Event Attributes Reference](#event-attributes-reference)
  - [Event Statuses](#event-statuses)
  - [Recurring Events](#recurring-events)
  - [Views Explained](#views-explained)
- [Example Events](#example-events)
- [Real-World Use Cases](#real-world-use-cases)
- [Settings & Configuration](#settings--configuration)
- [Benefits](#benefits)
- [Tips & Best Practices](#tips--best-practices)

---

## What Is CEvent Planner?

**CEvent Planner** is an Obsidian plugin that turns your everyday Markdown notes into a full-featured event and task management system. Instead of relying on external apps, you write structured task entries directly in your `.md` files — and the plugin automatically scans your entire vault, collects all events, and displays them in an interactive **Calendar**, **List**, or **All Tasks** dashboard.

There is no separate database. Your notes *are* the database. Events are written as standard Markdown checklist items with optional attribute lines, keeping everything plain-text, portable, and future-proof.

---

## Features

- **Three Dashboard Views** — Calendar, Day List (with Time View), and All Tasks across your whole vault.
- **Vault-Wide Scanning** — The plugin reads every `.md` file in your vault and surfaces events from all of them automatically.
- **Live Sync** — Edit any note and your dashboard updates within milliseconds, without reloading.
- **Alarm & Reminder System** — Set per-event alarms that fire a popup modal with sound and vibration at the exact minute you specify.
- **Recurring Events** — Mark events as `daily`, `weekly`, `monthly`, or `yearly` and they auto-project into the future.
- **Drag & Drop Rescheduling** — Drag events on the calendar to move them to a new date; the underlying Markdown file updates automatically.
- **Multi-Day Events** — Specify a date range and an event spans multiple calendar days.
- **Color & Icon Customization** — Assign a hex color and an emoji or SVG icon to each event.
- **Tag Filtering** — Tag events and filter your list view by tag with one click.
- **Progress Tracking** — Subtasks inside an event's description are tracked as a mini progress bar.
- **Subtask Checkboxes** — Toggle subtask completion from the event detail view; it writes back to the Markdown file.
- **Customizable Status Colors** — Override the default colors for Pending, Completed, Closed, and Important statuses.
- **Search** — Full-text search across event titles and notes in real time.
- **Sort Modes** — Sort events by time (oldest/newest first) or by name (A–Z / Z–A).

---

## Installation

> **Note:** This is a community plugin. Install it manually until it is listed in the Obsidian community registry.

### Manual Installation

1. Download `main.js` and `manifest.json` from the release page.
2. In your vault, create the folder: `.obsidian/plugins/cevent-planner/`
3. Place `main.js` and `manifest.json` inside that folder.
4. Open Obsidian → **Settings → Community Plugins → Installed Plugins**.
5. Enable **CEvent Planner**.

### From the Community Plugin Browser *(when listed)*

1. Open **Settings → Community Plugins → Browse**.
2. Search for `CEvent Planner`.
3. Click **Install**, then **Enable**.

---

## How to Use It

### Writing Events in Markdown

Events are written as Markdown checklist items anywhere in any `.md` file. The plugin scans your entire vault, so you can keep events in dedicated planning notes, daily notes, project files — wherever you like.

**Basic structure:**

```markdown
- [ ] Event Title
  - Date DD-MM-YYYY
  - Time HH:MM AM/PM
  - Alarm HH:MM AM/PM
  - Color #hexcode
  - Icon emoji_or_svg
  - Repeat daily|weekly|monthly|yearly
  - Tag #tag1 #tag2
  > Note text or description goes here as a blockquote
```

Every attribute line is **optional** except `Date` — without a date, the plugin ignores the entry.

---

### Embedding the Dashboard

Paste this code block anywhere in a note to render the full interactive dashboard inline:

````markdown
```cevent-planner
```
````

You can specify a default starting view by adding a hint inside the block:

````markdown
```cevent-planner
view: 'calendar'
```
````

````markdown
```cevent-planner
view: 'list'
```
````

````markdown
```cevent-planner
view: 'alltasks'
```
````

The dashboard height is controlled via Settings (default: `800px`).

---

### Event Attributes Reference

| Attribute | Format | Description |
|-----------|--------|-------------|
| `Date` | `DD-MM-YYYY` or `DD-MM-YYYY to DD-MM-YYYY` | Single date or multi-day range |
| `Time` | `9:00 AM`, `9:00 AM to 11:00 AM`, `14:30` | Event start or start–end time |
| `Alarm` | `9:00 AM`, `2:30 PM` | Exact minute to fire the reminder modal |
| `Color` | `#FF5733` | Hex color for the event dot and badge |
| `Icon` | `🎂`, `🚀`, `<svg ...>` | Emoji or inline SVG |
| `Repeat` | `daily`, `weekly`, `monthly`, `yearly` | Recurrence rule |
| `Tag` | `#work #urgent` | Space-separated hashtags |
| Blockquote `>` | Free text | Description / notes shown in event detail |

---

### Event Statuses

The checkbox character controls the status:

| Checkbox | Status | Meaning |
|----------|--------|---------|
| `- [ ] Title` | **Pending** | Open / not yet done |
| `- [x] Title` | **Completed** | Done |
| `- [-] Title` | **Closed** | Cancelled or dismissed |

You can change the status directly from the dashboard (no need to edit the file manually). The plugin writes the new checkbox character back to your Markdown file instantly.

---

### Recurring Events

Add a `Repeat` attribute and the plugin generates projected future occurrences automatically — up to 12 months ahead by default (configurable in Settings):

```markdown
- [ ] Weekly Team Standup
  - Date 01-06-2025
  - Time 10:00 AM
  - Repeat weekly
```

This will appear every Monday for the next 12 months on the calendar. Projected recurring events are read-only (you cannot drag or edit them); only the original entry can be modified.

---

### Views Explained

**Calendar View**
A full monthly calendar grid. Days with events show colored dots (or custom icons). Click any day to jump to its List View. Navigate months with arrow buttons or click the month/year header to jump directly.

**List View**
Shows events for a selected day in card format. Includes:
- A live clock display and date label at the top.
- A horizontal 7-day scroller for quick day navigation.
- Search, scope selector (Selected Date / Previous Day / Next Day / Upcoming), sort, and tag filters.
- Toggle between **List** and **Time View** (hourly timeline).

**Time View**
An hourly timeline (optionally 30-minute slots) showing events plotted against the clock. Useful for days with many time-specific events.

**All Tasks View**
A vault-wide list of every event, grouped by date, with a global completion progress bar at the top. Great for a weekly or monthly overview.

**Event Detail View**
Click any event card to open a detail page showing all metadata, description, subtask checkboxes with progress bar, and action buttons (Open Note, Mark Complete, Mark Closed, Add/Remove Tags).

---

## Example Events

### Simple To-Do

```markdown
- [ ] Submit project report
  - Date 15-06-2025
```

### Meeting with Time and Alarm

```markdown
- [ ] Product Review Meeting
  - Date 20-06-2025
  - Time 2:00 PM to 3:30 PM
  - Alarm 1:45 PM
  - Tag #work #meetings
  > Discuss Q2 roadmap and assign owners for next sprint.
```

### Birthday with Custom Color and Icon

```markdown
- [ ] Sarah's Birthday
  - Date 22-06-2025
  - Icon 🎂
  - Color #FF69B4
  - Alarm 9:00 AM
  > Don't forget to order the cake from Bakery Corner!
```

### Multi-Day Conference

```markdown
- [ ] Annual Design Conference
  - Date 10-07-2025 to 12-07-2025
  - Color #6A0DAD
  - Icon 🎨
  - Tag #conference #design
```

### Recurring Weekly Habit

```markdown
- [ ] Friday Journaling
  - Date 06-06-2025
  - Time 8:00 PM
  - Repeat weekly
  - Icon 📓
  > Reflect on the week. What went well? What to improve?
```

### Event with Subtasks and Progress Tracking

```markdown
- [ ] Launch New Website
  - Date 30-06-2025
  - Time 9:00 AM
  - Alarm 8:30 AM
  - Tag #work #launch
  > Pre-launch checklist:
  > - [ ] Final QA pass
  > - [ ] Update DNS records
  > - [x] Prepare announcement post
  > - [ ] Notify stakeholders
```

### Completed Past Event

```markdown
- [x] Dentist Appointment
  - Date 01-05-2025
  - Time 11:00 AM
```

### Closed / Cancelled Event

```markdown
- [-] Conference Call with Client X
  - Date 18-05-2025
  - Time 3:00 PM
  > Cancelled — client rescheduled to next month.
```

---

## Real-World Use Cases

### 1. Personal Life Planner
Keep a single `Planner.md` note with all personal events — birthdays, doctor appointments, anniversaries, travel bookings. Embed the dashboard at the top and have a full personal calendar inside Obsidian without ever leaving your notes.

```markdown
# My Life Planner

```cevent-planner
view: 'calendar'
```

- [ ] Mom's Birthday
  - Date 14-08-2025
  - Icon 🎁
  - Alarm 9:00 AM

- [ ] Annual Physical Checkup
  - Date 02-09-2025
  - Time 10:30 AM
  - Alarm 10:00 AM
  - Tag #health


---

### 2. Project Tracker Across Multiple Notes
Scatter event entries across project-specific notes (e.g., `Project Alpha.md`, `Website Redesign.md`, `Marketing Campaign.md`). Open a central `Dashboard.md` with the `cevent-planner` code block set to `view: 'alltasks'` to see every deadline from every project in one place.

---

### 3. Daily Note Integration
In your daily note template, embed the list view so every day's note shows that day's schedule automatically:

```markdown
# {{date:DD-MM-YYYY}}

## Today's Schedule
```cevent-planner
view: 'list'
```

## Notes
```

---

### 4. Team Sprint Planning (Shared Vault)
In a shared Obsidian vault (e.g., via Obsidian Sync or a Git-synced folder), each team member writes their tasks in their own note. The shared dashboard note aggregates everything. Status changes (completing a task) are written back to the Markdown files, making Git diffs clean and readable.

---

### 5. Academic Semester Planner
A student creates one note per course (`Math 301.md`, `History 202.md`, etc.) and writes assignment due dates as events with alarms. The central `Semester Overview.md` with the calendar view shows the full picture of deadlines across all courses.

```markdown
- [ ] Math 301 — Problem Set 4
  - Date 28-06-2025
  - Alarm 11:00 PM
  - Tag #math #urgent

- [ ] History Essay Draft
  - Date 05-07-2025
  - Alarm 9:00 AM
  - Tag #history
```

---

### 6. Habit & Routine Tracking
Use recurring daily events for habits and routines. The All Tasks view gives a clear picture of what's pending vs. completed each week.

```markdown
- [ ] Morning Workout
  - Date 01-06-2025
  - Time 7:00 AM
  - Repeat daily
  - Icon 🏋️

- [ ] Read for 30 minutes
  - Date 01-06-2025
  - Time 9:00 PM
  - Repeat daily
  - Icon 📚
```

---

## Settings & Configuration

Open **Settings → CEvent Planner** to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Default View | `calendar` | Which tab opens first (`calendar`, `list`, `alltasks`) |
| Default Sort | `Time: Oldest First` | Default sort order in List View |
| Code Block Height | `800px` | Height of the embedded dashboard |
| Max Dots on Calendar | `4` | Max event dots shown per calendar day |
| Enable Reminders | `On` | Master toggle for the alarm system |
| Enable Alarm Tone | `On` | Audible two-tone beep when alarm fires |
| Enable Alarm Vibration | `On` | Device vibration pattern with alarm (mobile) |
| Recurring Limit (Months) | `12` | How far ahead recurring events are projected |
| Time View Max Per Slot | `3` | Max events shown per hour slot in Time View |
| Time View Half-Hour Slots | `Off` | Use 30-minute instead of 60-minute slots |
| Status Colors | See below | Custom hex colors for each status |

**Default Status Colors:**

| Status | Default Color |
|--------|--------------|
| Pending | `#006D77` (teal) |
| Completed | `#588157` (green) |
| Closed | `#AD2831` (red) |
| Important | `#003566` (navy) |

---

## Benefits

**Everything lives in your notes.** There is no external database, no sync account, no proprietary format. Your events are plain Markdown that will work in any text editor forever.

**Zero friction to add an event.** You already write notes — just add a checklist item with a `- Date` attribute line. No forms, no modals required to create an event.

**Vault-wide awareness.** The plugin reads all your files. Write events wherever they make sense contextually (inside a project note, a meeting note, a daily note) and they all appear on the central calendar.

**Alarms that actually work.** The built-in reminder system fires at the exact minute with a modal popup, audible alarm tone (Web Audio API), and vibration on supported devices. No OS notification permissions needed.

**Live sync, no manual refresh.** Change a note → dashboard updates automatically within a fraction of a second. Drag an event to a new date → the Markdown file updates instantly.

**Powerful filtering without complexity.** Search, filter by status or tag, scope by date range, and sort — all from the dashboard, with no configuration files or queries to write.

**Subtask progress tracking.** Nested checklists inside event descriptions are rendered as interactive checkboxes in the detail view, with a live progress bar. Checking them off writes directly to the file.

**Recurring events with zero effort.** One `- Repeat weekly` line generates 52 calendar entries automatically. No repeating rules to configure elsewhere.

**Fully themeable.** The plugin respects Obsidian's CSS variables and your chosen theme. Status colors are customizable via settings. Individual events can have their own hex color and icon.

---

## Tips & Best Practices

- **Keep events in context.** Write the event inside the relevant note (e.g., write a meeting event inside the meeting note). The vault scanner will find it automatically.
- **Use Tags for cross-cutting concerns.** Tags like `#urgent`, `#health`, `#work` let you filter across all notes in the List and All Tasks views.
- **Use the `Id` attribute for references.** If you want to link to a specific event from elsewhere in your vault, give it a stable `- Id my-event-id` and reference that string.
- **Don't worry about order.** Attribute lines can appear in any order under the checklist item.
- **Projected recurring events are read-only.** To edit the title, date, or attributes of a recurring event, edit the original base entry (the one on the first occurrence date).
- **The dashboard can be embedded multiple times.** You can have a `cevent-planner` block in your daily note template, your weekly review note, and a master dashboard note — they all stay in sync.
- **Blockquote lines become the description.** Any `> text` line nested under the event becomes its description/note, visible in the event detail view.
- **Subtasks in descriptions are interactive.** Write `> - [ ] subtask` inside the blockquote and they become checkable from the dashboard, with live write-back to the file.
