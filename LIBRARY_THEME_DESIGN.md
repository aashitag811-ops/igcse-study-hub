# 📚 Old Library Theme Design Plan

## Design Vision
Transform the IGCSE Study Hub into an immersive old library experience with vintage aesthetics, scroll-like cards, and interactive elements that make users feel like they're exploring an ancient repository of knowledge.

---

## 🎨 Color Palette

### Light Mode (Lit Library)
- **Background**: `#f5f1e8` (Aged paper/parchment)
- **Secondary BG**: `#e8dcc8` (Darker parchment)
- **Text Primary**: `#2d1810` (Dark brown ink)
- **Text Secondary**: `#5c4033` (Faded ink)
- **Accent**: `#8b6914` (Antique gold)
- **Card Background**: `#faf7f0` (Light scroll paper)
- **Border**: `#c4a57b` (Aged paper edge)

### Dark Mode (Dim Library)
- **Background**: `#1a1410` (Dark wood/shadows)
- **Secondary BG**: `#2d2419` (Darker wood)
- **Text Primary**: `#e8dcc8` (Faded parchment text)
- **Text Secondary**: `#b8a88a` (Dimmer text)
- **Accent**: `#d4af37` (Warm gold glow)
- **Card Background**: `#2a2218` (Dark scroll)
- **Border**: `#4a3f2f` (Dark aged edge)

---

## 🔤 Typography

### Fonts to Import
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=IM+Fell+English:ital@0;1&display=swap');
```

### Font Usage
- **Headings**: `Cinzel` (elegant serif, ancient inscriptions)
- **Body Text**: `Crimson Text` (readable serif, old books)
- **Special Text**: `IM Fell English` (decorative, manuscript style)

---

## 🏛️ Layout Structure

### Homepage Layout
```
┌─────────────────────────────────────────────┐
│  [Hanging Bulb Toggle]    LIBRARY HEADER    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │SCROLL│  │SCROLL│  │SCROLL│  │SCROLL│  │ ← Row 1
│  │ 📜  │  │ 📜  │  │ 📜  │  │ 📜  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  │
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │SCROLL│  │SCROLL│  │SCROLL│  │SCROLL│  │ ← Row 2
│  │ 📜  │  │ 📜  │  │ 📜  │  │ 📜  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  │
│                                             │
│  [LADDER VISUAL - Fixed on right side]     │
│                                             │
└─────────────────────────────────────────────┘
```

### Grid System
- **4 columns** per row
- **Gap**: 2rem (32px)
- **Responsive**: 
  - Desktop: 4 columns
  - Tablet: 2 columns
  - Mobile: 1 column

---

## 💡 Hanging Bulb Theme Toggle

### Design Specifications

#### Light Mode (Bulb ON)
```
    ╱╲
   ╱  ╲  ← String/cord
  │    │
  │ 💡 │  ← Glowing bulb
  │    │
   ╲  ╱
    ╲╱
```
- **Bulb Color**: Warm yellow glow (`#ffd700`)
- **Glow Effect**: Radial gradient, soft shadow
- **Animation**: Subtle swing (2-3 degrees)

#### Dark Mode (Bulb OFF)
```
    ╱╲
   ╱  ╲  ← String/cord
  │    │
  │ 🔌 │  ← Dark/off bulb
  │    │
   ╲  ╱
    ╲╱
```
- **Bulb Color**: Dark gray (`#3a3a3a`)
- **No Glow**: Minimal shadow
- **Animation**: Same subtle swing

### Interaction
- **Click**: Toggle light on/off with smooth transition
- **Hover**: Slight brightness increase
- **Transition**: 0.8s ease for bulb state change

---

## 📜 Scroll/Parchment Cards

### Card Design

#### Visual Structure
```
    ╔═══════════════════════╗
    ║  ┌─────────────────┐  ║
    ║  │   SUBJECT NAME  │  ║  ← Rolled top edge
    ║  └─────────────────┘  ║
    ║                       ║
    ║      📚 ICON         ║
    ║                       ║
    ║   123 Resources      ║  ← Counter visible
    ║                       ║
    ║  ┌─────────────────┐  ║
    ║  │                 │  ║  ← Rolled bottom edge
    ╚═══════════════════════╝
```

#### CSS Properties
- **Background**: Parchment texture (gradient + noise)
- **Border**: 
  - Top/Bottom: Rolled edge effect (curved shadow)
  - Sides: Torn/aged paper effect
- **Shadow**: Multiple layers for depth
  - `0 4px 6px rgba(0,0,0,0.1)` (base)
  - `0 10px 20px rgba(139,105,20,0.15)` (depth)
- **Hover Effect**: 
  - Slight lift (translateY: -4px)
  - Enhanced shadow
  - Subtle unfurl animation

#### Rolled Edge Effect
```css
.scroll-card::before {
  /* Top rolled edge */
  background: linear-gradient(to bottom, 
    rgba(0,0,0,0.2) 0%,
    transparent 100%
  );
  border-radius: 50% 50% 0 0;
}

.scroll-card::after {
  /* Bottom rolled edge */
  background: linear-gradient(to top,
    rgba(0,0,0,0.2) 0%,
    transparent 100%
  );
  border-radius: 0 0 50% 50%;
}
```

---

## 🪜 Ladder Animation

### Ladder Design

#### Visual Placement
- **Position**: Fixed on right side of viewport
- **Height**: Full viewport height
- **Width**: 80-100px
- **Z-index**: Behind cards but above background

#### Ladder Structure
```
║  ═══  ║  ← Rung
║       ║
║  ═══  ║  ← Rung
║       ║
║  ═══  ║  ← Rung
║       ║
║  ═══  ║  ← Rung
```

#### Scroll Animation
- **Scroll Down**: Ladder moves up (climbing up)
- **Scroll Up**: Ladder moves down (climbing down)
- **Parallax Effect**: Ladder moves at 0.5x scroll speed
- **Smooth**: Use `transform: translateY()` with smooth transition

#### Implementation
```javascript
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const ladder = document.querySelector('.ladder');
  ladder.style.transform = `translateY(-${scrolled * 0.5}px)`;
});
```

---

## ✨ Animations & Effects

### 1. Bulb Swing Animation
```css
@keyframes swing {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
```
- **Duration**: 3s
- **Easing**: ease-in-out
- **Infinite**: Yes

### 2. Scroll Unfurl (Card Hover)
```css
@keyframes unfurl {
  0% { transform: scaleY(0.98); }
  100% { transform: scaleY(1); }
}
```
- **Duration**: 0.3s
- **Origin**: top center

### 3. Bulb Flicker (Subtle)
```css
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}
```
- **Duration**: 4s
- **Random intervals**: Use JavaScript

### 4. Page Load Animation
- Cards fade in sequentially (stagger: 0.1s each)
- Ladder slides in from right
- Bulb drops down from top

---

## 🎯 Component Breakdown

### Components to Create/Modify

1. **`HangingBulbToggle.tsx`** (NEW)
   - Replaces ThemeToggle
   - SVG bulb with glow effects
   - Swing animation
   - Click handler for theme toggle

2. **`ScrollCard.tsx`** (NEW)
   - Parchment-styled card
   - Rolled edge effects
   - Hover animations
   - Props: subject, icon, count

3. **`LibraryLadder.tsx`** (NEW)
   - Fixed position ladder
   - Scroll-based animation
   - Parallax effect

4. **`page.tsx`** (MODIFY)
   - 4-column grid layout
   - Use ScrollCard components
   - Add LibraryLadder
   - Update header with bulb toggle

5. **`globals.css`** (MODIFY)
   - Library color palette
   - Vintage typography
   - Parchment textures
   - Dark mode styles

---

## 📱 Responsive Considerations

### Breakpoints
- **Desktop**: 4 columns (1200px+)
- **Tablet**: 2 columns (768px - 1199px)
- **Mobile**: 1 column (< 768px)

### Mobile Adjustments
- Ladder: Smaller or hidden on mobile
- Cards: Full width with reduced padding
- Bulb: Smaller size, positioned top-right

---

## 🎨 Texture & Details

### Parchment Texture
```css
background-image: 
  url('data:image/svg+xml,...'), /* Paper grain */
  linear-gradient(to bottom, #faf7f0, #f5f1e8);
```

### Aged Paper Effect
- Subtle noise overlay
- Slight color variations
- Torn/irregular edges (SVG clip-path)

### Wood Grain (Dark Mode)
- Dark brown base
- Subtle grain texture
- Warm undertones

---

## 🚀 Implementation Order

1. ✅ Create Git branch "design-v2"
2. Update globals.css with library theme colors & fonts
3. Create HangingBulbToggle component
4. Create ScrollCard component
5. Create LibraryLadder component
6. Modify homepage to use new components
7. Test animations and interactions
8. Refine dark mode aesthetics
9. Add final polish (textures, shadows, details)
10. User review and feedback

---

## 📝 Notes

- Keep animations subtle and elegant
- Ensure accessibility (contrast ratios, focus states)
- Optimize performance (use CSS transforms, avoid layout thrashing)
- Test on multiple devices and browsers
- Maintain existing functionality (routing, data fetching)

---

**This design will create an immersive, memorable experience that sets the IGCSE Study Hub apart from typical educational platforms!** 📚✨