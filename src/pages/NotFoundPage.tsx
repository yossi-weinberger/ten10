import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { FileSearch2 } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center p-6 bg-background">
      <div className="bg-muted p-6 rounded-full mb-6">
        <FileSearch2 className="w-20 h-20 text-primary" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
        404 - עמוד לא נמצא
      </h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        מצטערים, לא הצלחנו למצוא את הדף שחיפשת. ייתכן שהקישור שבור או שהדף הוסר.
      </p>
      <Button asChild size="lg">
        <Link to="/">חזרה למסך הראשי</Link>
      </Button>
    </div>
  );
}
