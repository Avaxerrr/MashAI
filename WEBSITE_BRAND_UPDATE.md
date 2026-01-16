# Website Brand Messaging Update TODO

**Date Created:** January 16, 2026  
**Priority:** Medium  
**Commit:** Separate from app changes

This document outlines all the brand messaging updates needed for the MashAI website to align with the new Brand Guide.

---

## Reference Documents

- **Brand Guide:** `BRAND_GUIDE.md` (in root folder)
- **Core Messaging:** See Brand Guide sections "Core Messaging" and "Copy Templates"

---

## Changes Needed

### 1. Hero Section (`src/components/Hero.tsx`)

**Current (Lines 29-38):**
```tsx
Your Unified AI <br />
<span>Workspace</span>

Orchestrate ChatGPT, Claude, and Gemini in one unified desktop workspace.
Privacy-first. No context switching.
```

**Update To:**
```tsx
Your Unified AI <br />
<span>Workspace</span>

Stop losing work in browser tabs. All your AI tools organized in one desktop app.
Free, open-source, and built for people who use AI to get work done.
```

**Why:** Match the new problem-first, work-focused messaging from Brand Guide

---

### 2. Features Section (`src/components/Features.tsx`)

**Current Header (Lines 14-19):**
```tsx
Built for <span>Power Users</span>
Features designed to enhance your AI workflow, not complicate it.
```

**Update To:**
```tsx
Why MashAI?
Keep work organized. Stay productive. Work without distractions.
```

**Why:** Match the 3 core benefits messaging

---

### 3. Feature Descriptions - Make Benefit-First

Apply the formula: **[Benefit]** - [How it works]

#### Multi-Profile Feature (Lines 33-37)
**Current:**
```
Keep Your Life Separate
Create unlimited profiles for Work, Personal, and Research...
```

**Update To:**
```
Keep work separate
Create profiles for different clients, projects, or personal use. Each keeps its own tabs and conversations.
```

#### Ad Blocking Feature (Lines 100-104)
**Current:**
```
Built-in Ad Blocking
Powered by Ghostery's industry-leading ad blocker...
```

**Update To:**
```
Work distraction-free
Built-in ad blocking stops tracking and keeps your screen clean. Toggle it on/off anytime.
```

#### Performance Feature (Lines 141-145)
**Current:**
```
Smart Memory Management
Keep dozens of tabs open without slowing down your system...
```

**Update To:**
```
Stay fast with 20+ chats open
Tabs you're not using automatically free up memory. Tabs with media playing are never suspended.
```

---

### 4. Meta Tags & SEO

Check these files for metadata:
- `src/pages/index.astro` (or main layout)
- `astro.config.mjs`

**Update meta description to:**
> Your unified AI workspace - ChatGPT, Claude, Gemini, and more organized in one desktop app. Fast, private, open-source.

**Update Open Graph title:**
> MashAI - Your Unified AI Workspace

**Update Open Graph description:**
> Stop losing work in browser tabs. All your AI tools organized in one desktop app.

---

### 5. Download Page

If there's a dedicated download page, ensure messaging is consistent:
- Use "Stop losing work in browser tabs" as the hook
- Mention "Free and open-source"
- Keep it work-focused

---

### 6. Footer / About Section

Any "About MashAI" text should use:
> MashAI keeps all your AI tools organized in one desktop app.

---

## Brand Voice Reminders

When updating copy:

✅ **Do:**
- Lead with problems, not features
- Use concrete work examples (writing, analysis, research)
- Keep sentences short and clear
- Say "AI" not "artificial intelligence"
- Focus on work use cases

❌ **Don't:**
- Use jargon (leverage, orchestrate, synergy)
- Lead with tech stack
- Over-explain
- Use marketing fluff (revolutionary, game-changing)

---

## Testing Checklist

After updates:

- [ ] Check mobile responsiveness
- [ ] Verify all links still work
- [ ] Test SEO with Lighthouse
- [ ] Review for consistency across all pages
- [ ] Ensure all messaging matches Brand Guide

---

## Notes

- Keep technical details (Electron, React, etc.) in a separate "Tech Stack" section, NOT in the hero/features
- Screenshots should show the actual app UI, not mockups
- Consider adding customer testimonials focused on work productivity

---

## Commit Message Suggestion

```
feat(website): update brand messaging to match Brand Guide

- Hero: problem-first hook and work-focused pitch
- Features: benefit-first descriptions
- Meta: updated SEO descriptions
- Align all copy with new brand voice
```
