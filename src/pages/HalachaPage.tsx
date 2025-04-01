import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book } from 'lucide-react';

export function HalachaPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">הלכות מעשר כספים</h2>
        <p className="text-muted-foreground">
          מידע והלכות בנושא מעשר כספים וחומש
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle>מבוא למעשר כספים</CardTitle>
            </div>
            <CardDescription>מידע כללי על מצוות מעשר כספים</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pl-4">
              <div className="space-y-4 text-right">
                <p className="text-right">
                  מעשר כספים הוא מנהג קדום שנהגו בו ישראל, להפריש עשירית מרווחיהם לצדקה.
                  אף שאין זו חובה מן התורה, רבים נוהגים בו כחובה גמורה.
                </p>
                <p className="text-right">
                  יש הנוהגים להפריש חומש (20%) מהכנסותיהם, וזוהי מידת חסידות המקובלת
                  על פי דברי חז"ל "המבזבז אל יבזבז יותר מחומש".
                </p>
                <p className="text-right">
                  חשוב לציין כי ההפרשה נעשית מהרווח הנקי, לאחר ניכוי הוצאות הכרחיות
                  וחיוני המחיה.
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle>שאלות נפוצות</CardTitle>
            </div>
            <CardDescription>תשובות לשאלות נפוצות בנושא מעשר כספים</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-right">ממה מפרישים מעשר?</AccordionTrigger>
                <AccordionContent className="text-right">
                  מפרישים מעשר מכל סוגי ההכנסות: משכורת, רווחים מעסק, ריבית, מתנות
                  כספיות, ירושה ועוד. יש להתייעץ עם רב לגבי מקרים מיוחדים.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-right">האם מותר לשלם חובות ממעשר?</AccordionTrigger>
                <AccordionContent className="text-right">
                  ככלל, אין לשלם חובות או התחייבויות קיימות מכספי מעשר. המעשר מיועד
                  לצדקה ולא לתשלום חובות אישיים.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-right">למי מותר לתת את כספי המעשר?</AccordionTrigger>
                <AccordionContent className="text-right">
                  כספי מעשר מיועדים בעיקר לעניים, אך ניתן גם לתרום למוסדות תורה,
                  גמ"חים, והחזקת תורה. יש להתייעץ עם רב לגבי מטרות ספציפיות.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-right">האם מותר להתנות מעשר?</AccordionTrigger>
                <AccordionContent className="text-right">
                  מותר להתנות בתחילת ההפרשה שיוכל להשתמש בכספי המעשר גם עבור קרובי
                  משפחה נזקקים או מטרות צדקה מסוימות.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle>הלכות מעשר</CardTitle>
            </div>
            <CardDescription>הלכות מרכזיות בדיני מעשר כספים</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-right">חישוב המעשר</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-right">
                    <li>יש לחשב מעשר מהרווח הנקי לאחר ניכוי הוצאות הכרחיות</li>
                    <li>מומלץ לנהל חשבון מסודר של ההכנסות וההפרשות</li>
                    <li>ניתן להפריש מעשר בכל פעם שמקבלים הכנסה או לעשות חישוב תקופתי</li>
                    <li>יש המהדרים להפריש חומש (20%) במקום מעשר (10%)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-right">זמן ההפרשה</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-right">
                    <li>רצוי להפריש מעשר מיד עם קבלת ההכנסה</li>
                    <li>ניתן לעכב את ההפרשה לזמן קצוב אם יש צורך</li>
                    <li>אין להשתמש בכספי המעשר לצרכים אישיים גם באופן זמני</li>
                    <li>מומלץ לקבוע זמן קבוע לחישוב והפרשת המעשר</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-right">ייעוד כספי המעשר</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-right">
                    <li>עיקר מצוות מעשר כספים היא נתינה לעניים</li>
                    <li>ניתן לתת לקרובי משפחה נזקקים</li>
                    <li>מותר לתרום למוסדות תורה וחסד</li>
                    <li>אין להשתמש בכספי מעשר לקיום מצוות אחרות שחייב בהן</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-right">הנהגות וסייגים</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-right">
                    <li>ראוי להתנות בתחילת ההפרשה שאינו מקבל עליו נדר</li>
                    <li>טוב לנהל רישום מסודר של ההפרשות והנתינות</li>
                    <li>יש להיזהר שלא לבייש את מקבלי המעשר</li>
                    <li>עדיף לתת לעניי עירו תחילה</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}