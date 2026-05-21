# 📅 CEvent-Planner

A powerful, visually stunning event and task management plugin for Obsidian. Turn your standard markdown checkboxes into an interactive, live-syncing dashboard featuring calendars, timelines, drag-and-drop scheduling, and system reminders.

## ✨ Key Features

* **🎛️ Interactive Dashboards:** Render a full-screen or inline dashboard anywhere in your vault using a simple code block. Includes Calendar, List, and All Tasks Timeline views.
* **🧩 Agnostic Syntax Parsing:** Write your event properties (`Date`, `Time`, `Color`, etc.) in **any random order**. The smart parser handles it effortlessly.
* **🗓️ Multi-Day & Recurring Events:** Easily span events across multiple days or set them to recur (`daily`, `weekly`, `monthly`, `yearly`).
* **✅ Live Subtask Tracking:** Interact with task checkboxes directly from the dashboard view—changes instantly sync back to your source markdown files!
* **🔔 System Reminders:** Never miss a meeting. Get contextual overlay dashboard popups when an event is due.
* **🖱️ Drag & Drop:** Move events across days in the Calendar view just by dragging the visual indicators.

---

## 🚀 Quick Start: Rendering the Dashboard

To view your events, place a `cevent-planner` code block anywhere in your Obsidian notes. 

You can define the default view (`calendar`, `list`, or `allTasks`) directly in the block:
⚠️ Remember Dashboard Contain all CalenderView,ListView,AllTaskView. 
And dashboard block name `cevent-planner`. 
Go Settings>CEvent-Planner To change Configuration.

**You can also configure the default height and initial view in the plugin's settings tab**

## 📝 Event Syntax Guide

Events are created using standard Obsidian task syntax (`- [ ]`) followed by an indented list of properties. Because of the **robust structural parser**, you can place these properties in any order.

### Basic Structure

Markdown

```
- [ ] Task or Event Name
  - Date DD-MM-YYYY
  - Time HH:MM AM
```

### Available Properties

|Property|Format / Options|Description|
|---|---|---|
|**Date**|`DD-MM-YYYY`|The start date of the event.|
|**Date (Span)**|`DD-MM-YYYY to DD-MM-YYYY`|Creates a multi-day event spanning the timeline.|
|**Time**|`HH:MM AM` or `HH:MM, HH:MM`|Time of the event. Separate multiple times with a comma.|
|**Color**|Hex code (e.g., `#006D77`)|Overrides the default status color for this specific event.|
|**Icon**|Any Emoji (e.g., 🚀, 💻)|Replaces the standard calendar dot with an emoji.|
|**Repeat**|`daily`, `weekly`, `monthly`, `yearly`|Generates future recurring instances automatically.|
|**Tag**|`#yourtag`|Assigns custom tags for dashboard filtering.|

### Adding Descriptions & Progress Tracking

You can attach notes and trackable subtasks to any event using blockquotes (`>`). Subtasks updated in the dashboard will calculate a live progress bar!

Markdown

```
- [ ] Project Alpha Launch
  - Date 25-05-2026
  > [!NOTE] 
  > This is the description for the project launch.
  > - [x] Prepare server infrastructure
  > - [ ] Deploy frontend assets
  > - [ ] Send newsletter
```

## 💡 Comprehensive Example

Here is a full example of how you might write events in your daily note. Copy and paste this into your vault, and watch the dashboard come to life!

Markdown

```
### ☀️ Morning Routine
- [x] Weekly Team Sync
  - Date 21-05-2026
  - Time 09:30 AM
  - Icon 👥
  - Repeat weekly
  - Tag #meeting

### 🛠️ Development Tasks
- [ ] Build UI Components
  - Date 21-05-2026 to 24-05-2026
  - Color #588157
  - Icon 💻
  - Tag #dev
  > [!NOTE] 
  > Build the new Material components for the framework.
  > - [x] Pill-shaped buttons
  > - [x] Action sheets
  > - [x] Overscroll bubble effect

### 🌙 Evening
- [ ] Read Documentation
  - Date 21-05-2026
  - Time 08:00 PM
  - Icon 📖
```

## ⚙️ Settings & Customization

Navigate to **Settings > CEvent-Planner** to configure:

- **Default Block View:** Choose between Calendar, List, or All Tasks Timeline.
    
- **Code Block Height:** Adjust the vertical pixel height of inline dashboards (Default: `800px`).
    
- **Max Indicator Dots:** Control how many event dots show on a calendar cell before grouping into a `+N` label.
    
- **Enable Reminders:** Toggle the alarm dialog overlay for real-time task notifications. """