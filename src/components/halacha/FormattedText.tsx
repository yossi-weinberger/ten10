import {
  ReactNode,
  ElementType,
  forwardRef,
  ComponentPropsWithRef,
} from "react";

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
  children: string | ReactNode;
  as?: ElementType;
  className?: string;
}

/**
 * Component that automatically formats text with asterisks to italic
 * Usage: <FormattedText as="h1" className="...">*text*</FormattedText>
 */
export const FormattedText = forwardRef<any, FormattedTextProps>(
  ({ children, as: Component = "span", className = "", ...props }, ref) => {
    const text = typeof children === "string" ? children : String(children);

    return (
      <Component
        ref={ref}
        className={className}
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
        {...props}
      />
    );
  }
);

FormattedText.displayName = "FormattedText";
