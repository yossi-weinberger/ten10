import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/lib/theme';
import { useDonationStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Moon, Sun, Languages, Calculator, CreditCard, Wallet, BellRing, Percent } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useDonationStore();

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">הגדרות</h2>
        <p className="text-muted-foreground">
          התאם את האפליקציה להעדפותיך
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle>שפה ותצוגה</CardTitle>
            </div>
            <CardDescription>הגדרות שפה ותצוגה כלליות</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>שפה</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateSettings({ language: value as 'he' | 'en' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר שפה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">עברית</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </div>
                <div>
                  <Label>מצב כהה</Label>
                  <p className="text-sm text-muted-foreground">התאם את מראה האפליקציה</p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>הגדרות כספים</CardTitle>
            </div>
            <CardDescription>הגדרות מטבע וחישובים</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>מטבע ברירת מחדל</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => updateSettings({ defaultCurrency: value as 'ILS' | 'USD' | 'EUR' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מטבע" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ שקל</SelectItem>
                  <SelectItem value="USD">$ דולר</SelectItem>
                  <SelectItem value="EUR">€ יורו</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <Label>חישוב חומש אוטומטי</Label>
                  <p className="text-sm text-muted-foreground">חשב אוטומטית את החומש בהכנסות חדשות</p>
                </div>
              </div>
              <Switch 
                checked={settings.autoCalcChomesh}
                onCheckedChange={(checked) => updateSettings({ autoCalcChomesh: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <Label>אחוז מעשר מינימלי</Label>
                  <p className="text-sm text-muted-foreground">הגדר אחוז מינימלי לתרומה מכל הכנסה</p>
                </div>
              </div>
              <Input 
                type="number" 
                min="0" 
                max="100"
                className="w-20 text-left"
                value="10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <CardTitle>התראות ותזכורות</CardTitle>
            </div>
            <CardDescription>הגדרות התראות ותזכורות</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <Label>התראות</Label>
                  <p className="text-sm text-muted-foreground">קבל התראות על תרומות ותשלומים</p>
                </div>
              </div>
              <Switch 
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSettings({ notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <Label>תזכורות לתרומות קבועות</Label>
                  <p className="text-sm text-muted-foreground">קבל תזכורות על תרומות קבועות</p>
                </div>
              </div>
              <Switch 
                checked={settings.recurringDonations}
                onCheckedChange={(checked) => updateSettings({ recurringDonations: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>הגדרות לוח שנה</CardTitle>
            </div>
            <CardDescription>הגדרות תצוגת תאריכים</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>סוג לוח שנה</Label>
              <Select
                value={settings.calendarType}
                onValueChange={(value) => updateSettings({ calendarType: value as 'gregorian' | 'hebrew' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג לוח שנה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gregorian">לוח גרגוריאני</SelectItem>
                  <SelectItem value="hebrew">לוח עברי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>תחילת שנת מעשרות</Label>
              <Select defaultValue="tishrei">
                <SelectTrigger>
                  <SelectValue placeholder="בחר חודש" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tishrei">תשרי</SelectItem>
                  <SelectItem value="nisan">ניסן</SelectItem>
                  <SelectItem value="january">ינואר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}