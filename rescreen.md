# ScreenForge UI Redesign — Editor Screen

## Context
ScreenForge is an Electron + React application. The editor
screen is EditorScreen.jsx (or equivalent). We are redesigning
the layout of the editor to match a specific target layout.
Do not change any backend logic, IPC handlers, zoom engine,
or export pipeline. This task is CSS/JSX layout only.

---

## Reference Layout (what to build toward)

Look at the ScreenForge editor layout as your visual reference.
The key structural differences from our current layout are
listed below. Implement ALL of them.

---

## Change 1 — Zoom blocks move onto the VIDEO track, not a separate row

CURRENT:
  Timeline has two rows:
    Row 1: VIDEO track  [████████████ raw.mp4 (00:40) ████████████]
    Row 2: ZOOM track   [    [2.0x]        [2.0x]    ]

TARGET:
  Timeline has ONE video row. Zoom blocks appear as pill badges
  INSIDE the video track row, overlaid on top of it:

    [████████████ raw.mp4 ████████████████████████████]
    [ 🔍1.80× ]    [ 🔍1.80× ]   [ 🔍1.80× ]

  The zoom badges are positioned absolutely within the video
  track row at the correct time position (left offset based on
  timeMs / totalDurationMs * trackWidth).

  Style for each zoom badge:
    background: rgba(52, 211, 153, 0.85)   /* green, semi-transparent */
    color: white
    border-radius: 20px
    padding: 3px 10px
    font-size: 12px
    font-weight: 600
    display: flex
    align-items: center
    gap: 4px
    position: absolute
    top: 50%
    transform: translateY(-50%)
    cursor: pointer
    white-space: nowrap
    box-shadow: 0 1px 4px rgba(0,0,0,0.3)

  Icon inside badge: a magnifier SVG icon (🔍 or inline SVG)
  Label: show the scale as "1.80×" or "2×" depending on the
  zoom window's scale value

  Delete the separate ZOOM track row entirely. The ZOOM label
  and the [+] add button move to the toolbar (see Change 3).

---

## Change 2 — Add audio waveform row below the video track

Below the video track row, add a waveform visualization row.

  Row structure:
    Label column (same width as track label column):
      Icon: waveform SVG icon
      Text: "AUDIO"
    Track column:
      A canvas element that renders the audio waveform
      Background: slightly lighter than the track background
      Waveform color: #22c55e (green, matching the zoom badges)
      Height: 48px

  Waveform rendering:
    - Read the audio amplitude data from the project store
      (it should already exist if audio is captured — check
      useProjectStore for audioPath or waveformData)
    - If waveformData is not yet in the store, compute it on
      project load: decode the audio file, downsample to one
      amplitude value per pixel of track width, store in store
    - Render as a center-mirrored waveform (bars up and down
      from center line, like most DAWs)
    - The waveform scrolls and scales with the timeline zoom
      level exactly like the video track does (they share the
      same timeline scroll container)

---

## Change 3 — Toolbar reorganization

CURRENT toolbar (left to right):
  ⏮ ▶ ⏭ | 00:01/00:36 | Add Zoom | Delete Zoom | Remove Clip
  | 🔍 ──●── 50% | ✂ 🔊

TARGET toolbar:
  Left group:   ⏮ ▶ ⏭   (playback controls)
  Center group: 00:01 / 00:36   (timecode display)
  Right group:  [+ Add Zoom]  [Delete Zoom]  [Remove Clip]
                | ✂ 🔊
                (same buttons, just reordered to right side)

  The timeline zoom slider (🔍 ──●── 50%) moves OUT of the
  toolbar and into the top-right corner of the timeline area
  itself (above the ruler, right-aligned), matching ScreenForge's
  "Scroll | Pan | Ctrl+Scroll Zoom" controls placement.

---

## Change 4 — Preview area border / frame

Add a subtle colored border/glow around the preview canvas to
visually separate it from the dark background, matching the
framed look in ScreenForge.

  border: 2px solid rgba(239, 68, 68, 0.6)   /* red, semi-transparent */
  border-radius: 4px
  box-shadow: 0 0 0 1px rgba(239,68,68,0.2), 0 4px 24px rgba(0,0,0,0.5)

  Apply this to the preview container div, not the canvas itself.

---

## Change 5 — Right panel styling

The right panel currently shows AUTO-ZOOM SETTINGS with sliders.
Keep all the existing controls (Max Scale, Smoothing Speed, Hold
Delay, Trigger Zoom on Click, Regenerate Auto-Zoom). Only change
the visual styling to be cleaner:

  Panel background:  #111827  (darker than main bg)
  Header text:       uppercase, letter-spacing: 0.1em, font-size: 11px
  Each setting row:  label top-left, value top-right (matching current)
  Slider track:      #1e40af (blue), height 3px, border-radius 2px
  Slider thumb:      white circle, 14px diameter, box-shadow
  Section dividers:  1px solid rgba(255,255,255,0.06)
  Regenerate button: full width, background #3b82f6, hover #2563eb,
                     border-radius 6px, height 40px, font-weight 600

  The panel width stays the same. Only colors and spacing change.

---

## Change 6 — Left sidebar icons

CURRENT: icons shown as a vertical strip (camera, grid, cursor,
zoom magnifier, waveform, chat bubble, settings gear)

TARGET: same icons, same order, but:
  Active icon: background #1e40af (blue pill/rounded rect behind icon)
  Inactive icon: no background, icon opacity 0.5
  Icon size: 20px
  Sidebar width: 48px
  Each icon button: 40px × 40px, centered in the 48px sidebar

  The currently-active panel (AUTO-ZOOM = the zoom/magnifier icon)
  should show as active/highlighted.

---

## Implementation Notes

1. Do not change component names or file structure. Edit
   EditorScreen.jsx (and any sub-components it uses for the
   timeline and toolbar) in place.

2. Do not change any store logic, IPC calls, or data flow.
   Only JSX structure and CSS/Tailwind classes change.

3. The zoom badge positioning inside the video track must be
   reactive — when the timeline is zoomed in or out (the
   timeline zoom level changes), the badge positions must
   recalculate correctly, because they are based on
   (zoomWindow.beginMs / totalDurationMs * trackWidth * timelineZoom).

4. All existing functionality must still work:
   - Clicking a zoom badge should still select that zoom window
   - Add Zoom button still works
   - Delete Zoom still works
   - Playhead still scrubs correctly
   - All right-panel sliders still work

5. If you use Tailwind: check which version is configured
   before using arbitrary value syntax like [#3b82f6]. Use
   the existing color tokens from the project's tailwind.config.js
   wherever possible.

---

## Verification Checklist

After implementation, verify:

□ Timeline shows ONE video track row with zoom badges overlaid
  on it — not two separate rows
□ Zoom badges show the scale value (e.g. "2×") and a magnifier icon
□ Zoom badge positions match the actual timing of the zoom windows
□ Audio waveform row is visible below the video track
□ Waveform is center-mirrored and scrolls with the timeline
□ Toolbar has playback controls left, timecode center, actions right
□ Timeline zoom control is in the top-right of the timeline area
□ Preview has a red border glow
□ Right panel sliders are styled cleanly (blue track, white thumb)
□ Active sidebar icon is highlighted in blue
□ ALL existing functionality (add zoom, delete zoom, scrub,
  export) still works — nothing broke during the reskin