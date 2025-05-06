import React, { useState } from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  exportTransactionsToJson,
  importTransactionsFromJson,
} from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCw,
  FileJson,
  Database,
  Cloud,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DataSyncPage() {
  const { platform } = usePlatform();
  const [exportedData, setExportedData] = useState<string>("");
  const [importData, setImportData] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showExportedData, setShowExportedData] = useState(false);

  const platformLabel = platform === "desktop" ? "דסקטופ" : "אינטרנט";
  const otherPlatformLabel = platform === "desktop" ? "אינטרנט" : "דסקטופ";

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const data = await exportTransactionsToJson();
      setExportedData(data);
      setShowExportedData(true);
      toast.success("הנתונים יוצאו בהצלחה");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("שגיאה בייצוא הנתונים");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(exportedData)
      .then(() => toast.success("הועתק ללוח"))
      .catch(() => toast.error("שגיאה בהעתקה ללוח"));
  };

  const handleSaveToFile = () => {
    const blob = new Blob([exportedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenten-transactions-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("הקובץ נשמר");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) {
      toast.error("אין נתונים לייבוא");
      return;
    }

    try {
      setIsImporting(true);
      const count = await importTransactionsFromJson(
        importData,
        replaceExisting
      );
      setImportResult({
        success: true,
        message: `יובאו ${count} רשומות בהצלחה`,
      });
      toast.success(`יובאו ${count} רשומות בהצלחה`);
      setImportData("");
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || "שגיאה בייבוא הנתונים",
      });
      toast.error("שגיאה בייבוא הנתונים");
      console.error("Error importing data:", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">סנכרון נתונים</h2>
        <p className="text-muted-foreground">
          ייבוא וייצוא נתונים בין גרסת הדסקטופ והאתר
        </p>
      </div>

      <Alert>
        <div className="flex items-center gap-2">
          {platform === "desktop" ? (
            <Database className="h-5 w-5" />
          ) : (
            <Cloud className="h-5 w-5" />
          )}
          <AlertTitle>הנך נמצא כעת בגרסת {platformLabel}</AlertTitle>
        </div>
        <AlertDescription>
          באפשרותך לייצא את הנתונים מגרסת {platformLabel} וליבא אותם לגרסת{" "}
          {otherPlatformLabel}.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">ייצוא נתונים</TabsTrigger>
          <TabsTrigger value="import">ייבוא נתונים</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>ייצוא נתונים מ{platformLabel}</CardTitle>
              <CardDescription>
                ייצא את כל הטרנזקציות לקובץ JSON שניתן לייבא בגרסת{" "}
                {otherPlatformLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
              >
                <ArrowDownToLine className="ml-2 h-4 w-4" />
                {isExporting ? "מייצא..." : "ייצא את כל הטרנזקציות"}
              </Button>

              {showExportedData && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="exported-data">הנתונים המיוצאים:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToClipboard}
                      >
                        העתק
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToFile}
                      >
                        שמור כקובץ
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="exported-data"
                    value={exportedData}
                    readOnly
                    className="font-mono text-xs h-[200px] resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    ניתן להעתיק את הנתונים הללו וליבא אותם בגרסת{" "}
                    {otherPlatformLabel}, או לשמור כקובץ לשימוש מאוחר יותר.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>ייבוא נתונים ל{platformLabel}</CardTitle>
              <CardDescription>
                יבא טרנזקציות מקובץ JSON שיוצא מגרסת {otherPlatformLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full gap-2">
                <Label htmlFor="file">העלה קובץ JSON</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="grid w-full gap-2">
                <Label>או הדבק את תוכן ה-JSON ישירות</Label>
                <Textarea
                  placeholder="הדבק כאן את תוכן ה-JSON..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="h-[100px]"
                />
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="replace"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(!!checked)}
                />
                <Label
                  htmlFor="replace"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  מחק את כל הנתונים הקיימים לפני הייבוא
                </Label>
              </div>

              {importResult && (
                <Alert
                  variant={importResult.success ? "default" : "destructive"}
                >
                  <AlertTitle>
                    {importResult.success
                      ? "הייבוא הושלם בהצלחה"
                      : "שגיאה בייבוא"}
                  </AlertTitle>
                  <AlertDescription>{importResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleImport}
                disabled={!importData || isImporting}
                className="w-full"
              >
                <ArrowUpFromLine className="ml-2 h-4 w-4" />
                {isImporting ? "מייבא..." : "יבא נתונים"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
