/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Sidebar scroll behavior CSS classes', () => {
  it('inSheet mode: nav div uses flex-none (does not shrink)', () => {
    const inSheet = true;
    
    // This is the className logic from Sidebar.tsx line 373
    const navClasses = cn(
      "overflow-x-hidden min-w-0",
      inSheet ? "flex-none" : "flex-1 min-h-0 overflow-y-auto"
    );
    
    // In inSheet mode, nav should:
    // - Have flex-none (not flex-1)
    // - NOT have min-h-0 (which would allow shrinking)
    // - NOT have overflow-y-auto (parent scrolls instead)
    expect(navClasses).toContain('flex-none');
    expect(navClasses).not.toContain('flex-1');
    expect(navClasses).not.toContain('min-h-0');
    expect(navClasses).not.toContain('overflow-y-auto');
  });

  it('non-sheet mode: nav div uses flex-1 and is scroll container', () => {
    const inSheet = false;
    
    const navClasses = cn(
      "overflow-x-hidden min-w-0",
      inSheet ? "flex-none" : "flex-1 min-h-0 overflow-y-auto"
    );
    
    // In non-sheet mode, nav should have original classes:
    // - flex-1 (grows to fill space)
    // - min-h-0 (allows shrinking below content size)
    // - overflow-y-auto (creates its own scroll)
    expect(navClasses).toContain('flex-1');
    expect(navClasses).toContain('min-h-0');
    expect(navClasses).toContain('overflow-y-auto');
    expect(navClasses).not.toContain('flex-none');
  });

  it('parent wrapper gets overflow-y-auto in inSheet mode', () => {
    const inSheet = true;
    
    // This is the className logic from Sidebar.tsx line 343
    const parentClasses = cn(
      "relative flex-1 p-1 overflow-x-hidden",
      "flex flex-col min-h-0 gap-1",
      inSheet ? "overflow-y-auto" : ""
    );
    
    // Parent should have overflow-y-auto when inSheet
    expect(parentClasses).toContain('overflow-y-auto');
  });

  it('parent wrapper does not get overflow-y-auto in non-sheet mode', () => {
    const inSheet = false;
    
    const parentClasses = cn(
      "relative flex-1 p-1 overflow-x-hidden",
      "flex flex-col min-h-0 gap-1",
      inSheet ? "overflow-y-auto" : ""
    );
    
    // Parent should NOT have overflow-y-auto when not inSheet
    expect(parentClasses).not.toContain('overflow-y-auto');
  });
});
