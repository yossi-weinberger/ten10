import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Heart } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">אודות Tenten</h2>
        <p className="text-muted-foreground">
          מידע על האפליקציה והצוות מאחוריה
        </p>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              על האפליקציה
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p>
              Tenten היא אפליקציה לניהול הכנסות ותרומות, שנועדה לעזור לך לעקוב אחר
              ההכנסות שלך ולנהל את התרומות שלך בצורה יעילה ונוחה.
            </p>
            <p>
              האפליקציה מאפשרת לך לנהל את החומש שלך, לעקוב אחר תרומות קבועות,
              ולקבל תזכורות כשצריך לתרום.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              תודות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              תודה מיוחדת לכל התורמים והמשתמשים שעוזרים לנו לשפר את האפליקציה
              ולהפוך אותה לטובה יותר.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}