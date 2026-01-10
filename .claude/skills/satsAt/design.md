# SatsAt Design System - World-Class UI/UX

You are a world-class product designer creating a premium, cutting-edge interface for SatsAt - a Bitcoin portfolio tracker for sophisticated users.

## Design Philosophy

**Core Principles:**
1. **Premium & Sophisticated** - This is for serious Bitcoiners with $100K+. Every pixel should feel considered.
2. **Technological & Digital** - Embrace the future. Think fintech meets cyberpunk meets Apple.
3. **Trust & Security** - Users are tracking real wealth. Design must convey safety and reliability.
4. **Clarity Over Decoration** - Financial data requires crystal-clear hierarchy and readability.

---

## Visual Language

### Color Palette

**Primary: Electric Amber/Gold**
- Brand color representing Bitcoin's digital gold narrative
- Use sparingly for CTAs, active states, and key highlights
- Never use for large areas - it's an accent

```css
--color-primary: #F7931A;        /* Bitcoin orange - primary accent */
--color-primary-glow: #FFAA33;   /* Lighter glow variant */
--color-primary-dark: #CC7A15;   /* Pressed/active state */
```

**Backgrounds: Deep Space**
- Rich, deep blacks and dark blues
- Subtle gradients for depth
- No pure black (#000) - use rich darks

```css
--color-bg-base: #0A0A0F;        /* Deepest background */
--color-bg-raised: #12121A;      /* Cards, elevated surfaces */
--color-bg-elevated: #1A1A24;    /* Modals, dropdowns */
--color-bg-hover: #22222E;       /* Hover states */
```

**Accent Colors**
```css
--color-success: #00D4AA;        /* Teal green - gains, positive */
--color-error: #FF4757;          /* Coral red - losses, errors */
--color-warning: #FFB347;        /* Soft amber - warnings */
--color-info: #4A9FFF;           /* Electric blue - info states */
```

**Text Hierarchy**
```css
--color-text-primary: #FFFFFF;    /* Headlines, important text */
--color-text-secondary: #A0A0B0;  /* Body text, descriptions */
--color-text-tertiary: #606070;   /* Captions, hints */
--color-text-muted: #404050;      /* Disabled, placeholders */
```

### Typography

**Font Stack:** Inter (or Geist/Satoshi for premium feel)
- Headlines: 600-700 weight, tight letter-spacing (-0.02em)
- Body: 400-500 weight, normal letter-spacing
- Monospace for numbers: JetBrains Mono or similar

**Scale:**
```
text-xs:   12px / 16px line-height
text-sm:   14px / 20px line-height
text-base: 16px / 24px line-height
text-lg:   18px / 28px line-height
text-xl:   20px / 28px line-height
text-2xl:  24px / 32px line-height
text-3xl:  30px / 36px line-height
text-4xl:  36px / 40px line-height
```

### Effects & Treatments

**Glassmorphism (use sparingly)**
```css
.glass {
  background: rgba(18, 18, 26, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

**Glows & Shadows**
```css
/* Subtle ambient glow */
.glow-primary {
  box-shadow: 0 0 40px rgba(247, 147, 26, 0.15);
}

/* Card elevation */
.shadow-card {
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.4);
}

/* Depth layers */
.shadow-elevated {
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Gradient Borders**
```css
.gradient-border {
  position: relative;
  background: var(--color-bg-raised);
  border-radius: 16px;
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(247, 147, 26, 0.3), transparent 50%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}
```

**Mesh Gradients (Hero sections)**
```css
.mesh-gradient {
  background:
    radial-gradient(at 40% 20%, rgba(247, 147, 26, 0.15) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(74, 159, 255, 0.1) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(0, 212, 170, 0.1) 0px, transparent 50%);
}
```

---

## Component Patterns

### Cards
- Rounded corners: 16px (large), 12px (medium), 8px (small)
- Background: `var(--color-bg-raised)` with subtle border
- Hover: Slight lift with shadow increase
- Border: 1px solid rgba(255, 255, 255, 0.05)

### Buttons
**Primary:**
- Background gradient with primary color
- Subtle inner shadow for depth
- Hover: Brightness increase + glow
- Active: Slight scale down (0.98)

**Secondary:**
- Ghost style with border
- Hover: Background fill
- Border: 1px solid rgba(255, 255, 255, 0.1)

**Ghost:**
- No background or border
- Hover: Subtle background
- Use for less important actions

### Inputs
- Background: Darker than surface
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Focus: Primary color ring with glow
- Placeholder: Muted text color
- Height: 44px minimum for touch targets

### Tables (Financial Data)
- Alternating row backgrounds (subtle)
- Monospace font for numbers
- Right-align numerical data
- Color-code positive (green) and negative (red)
- Hover row highlight

### Navigation
- Fixed/sticky with blur backdrop
- Subtle border-bottom on scroll
- Active state with primary color indicator
- Smooth transitions between states

---

## Motion & Animation

**Transitions:**
- Duration: 150ms (micro), 200ms (normal), 300ms (large)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth deceleration

**Principles:**
- Fast and responsive - never sluggish
- Purposeful - only animate when it adds meaning
- Subtle - avoid flashy or distracting motion

**Common Animations:**
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Subtle pulse for loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Spacing & Layout

**Spacing Scale (8px base):**
```
1:  4px   (tight)
2:  8px   (compact)
3:  12px  (cozy)
4:  16px  (comfortable)
5:  20px  (relaxed)
6:  24px  (spacious)
8:  32px  (generous)
10: 40px  (breathable)
12: 48px  (open)
16: 64px  (section)
20: 80px  (hero)
```

**Container:**
- Max width: 1280px (default), 1440px (wide)
- Padding: 16px (mobile), 24px (tablet), 32px (desktop)

**Grid:**
- 12-column grid
- Gap: 16px (mobile), 24px (desktop)

---

## Dark Mode Excellence

Since this is a dark-first app:
1. Never use pure white text - use #F5F5F5 or softer
2. Layer surfaces with subtle elevation changes
3. Use color temperature (cool grays vs warm grays) intentionally
4. Ensure 4.5:1 contrast ratio for accessibility
5. Test in both bright and dim environments

---

## Implementation Checklist

When updating components:
- [ ] Colors use CSS variables (not hardcoded)
- [ ] Transitions are smooth and consistent
- [ ] Hover states are defined
- [ ] Focus states are accessible (visible ring)
- [ ] Typography follows the scale
- [ ] Spacing uses the 8px grid
- [ ] Borders are subtle (0.05-0.1 opacity white)
- [ ] Shadows create depth without heaviness
- [ ] Numbers use monospace font
- [ ] Financial colors are consistent (green=gain, red=loss)

---

## Anti-Patterns (Avoid)

- Pure black (#000) backgrounds
- Hard white (#FFF) text
- Thick, visible borders
- Flat, single-color surfaces without depth
- Inconsistent border radiuses
- Jarring color transitions
- Generic shadcn/generic look
- Overly complex gradients
- Animation for animation's sake
- Cramped spacing
