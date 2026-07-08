import { useTheme } from '@/lib/theme';
import { Toaster as Sonner } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Per-type tint follows the same soft-tint convention used across the app
 * (e.g. StatsCards, OpeningBalanceHomeStyleStatCard): bg-<token>/10 + border-<token>/25,
 * with the semantic color reserved for the icon rather than the whole surface.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-success" />,
        error: <AlertCircle className="h-4 w-4 text-destructive" />,
        warning: <AlertTriangle className="h-4 w-4 text-warning" />,
        info: <Info className="h-4 w-4 text-info" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // `!` forces these to win over the base `toast` background/border above —
          // both target the same properties with equal specificity, so without `!`
          // the winner is undefined.
          // `color-mix()` (not a plain `/10` opacity) so the result is a fully opaque
          // solid color — a toast floats over arbitrary content, so a translucent
          // background would let whatever's behind it bleed through.
          success:
            'group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--success))_10%,hsl(var(--background)))] group-[.toaster]:!border-[color-mix(in_srgb,hsl(var(--success))_30%,hsl(var(--background)))]',
          error:
            'group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--destructive))_10%,hsl(var(--background)))] group-[.toaster]:!border-[color-mix(in_srgb,hsl(var(--destructive))_30%,hsl(var(--background)))]',
          warning:
            'group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--warning))_10%,hsl(var(--background)))] group-[.toaster]:!border-[color-mix(in_srgb,hsl(var(--warning))_30%,hsl(var(--background)))]',
          info:
            'group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--info))_10%,hsl(var(--background)))] group-[.toaster]:!border-[color-mix(in_srgb,hsl(var(--info))_30%,hsl(var(--background)))]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
