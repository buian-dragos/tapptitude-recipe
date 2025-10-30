# Dark Theme Color Palette

## Color Hunt Palette Used
- **#222831** - Dark Charcoal (Main Background)
- **#31363F** - Lighter Dark (Cards, Surfaces)
- **#76ABAE** - Teal/Cyan (Primary Accent)
- **#EEEEEE** - Light Gray (Text)

---

## Applied Color Scheme

### Primary (Accent - Teal #76ABAE)
Used for: Buttons, Links, Highlights, Focus indicators
- Base: `rgb(118 171 174)`
- Lighter shades for hover/active states
- Darker shades for subtle variations

### Secondary (Dark Charcoal #31363F)
Used for: Cards, Input fields, Secondary surfaces
- Base: `rgb(49 54 63)`
- Variations for borders and subtle backgrounds

### Background (#222831)
Used for: Main app background, Screen backgrounds
- Base: `rgb(34 40 49)`
- Slightly lighter variations for layering

### Typography (#EEEEEE)
Used for: Text, Labels, Headings
- Light: `rgb(238 238 238)` - Main text
- Medium: `rgb(200 200 200)` - Secondary text
- Dim: `rgb(160 160 160)` - Placeholders

### Additional Colors

#### Error (Red tones)
- For error messages and destructive actions
- Base: `rgb(239 68 68)`

#### Success (Green tones)
- For success messages and positive actions
- Base: `rgb(40 70 55)`

#### Warning (Orange/Amber tones)
- For warnings and cautions
- Base: `rgb(231 120 40)`

#### Info (Blue/Cyan tones)
- For informational messages
- Uses similar tones to primary but cooler

---

## Where Colors Are Used

### Login & Register Pages
- **Background**: `bg-background-0` (#222831)
- **Cards**: `bg-background-50` (#31363F with slight variation)
- **Card Border**: `border-outline-100` (subtle border)
- **Input Fields**: `bg-background-100` with `border-outline-200`
- **Headings**: `text-typography-950` (lightest text)
- **Body Text**: `text-typography-600` to `text-typography-800`
- **Links**: `text-primary-500` (teal accent)
- **Placeholders**: `rgb(160 160 160)` (medium gray)

### Buttons
- **Primary Button**: Uses primary color (teal)
- **Secondary Button**: Uses secondary colors
- **Link Button**: Uses primary-500 for text

### Error/Success Messages
- **Error Box**: `bg-error-100` with `text-error-700`
- **Success Box**: `bg-success-100` with `text-success-700`

---

## Customization Guide

To change colors, edit: `components/ui/gluestack-ui-provider/config.ts`

### Example: Change Primary Accent Color

Find the `dark: vars({` section and modify:

```typescript
/* Primary - Your new accent color */
'--color-primary-500': 'R G B',  // Replace with your RGB values
```

### Example: Change Background Color

```typescript
/* Background - Main background */
'--color-background-0': 'R G B',  // Replace with your preferred dark background
```

### Color Format
Colors are defined in RGB format separated by spaces:
- ✅ Correct: `'118 171 174'`
- ❌ Wrong: `'#76ABAE'` or `'rgb(118, 171, 174)'`

---

## Testing Your Colors

1. Edit `config.ts`
2. Save the file
3. The app will hot-reload automatically
4. Check login/register pages for changes

---

## Additional Notes

- All colors have shades from 0-950 for flexibility
- Lighter numbers (0-500) are darker in dark mode
- Higher numbers (500-950) are lighter in dark mode
- This creates proper contrast in dark theme
- StatusBar is set to "light" for visibility on dark backgrounds
