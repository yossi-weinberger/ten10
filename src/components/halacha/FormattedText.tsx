import { ElementType, forwardRef, ComponentPropsWithRef } from "react";

/**
 * Converts text with asterisks to formatted HTML
 * - **text** becomes <strong>text</strong>
 * - *text* becomes <em>text</em>
 */
const formatText = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
};

interface FormattedTextProps
  extends Omit<ComponentPropsWithRef<any>, "as" | "children"> {
  children: string;
  as?: ElementType;
  className?: string;
}

/**
 * Component that automatically formats text with asterisks to bold/italic
 * Usage: <FormattedText as="h1" className="...">*text*</FormattedText>
 *
 * Security Note: Uses dangerouslySetInnerHTML with controlled translation content only.
 * All content comes from translation JSON files under our control - no user input or external sources.
 * The formatText function applies only simple, safe transformations (asterisks to em/strong tags).
 */
export const FormattedText = forwardRef<any, FormattedTextProps>(
  ({ children, as: Component = "span", className = "", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={className}
        dangerouslySetInnerHTML={{ __html: formatText(children) }}
        {...props}
      />
    );
  }
);

FormattedText.displayName = "FormattedText";
