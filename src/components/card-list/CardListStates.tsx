import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type CardListStatesProps =
  | { status: "loading"; header?: ReactNode }
  | { status: "empty"; text: string; header?: ReactNode };

export function CardListStates(props: CardListStatesProps) {
  switch (props.status) {
    case "loading":
      return (
        <div className="space-y-2">
          {props.header}
          {Array.from({ length: 10 }).map((_, index) => (
            <Card
              key={`skeleton-${index}`}
              className="h-16 animate-pulse bg-muted"
            />
          ))}
        </div>
      );
    case "empty":
      return (
        <div>
          {props.header}
          <div className="py-12 text-center text-muted-foreground">{props.text}</div>
        </div>
      );
    default: {
      const unreachable: never = props;
      return unreachable;
    }
  }
}
