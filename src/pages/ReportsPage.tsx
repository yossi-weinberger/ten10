import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">דוחות</h2>
        <p className="text-muted-foreground">
          צפה וייצא דוחות על ההכנסות והתרומות שלך
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ייצוא דוחות</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button className="w-full gap-2">
              <FileText className="h-4 w-4" />
              ייצוא ל-PDF
            </Button>
            <Button className="w-full gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ייצוא ל-Excel
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>סיכום שנתי</CardTitle>
          </CardHeader>
          <CardContent>
            {/* כאן יבוא גרף שנתי */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}