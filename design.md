# design.md — Vocally UI Design Specification

**Project:** Vocally  
**Use this file for:** Visual implementation only  
**Pair with:** `Vocally_Hackathon_MVP_PRD.md`  
**Design system:** **shadcn/ui** (strictly preferred)  
**Goal:** Recreate the UI style and layout shown in the attached reference screens as closely as possible.

---

## 1) Main Instruction for the AI Coding Agent

You have already implemented the PRD / product logic.

Now your task is to implement the UI **according to this design spec** and **match the attached reference visuals closely**.

### Very Important
- Do **not** redesign the product into a generic dashboard.
- Do **not** replace the layout with a simple centered form.
- Do **not** oversimplify the UI.
- Do **not** add extra pages, extra widgets, fake analytics, or random sections.
- Do **not** add decorative AI visuals, gradients, blobs, sparkles, or flashy effects.
- Do **not** make the layout too plain or too empty.
- Use **shadcn/ui components as much as possible**.
- Keep the design **minimal, clean, SaaS-like, production-level, and polished**.
- The final design should feel like a **real product UI**, not a university assignment.

This UI should closely follow the provided visual references.

---

## 2) Final Scope of the UI

The product should have **2 primary screens** and **1 optional processing screen**.

### Required Screens
1. **New Dub / Quick Dub**
2. **Outputs**

### Optional / Recommended Screen
3. **Generating Audio / Processing**

If the app already works better with inline processing, you may still implement the separate processing screen visually because it is part of the reference design.

### Final Recommendation
For best visual match with the provided references, implement **3 screens**:

- `NewDubPage`
- `GeneratingAudioPage`
- `OutputsPage`

If time is short, the two required screens are enough:
- `NewDubPage`
- `OutputsPage`

and processing can be shown inline or via a temporary route.

---

## 3) Design Language

The references show a **clean SaaS product layout** with:
- left sidebar
- top search/header bar
- main content area
- right-side summary/details panel
- clean cards
- thin borders
- soft blue accent
- lots of whitespace
- soft neutral background
- professional typography

### The overall feel should be:
- minimal
- calm
- premium
- light
- modern
- structured
- productive
- polished

---

## 4) Design System Rules

### 4.1 Use shadcn/ui Components
Use shadcn/ui as the base for most UI pieces.

#### Prefer these components:
- `Button`
- `Input`
- `Select`
- `Card`
- `Tabs`
- `Badge`
- `Separator`
- `Avatar`
- `Progress`
- `Table`
- `Tooltip`
- `Popover` (only if necessary)
- `ScrollArea`
- `Skeleton`
- `Alert`
- `DropdownMenu`

#### Use Lucide icons for:
- dashboard
- plus/new
- outputs
- settings
- upload/file
- globe/language
- audio/waves
- download
- play
- search
- bell
- user/profile

### 4.2 Colors

Use a clean light palette close to the references.

#### Base
- Background: `#F8FAFC` or `#F9FBFD`
- Surface / card: `#FFFFFF`
- Border: `#E5EAF2`
- Muted border: `#EDF2F7`
- Primary text: `#0F172A`
- Secondary text: `#64748B`
- Muted text: `#94A3B8`

#### Accent
- Primary blue: `#1D9BF0` to `#178BFF`
- Light blue backgrounds: `#EEF7FF`
- Active nav background: `#EAF6FF`

#### Status
- Success green: `#16A34A`
- Success bg: `#EAFBF0`
- Processing blue: `#3B82F6`
- Processing bg: `#EEF5FF`

#### Important
No heavy gradients.  
No neon colors.  
No dark mode for now.  
Keep everything clean and soft.

### 4.3 Typography

Use:
- `Inter` or `Geist`

#### Font hierarchy
- App title/logo: `34–40px`, bold feel visually but actual size can be smaller
- Main page title: `40–52px`
- Section titles: `22–28px`
- Card titles: `18–22px`
- Table/list item title: `15–17px`
- Body text: `14–16px`
- Helper text: `12–14px`

#### Tone
- Big headings must feel confident and clean
- Supporting text should be soft gray
- Never use tiny text for important info

### 4.4 Border Radius and Shadows

#### Radius
- Outer cards: `16px–20px`
- Buttons: `12px–14px`
- Inputs/selects: `12px`
- Small pills/badges: `9999px`

#### Shadows
- Use very light shadows only
- Borders should define the layout more than shadows

Suggested:
- `shadow-sm` or very subtle custom shadow
- Avoid strong floating-card shadows

### 4.5 Spacing

Use generous spacing.

#### Suggested spacing scale
- Page padding: `24px–32px`
- Gap between major layout blocks: `24px`
- Card padding: `20px–24px`
- Tight inner spacing: `12px–16px`
- Sidebar item spacing: `10px–14px`

The UI must breathe.  
Do not crowd content.  
Do not leave giant empty dead zones either.

---

## 5) Main Layout Shell

All screens should share a consistent app shell.

### Desktop layout
Three-column feel:

1. **Left Sidebar**
2. **Main Content**
3. **Right Panel** (when needed)

### Approximate widths
- Sidebar: `220px–240px`
- Main content: flexible
- Right panel: `320px–360px`

### Top header
A thin top header spans the content area and right panel.

#### Header content
- left: search input
- right: bell icon / notification
- user profile block:
  - avatar
  - name
  - plan label
  - dropdown chevron

This top header should appear on all screens.

---

## 6) Sidebar Specification

The sidebar should closely match the references.

### Sidebar items
- Dashboard
- New Dub
- Outputs
- Settings

### Active states
- `New Dub` active on screen 1
- `Outputs` active on screen 3
- Processing screen may still keep `New Dub` active

### Sidebar style
- White sidebar
- Thin right border
- Logo at top left
- Nav list below
- Active item:
  - pale blue background
  - blue icon
  - stronger text

### Bottom widget
A small subtle card at the bottom is optional.  
If included, keep it understated like the references.

Since the user said remove unnecessary things, you may **omit the “Upgrade to Pro” card** if it serves no function.

### Recommended simplification
Keep:
- logo
- nav
- maybe small storage line or nothing

Avoid adding irrelevant commercial widgets.

---

## 7) Shared Reusable Components

Create reusable components so the UI remains consistent.

### Suggested components
- `AppSidebar`
- `TopHeader`
- `PageTitleBlock`
- `RightPanelCard`
- `StatusBadge`
- `StatMiniCard`
- `ProjectSummaryPanel`
- `AudioWavePreview`
- `YouTubeVideoPreviewCard`
- `OutputsTable`
- `ExportOptionsCard`
- `TranscriptSnippetCard`
- `ProcessingTimeline`
- `CircularProgressCard`

These should all follow the same shadcn-based look.

---

# 8) Screen 1 — New Dub / Quick Dub

This should match the first reference image.

## Route
`/new` or `/`

## Main purpose
The user pastes a YouTube URL, optionally uploads a file if supported, selects the output language, and starts the dub process.

## 8.1 Page Title Area

### Title
`Quick Dub`

### Subtitle
`Paste a YouTube link or upload a file, then generate translated audio.`

Title should be large, bold, and left aligned.

## 8.2 Main Page Layout

Two-column page structure:

### Left main panel
Contains:
- tab selector
- YouTube input
- language selectors
- primary action
- how it works
- recent outputs

### Right side panel
Contains:
- current setup summary
- video preview

This right panel is important.  
Do not remove it.

## 8.3 Top Action Tabs

A segmented/two-tab block near the top:

- `YouTube Link`
- `Upload File`

### Behavior
- YouTube Link should be active by default
- Upload File can exist even if secondary

### Style
- inside a bordered card/segment
- active tab has subtle blue emphasis
- inactive tab stays white

This should visually resemble the reference.

## 8.4 YouTube URL Input

Include:
- label: `YouTube URL`
- long input field
- optional link icon inside
- optional clear icon at far right

### Input behavior
- paste URL
- validate
- show preview if valid

### Visual
- rounded input
- neutral border
- generous height
- subtle inner padding

## 8.5 Language Row

Two side-by-side selectors:
- `From (Source Language)`
- `To (Target Language)`

### Important Product Note
Because YouTube transcript language can often be detected automatically, the source language does not need to be a complex setting.

### Final recommendation
Keep the “From” field in the UI only if needed for clarity.  
You may:
- auto-detect and show the detected source language
- or keep it editable if implementation already supports it

This means:
- keep the UI visually close to the reference
- but source language can be readonly or auto-detected if desired

### Style
- equal width selects
- aligned in one row
- flag/icon optional
- soft border

## 8.6 Primary CTA

Main button text:
`Fetch Transcript & Generate Audio`

### Button style
- strong blue filled button
- full width of form card
- medium-large height
- slightly rounded
- clear arrow or subtle icon allowed

This is the main action on the page and should feel strong.

## 8.7 Helper Line

Small helper text under CTA:

Example:
`Best for short videos in hackathon mode.`

Soft muted text.  
Small info icon allowed.

## 8.8 Right Panel — Current Setup

Card title:
`Current Setup`

Rows:
- Source
- From
- To
- Output

These appear as summary rows with icon on left and value on right.

### Values example
- Source: YouTube
- From: English
- To: Urdu
- Output: Audio only

Below that, show:

### Video Preview
- thumbnail
- title
- creator
- views
- age
- duration badge

This preview should visually match the card from the reference.

## 8.9 How It Works Section

A horizontal 3-step explainer card below the main form.

Steps:
1. Fetch transcript
2. Translate text
3. Generate audio

### Visual
- a horizontal row
- each step has soft colored icon circle
- small heading
- small description
- arrows or separators between steps

This section should remain minimal and informative.

## 8.10 Recent Outputs Section

A clean list/table under “How it works”.

### Header
- title: `Recent Outputs`
- optional `View all`

### Each row shows:
- thumbnail
- title
- source type
- language conversion
- duration
- status
- updated time
- more actions icon

### Important
Keep only a few rows.  
Do not turn it into a complicated dashboard.

---

# 9) Screen 2 — Generating Audio / Processing

This should match the second reference image.

## Route
`/processing/:id` or `/dub/:id/progress`

## Purpose
Show the current generation progress in a highly polished but clean way.

This screen is recommended if you want a stronger SaaS-like experience.

## 9.1 Header Area

### Back action
`Back to Projects` or `Back`

### Title
`Generating Audio`

### Subtitle
`Fetching transcript, translating text, and creating the dubbed audio.`

## 9.2 Main Layout

Again use:
- left sidebar
- top header
- main content
- right panel

### Main content left area
Contains:
- large circular progress
- processing steps list
- waveform area
- small stat cards

### Right panel
Contains:
- project details
- processing log

## 9.3 Circular Progress Card

Large circular indicator showing something like:
- `68%`
- `Processing...`

This should be the main visual centerpiece.

### Style
- clean white card
- big blue circular progress ring
- centered text inside

## 9.4 Processing Timeline / Steps

To the right of the circular progress:

- YouTube link analyzed
- Transcript fetched
- Translation complete
- Audio generation
- Final export

### Behavior
- completed steps show green check
- current step shows blue active status
- future step shows muted/empty state

### Extra details
Each row can show a small secondary status line and timestamp.

This section is important and should match the reference structure.

## 9.5 Waveform Panel

Under the top card, include a waveform card or audio-wave visual block.

Text example:
`Generating dubbed audio...`

A progress time string may appear to the right.

This adds realism and should remain.

## 9.6 Bottom Mini Stat Cards

Show 3 small cards like the reference:
- Estimated time remaining
- Queue position
- Output format

### Example
- `~ 2 minutes`
- `1 of 3`
- `MP3`

These should be compact and aligned in a row.

## 9.7 Right Panel — Project Details

Card title:
`Project Details`

Show:
- thumbnail
- title
- source language
- target language
- selected voice
- duration

Use a clean vertical summary layout.

## 9.8 Right Panel — Processing Log

Below project details, add a second card:
`Processing Log`

It should show chronological progress updates.

### Example items
- Analyzing YouTube link
- Fetching transcript
- Transcript fetched
- Translating text
- Translation complete
- Generating audio
- Final export

Use a subtle timeline style.

---

# 10) Screen 3 — Outputs

This should match the third reference image.

## Route
`/outputs`

## Purpose
Let the user browse, play, and download generated dubbed audio.

## 10.1 Header Area

### Title
`Outputs`

### Subtitle
`Play, compare, and download your generated dubbed audio.`

## 10.2 Main Layout

Again:
- left sidebar
- top header
- main content
- right detail panel

### Main content area
Contains:
- tabs
- search bar
- outputs table/list

### Right panel
Contains:
- selected output detail preview
- language summary
- audio player
- export options
- transcript snippet

This right panel is extremely important.  
Do not remove it.

## 10.3 Tabs + Search

At the top of the outputs list:
- `All`
- `Ready`
- `Processing`

And a search input on the right.

Keep the filters simple and minimal.

## 10.4 Outputs Table

A clean bordered table/list.

### Columns
- Title
- Languages
- Duration
- Status
- Created
- Actions

### Row content
- thumbnail
- title
- source type (e.g. YouTube Video)
- language pair
- duration
- status badge
- created time
- play/download/more action buttons

### Important
Rows should feel airy and readable.  
Selected row should have a light blue highlight.

## 10.5 Right Panel — Selected Output Detail

Large preview thumbnail on top.

Below:
- title
- source type
- created time

Then small summary cards / rows:
- Source Language
- Dubbed Language
- Selected Voice

Then:

### Audio player row
- play button
- waveform
- duration
- playback speed dropdown

Keep it minimal but functional.

## 10.6 Export Options Card

A card titled:
`Export Options`

Include selectable export types:
- MP3
- WAV
- SRT

### CTA
A big button:
`Download MP3`

This section should look polished and important.

If some options are not yet functional, only show what actually works.  
But visually, MP3/WAV/SRT options are fine if you plan to support them.

## 10.7 Transcript Snippet Card

At the bottom of the right panel:

Two small side-by-side panels:
- `Original (English)`
- `Translated (Urdu)`

Show a short snippet only.

This card should visually match the reference.

---

# 11) What Can Be Removed or Simplified

Because the user wants minimal screens and wants to drop unnecessary elements, you may simplify some non-essential reference details.

## You may remove or reduce:
- fake storage meter
- upgrade card
- dashboard page content
- voice page
- projects page
- outputs page extra filters beyond what is useful
- non-functional settings details

## But keep these:
- sidebar
- top header
- page titles
- right summary panel
- card-based structure
- polished outputs list
- strong CTA
- clean table/list visuals
- production-level spacing and styling

---

# 12) What Must Stay

These are non-negotiable visual requirements:
- left sidebar layout
- top header search/user area
- white/light theme
- clean SaaS card-based layout
- large page titles
- right-side detail panels
- polished table/list
- soft blue accent
- clean thin borders
- production-level spacing
- shadcn/ui style implementation
- minimal but rich structure
- close match to attached references

---

# 13) Responsiveness

The design is primarily **desktop-first**.

### Required behavior
- Desktop: full layout with sidebar + right panel
- Tablet: right panel may collapse below main content
- Mobile: can stack sections vertically

### Important
Desktop view is the priority.  
It should match the references on desktop.

---

# 14) Implementation Notes

## Layout recommendation
Use something like:
- `SidebarInset`
- `SidebarProvider`
- custom app shell with CSS grid or flex

### Example high-level structure
```tsx
<AppShell>
  <Sidebar />
  <div className="flex min-h-screen flex-1 flex-col">
    <TopHeader />
    <div className="grid grid-cols-[1fr_340px] gap-6 p-6">
      <MainContent />
      <RightPanel />
    </div>
  </div>
</AppShell>
```

For wider pages:
```tsx
<div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6">
```

## Suggested utility classes style direction

- clean background
- rounded-xl / rounded-2xl
- border
- bg-white
- text-slate-900
- text-slate-500
- shadow-sm
- gap-6
- p-6

---

# 15) Final Build Rule for the Agent

Implement the app so that it visually matches the attached reference screens as closely as possible.

### Final instruction
- Follow the PRD for logic.
- Follow this `design.md` for UI.
- Prioritize the referenced structure over your own interpretation.
- If a design decision is ambiguous, choose the option that looks **closest to the attached visuals**.
- Use **shadcn/ui** for the full implementation as much as possible.
- Keep it **minimal, premium, production-level, and SaaS-like**.
- Do **not** simplify the design into a plain form page.

---

# 16) Copy-Paste Prompt for the AI Coding Agent

```text
Follow the existing PRD for product logic and functionality.

Now refactor or rebuild the UI according to design.md and the attached reference screens.

You must closely match the provided reference visuals.

Important rules:
- Use shadcn/ui as much as possible
- Keep the design minimal, production-level, and SaaS-like
- Use a left sidebar, top header, main content area, and right-side details panel
- Keep the visual hierarchy, spacing, card layout, and proportions close to the references
- Do not redesign the UI into a generic dashboard
- Do not oversimplify the UI
- Do not remove the right-side panel
- Do not add decorative AI visuals, gradients, blobs, sparkles, or flashy effects
- Do not add fake analytics or unnecessary widgets

Implement these screens:
1. New Dub / Quick Dub
2. Generating Audio (recommended)
3. Outputs

If only two screens are implemented, the required ones are:
- New Dub / Quick Dub
- Outputs

Design details:
- white/light background
- soft blue accent
- thin neutral borders
- rounded cards
- large page titles
- polished tables/lists
- right-side summary cards
- shadcn components for inputs, selects, cards, tabs, buttons, badges, progress, table, and avatars

The Outputs screen must include:
- tabs (All / Ready / Processing)
- search input
- outputs list/table
- selected output right panel
- export options
- audio preview
- transcript snippet

The Quick Dub screen must include:
- tab switcher (YouTube Link / Upload File)
- URL input
- source/target language selectors
- main CTA
- helper line
- right-side current setup summary
- video preview
- how it works section
- recent outputs

The Processing screen must include:
- circular progress indicator
- processing timeline
- waveform card
- mini stat cards
- project details panel
- processing log

Match the references closely.
```

---

# End of design.md
