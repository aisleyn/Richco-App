# Richco Design System

Complete design system specification for the Richco Field Time-Tracking Application.

## 📋 Files

- **`design-system-spec.json`** — Machine-readable design system in JSON format (for design tools import)
- **`DESIGN_SYSTEM.md`** — This file, human-readable reference

## 🎨 Quick Reference

### Colors

**Primary Brand**
- Navy: `#0A1628` — Primary backgrounds, dark mode base
- Accent Blue: `#4A90E2` — Interactive elements, buttons, links

**Semantic**
- Green: `#16A34A` — Success, positive states
- Amber: `#F59E0B` — Warning, pending states
- Red: `#EF4444` — Error, destructive actions
- White: `#FFFFFF` — Light surfaces, cards

**Backgrounds**
- Base: `#F7F8FA` (light) / `#0F1419` (dark) — Page background
- Surface: `#FFFFFF` (light) / `#1A1F2E` (dark) — Card backgrounds
- Elevated: `#F0F1F4` (light) / `#252D3D` (dark) — Raised components

**Status Indicators**
- Onsite: `#10B981`
- En Route: `#F59E0B`
- Available: `#3B82F6`
- Off/Unavailable: `#64748B`
- Urgent: `#EF4444`

### Typography

**Font Family**
- Primary: DM Sans (with fallbacks to system fonts)

**Font Sizes**
```
xs  = 12px (captions, badges)
sm  = 14px (secondary text, labels)
base= 16px (body text, default)
lg  = 18px (subheadings)
xl  = 20px (section headings)
2xl = 24px (page titles)
```

### Spacing Scale

```
0 = 0px
1 = 4px
2 = 8px
3 = 12px
4 = 16px
5 = 20px
6 = 24px
...
16 = 64px
```

**Common Padding/Margin**
- `px-2, px-3, px-4, px-6` (horizontal padding)
- `py-1, py-2, py-3, py-4, py-6` (vertical padding)
- `gap-1, gap-2, gap-3, gap-4` (flex gaps)

### Border Radius

```
none    = 0px
sm      = 4px
base    = 6px
md      = 8px
lg      = 12px      (cards, panels)
xl      = 16px      (large components)
2xl     = 20px      (modals, sheets)
full    = 9999px    (pills, circles)
```

### Shadows

- **Card**: `0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)`
- **Glow (Amber)**: `0 0 20px rgba(245,158,11,0.3)`
- **Glow (Green)**: `0 0 20px rgba(16,185,129,0.3)`

### Animations

**Durations**
- Fast: 150ms
- Base: 200ms
- Slow: 300ms
- Slower: 400ms

**Key Effects**
- `fade-in` — 0.3s entrance
- `slide-up` — 0.4s bottom-to-top entrance (sheets, modals)
- `pulse-slow` — 3s infinite (loading states)
- `spin-slow` — 8s infinite (rotating icons)

## 🧩 Components

### Layout Components
- **AppLayout** — Main wrapper with navigation
- **BottomNav** — Mobile bottom navigation
- **NotificationsPanel** — Alerts/notifications sidebar

### UI Components
- **Avatar** — User initials with color
- **ThemeToggle** — Dark mode switcher
- **CommentCard** — Nested replies with reactions
- **ReactionTooltip** — Hover tooltips for reactions

### Feature Components

**Home Screen**
- ClockInCard — Shift info and clock in/out
- WeatherCard — Weather forecast
- SiteCards — Project/site quick access
- AlertsStrip — Recent alerts

**Admin**
- CreateShiftFormV2 — Advanced shift creation
- ShiftAssignmentManagerV2 — Manage crew assignments
- CreateChecklistForm — Daily checklist creation

**Crew Management**
- RegistrationModal — First-time user signup
- AddCrewModal — Add new team member
- EditCrewModal — Edit member details
- EmployeeProfileSheet — View profile
- SetPasswordModal — Password reset

**Shifts**
- ShiftRosterTable — Roster display
- UpcomingShiftCard — Shift summary card
- DailyChecklistCard — Checklist tracker

**Timesheet**
- TimecardGrid — 3-column expandable grid
- Timecard — Individual timecard view
- ClockOutModal — Clock out confirmation
- EditTimecardModal — Manual entry
- TimeOffCard — Time off display

**Additional**
- RequestTimeOffModal — Time off request
- ApproveLeaveModal — Approve/reject requests
- BulkUploadModal — Photo upload
- ImportPhotosModal — Photo import
- EditPhotoModal — Edit photo metadata

## 🚀 Using This Design System

### For Designers

1. Import `design-system-spec.json` into your design tool:
   - **Figma**: File → Import → Select JSON
   - **Adobe XD**: File → Open → Select JSON
   - **Sketch**: Plugins → Manage Plugins → Configure sync

2. Use tokens for:
   - Color palettes
   - Typography styles
   - Component sizing
   - Spacing guidelines

### For Developers

1. Reference this spec when building components:
   ```jsx
   // Use defined colors
   <div className="bg-bg-surface dark:bg-bg-surface-dark">
   
   // Use defined spacing
   <div className="px-4 py-3 gap-2">
   
   // Use defined border radius
   <div className="rounded-lg">
   
   // Use defined typography
   <h1 className="text-2xl font-semibold">
   ```

2. Check component documentation in `design-system-spec.json` before adding new components

3. Keep your implementation aligned with defined tokens and patterns

### For Design System Updates

When adding new designs, colors, or components:

1. Update `design-system-spec.json`
2. Update this `DESIGN_SYSTEM.md` documentation
3. Commit both files together
4. Notify team of changes

## 📐 Layout Principles

- **Mobile-First**: Design for mobile, scale up to tablet/desktop
- **Dark Mode**: All components support light and dark themes
- **Spacing**: Use spacing scale consistently (no random values)
- **Hierarchy**: Use typography scale for visual hierarchy
- **Consistency**: Reuse components, don't duplicate

## ♿ Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Touch targets are 44x44px minimum
- [ ] Keyboard navigation fully supported
- [ ] Alt text for all images/icons (except decorative)
- [ ] ARIA labels for screen readers
- [ ] Focus states visible for keyboard users
- [ ] Dark mode works correctly

## 🔄 Integration with Claude Design Labs

This spec is formatted for Claude Design import:

```bash
# Option 1: Direct import into Claude Design
curl -X POST https://design.claude.ai/api/import \
  -H "Content-Type: application/json" \
  -d @design-system-spec.json

# Option 2: Use design-system-spec.json as source of truth
# Keep it updated as you modify components
```

## 📊 Component Usage Stats

Total Components: **35+**
- Layout: 3
- UI/Reusable: 4
- Home: 4
- Admin: 3
- Crew: 5
- Shifts: 3
- Timesheet: 5
- Modals: 6

## 🛠️ Maintenance

**Last Updated**: 2026-07-29  
**Version**: 1.0.0  
**Framework**: React 18+ with Tailwind CSS  
**Compiler**: Vite + TypeScript

To update design system:
1. Modify actual components
2. Update tailwind.config.js if adding colors/sizes
3. Run `npm run build` to verify
4. Update `design-system-spec.json` to reflect changes
5. Update this README with new sections

## 📞 Questions?

- Design questions → Check `design-system-spec.json`
- Implementation questions → Check component files
- Token definitions → Check Tailwind config
- Accessibility questions → Check accessibility guidelines above

---

**Ready to extend your design system?** Keep this spec in sync as you add new features! 🎨
