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
          success:
            'group-[.toaster]:bg-success/10 group-[.toaster]:border-success/25',
          error:
            'group-[.toaster]:bg-destructive/10 group-[.toaster]:border-destructive/25',
          warning:
            'group-[.toaster]:bg-warning/10 group-[.toaster]:border-warning/25',
          info:
            'group-[.toaster]:bg-info/10 group-[.toaster]:border-info/25',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
