import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserInfoDisplay } from "@/components/UserInfoDisplay";

export function ProfilePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">פרופיל</h2>
        <p className="text-muted-foreground">נהל את פרטי המשתמש שלך</p>
      </div>

      <UserInfoDisplay />

      <div className="max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">שם מלא</Label>
                  <Input id="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">דואר אלקטרוני</Label>
                  <Input id="email" type="email" />
                </div>
                <Button>שמור שינויים</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>אבטחה</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">סיסמה חדשה</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <Button>עדכן סיסמה</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
