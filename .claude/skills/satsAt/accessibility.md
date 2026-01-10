---
name: satsAt:accessibility
description: This skill should be used when the user asks to 'check accessibility', 'WCAG audit', 'a11y review', 'screen reader support', or mentions 'accessibility'. It ensures WCAG compliance for the SatsAt portfolio tracker interface.
version: 1.0.0
---

# Accessibility Audit

You are ensuring WCAG 2.1 AA compliance for SatsAt. A portfolio tracker must be accessible to all users, including those using assistive technologies.

## WCAG Quick Reference

### Level A (Minimum)
- Text alternatives for images
- Keyboard accessible
- No seizure-inducing content
- Navigable structure

### Level AA (Target for SatsAt)
- Color contrast 4.5:1 (text), 3:1 (large text)
- Resize text up to 200%
- Multiple ways to find pages
- Consistent navigation
- Error identification

---

## SatsAt-Specific Requirements

### 1. Financial Data Tables

Portfolio and transaction tables must be accessible:

```tsx
// Good: Proper table structure
<table role="table" aria-label="Transaction history">
  <caption className="sr-only">
    Your Bitcoin transactions for the selected period
  </caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Type</th>
      <th scope="col">Amount</th>
      <th scope="col" aria-label="Amount in USD">USD Value</th>
    </tr>
  </thead>
  <tbody>
    {transactions.map(tx => (
      <tr key={tx.id}>
        <td>{formatDate(tx.date)}</td>
        <td>{tx.type}</td>
        <td>
          <span aria-label={`${tx.amount} Bitcoin`}>
            {tx.amount} BTC
          </span>
        </td>
        <td>${tx.usdValue.toFixed(2)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 2. Portfolio Summary Cards

```tsx
// Good: Meaningful structure for screen readers
<section aria-labelledby="portfolio-heading">
  <h2 id="portfolio-heading">Portfolio Summary</h2>

  <div role="group" aria-label="Portfolio metrics">
    <div role="article" aria-label="Total value">
      <span className="text-sm text-muted">Total Value</span>
      <span className="text-2xl font-bold" aria-live="polite">
        ${totalValue.toLocaleString()}
      </span>
    </div>

    <div role="article" aria-label="24 hour change">
      <span className="text-sm text-muted">24h Change</span>
      <span
        className={change >= 0 ? 'text-green-500' : 'text-red-500'}
        aria-label={`${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change)}%`}
      >
        {change >= 0 ? '+' : ''}{change}%
      </span>
    </div>
  </div>
</section>
```

### 3. Wallet Sync Status

```tsx
// Good: Status updates announced to screen readers
<div
  role="status"
  aria-live="polite"
  aria-label={`Wallet sync status: ${syncStatus}`}
>
  {syncStatus === 'syncing' && (
    <>
      <Spinner aria-hidden="true" />
      <span>Syncing wallet...</span>
    </>
  )}
  {syncStatus === 'complete' && (
    <span>Sync complete. Last updated {lastSyncTime}.</span>
  )}
  {syncStatus === 'error' && (
    <span role="alert">Sync failed: {errorMessage}</span>
  )}
</div>
```

### 4. Form Inputs

```tsx
// Good: Proper form labeling
<div className="form-group">
  <label htmlFor="xpub-input" id="xpub-label">
    Extended Public Key (xpub)
  </label>
  <input
    id="xpub-input"
    type="text"
    aria-labelledby="xpub-label"
    aria-describedby="xpub-hint xpub-error"
    aria-invalid={!!error}
    placeholder="xpub..."
  />
  <span id="xpub-hint" className="text-sm text-muted">
    Find this in your wallet's settings
  </span>
  {error && (
    <span id="xpub-error" role="alert" className="text-red-500">
      {error}
    </span>
  )}
</div>
```

---

## Color Contrast Requirements

### SatsAt Dark Theme

Ensure sufficient contrast against dark background (#0a0a0a):

| Element | Color | Contrast Ratio | Pass? |
|---------|-------|----------------|-------|
| Body text | #ffffff | 21:1 | Yes |
| Muted text | #9ca3af | 5.6:1 | Yes |
| Orange accent | #f97316 | 4.5:1 | Check |
| Green (gains) | #22c55e | 4.6:1 | Yes |
| Red (losses) | #ef4444 | 4.6:1 | Yes |

### Testing Tool

```bash
# Install axe-core for testing
npm install @axe-core/react --save-dev
```

```tsx
// Add to development mode
import { useEffect } from 'react';

export function AccessibilityChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@axe-core/react').then(({ default: axe }) => {
        axe(React, ReactDOM, 1000);
      });
    }
  }, []);
  return null;
}
```

---

## Keyboard Navigation

### Focus Order

Ensure logical tab order through the application:

1. Skip link (to main content)
2. Navigation menu
3. Main content area
4. Wallet selector (if applicable)
5. Action buttons
6. Footer links

### Skip Link

```tsx
// Add at the top of layout
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
>
  Skip to main content
</a>

// Main content area
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

### Keyboard Shortcuts

Document and implement keyboard shortcuts:

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `g d` | Go to dashboard |
| `g w` | Go to wallets |
| `g t` | Go to tax reports |
| `Esc` | Close modal/dropdown |

```tsx
// Announce shortcuts
<div role="note" aria-label="Keyboard shortcuts available">
  Press ? to view keyboard shortcuts
</div>
```

---

## Screen Reader Considerations

### 1. Dynamic Content Updates

```tsx
// Use aria-live for dynamic updates
<div aria-live="polite" aria-atomic="true">
  {loading ? 'Loading transactions...' : `${transactions.length} transactions found`}
</div>
```

### 2. Hidden Decorative Elements

```tsx
// Hide decorative icons
<ChartIcon aria-hidden="true" />

// But describe functional icons
<button aria-label="Sync wallet">
  <RefreshIcon aria-hidden="true" />
</button>
```

### 3. Currency and Numbers

```tsx
// Format for screen readers
<span aria-label="One point five Bitcoin">
  1.5 BTC
</span>

<span aria-label="Twelve thousand three hundred forty-five dollars">
  $12,345
</span>
```

---

## Testing Checklist

### Automated Testing

- [ ] Run axe-core audit (0 violations)
- [ ] Lighthouse accessibility score (90+)
- [ ] HTML validation (no errors)

### Manual Testing

- [ ] Tab through entire page (logical order)
- [ ] Use screen reader (VoiceOver/NVDA)
- [ ] Zoom to 200% (no content loss)
- [ ] High contrast mode works
- [ ] Reduced motion respected

### Screen Reader Testing Script

1. Navigate to dashboard
2. Verify portfolio summary is announced
3. Navigate to wallets list
4. Verify wallet names and balances announced
5. Navigate to transactions
6. Verify table headers announced
7. Navigate through transaction rows
8. Verify amounts and types announced correctly

---

## Common Issues to Fix

### 1. Missing Alt Text

```tsx
// Bad
<img src="bitcoin-logo.png" />

// Good
<img src="bitcoin-logo.png" alt="Bitcoin" />

// Decorative
<img src="decorative-pattern.png" alt="" aria-hidden="true" />
```

### 2. Low Contrast Text

```tsx
// Bad: Light gray on dark (3:1)
<span className="text-gray-600">Secondary text</span>

// Good: Lighter gray on dark (5.6:1)
<span className="text-gray-400">Secondary text</span>
```

### 3. Focus Indicators Missing

```css
/* Ensure visible focus states */
:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

/* Don't remove focus outlines */
:focus {
  outline: none; /* BAD - don't do this */
}
```

### 4. Form Errors Not Announced

```tsx
// Bad: Error not connected to input
<input type="text" />
<span className="error">Invalid input</span>

// Good: Error announced via aria-describedby
<input type="text" aria-describedby="input-error" aria-invalid="true" />
<span id="input-error" role="alert">Invalid input</span>
```

---

## Accessibility Report Template

```markdown
# Accessibility Audit Report

**Date:** [date]
**Auditor:** Claude
**Scope:** [pages/components audited]

## Summary
[Overall accessibility status]

## Automated Results
- axe-core violations: [count]
- Lighthouse score: [score]

## Critical Issues (WCAG A)
- [Issue 1]
- [Issue 2]

## Major Issues (WCAG AA)
- [Issue 1]
- [Issue 2]

## Minor Issues
- [Issue 1]

## Recommendations
1. [Priority fix]
2. [Secondary fix]

## Testing Notes
[Any specific observations during testing]
```
