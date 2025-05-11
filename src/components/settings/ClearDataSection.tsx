import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface ClearDataSectionProps {
  handleClearData: () => Promise<void>;
  isClearing: boolean;
}

export function ClearDataSection({
  handleClearData,
  isClearing,
}: ClearDataSectionProps) {
  return (
    <div className="md:w-1/3 space-y-3 rounded-lg border border-destructive bg-card p-4 shadow">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-destructive" />
        <Label className="text-lg font-semibold text-destructive">
          מחיקת כל הנתונים
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">
        פעולה זו תמחק לצמיתות את כל נתוני הטרנזקציות מהאפליקציה. מומלץ לייצא
        נתונים לפני כן.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={isClearing}
            className="mt-2 w-full"
          >
            {isClearing ? "מוחק נתונים..." : "מחק את כל הנתונים"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>אישור סופי למחיקת כל הנתונים</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח לחלוטין שברצונך למחוק לצמיתות את כל הנתונים? פעולה זו
              אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearing ? "מוחק..." : "כן, מחק הכל"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
