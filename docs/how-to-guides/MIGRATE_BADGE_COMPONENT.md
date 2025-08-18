# Migrating to the Pragma Badge Component

## Overview

This guide will help you migrate from existing Badge implementations to the new Badge component.

## What's New

### Key Improvements

### Breaking Changes

## Migration Steps

## Prop Mapping

## Appearance Mapping

## Precision Modes

## Accessibility Features

### ARIA Labels
The new Badge component automatically generates appropriate ARIA labels when a `role` prop is provided:

```tsx
<Badge value={1200} precision="rounded" role="status" />
// Generates: aria-label="approximately 1.2 thousand items exist"
```

### Screen Reader Support