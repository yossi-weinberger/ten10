import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addUserPlan,
  fetchPlans,
  fetchUserPlans,
  removeUserPlan,
  type AdminPlan,
  type AdminUserPlan,
} from "@/lib/data-layer/aiAdmin.service";

function mapError(error: unknown, t: (key: string) => string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String(error.message);
    if (msg.includes("USER_NOT_FOUND")) return t("ai.userPlans.userNotFound");
    if (msg.includes("PLAN_NOT_FOUND")) return t("ai.userPlans.planNotFound");
    if (msg.includes("BILLING_REQUIRES_FORCE")) return t("ai.userPlans.billingRequiresForce");
    if (msg.includes("EXPIRY_IN_PAST")) return t("ai.userPlans.expiryInPast");
  }
  return t("ai.userPlans.genericError");
}

export function AdminUserPlans() {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [userPlans, setUserPlans] = useState<AdminUserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<{ email: string; source: string } | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addPlan, setAddPlan] = useState("");
  const [addExpiresAt, setAddExpiresAt] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [plansData, userPlansData] = await Promise.all([fetchPlans(), fetchUserPlans()]);
        setPlans(plansData);
        setUserPlans(userPlansData);
      } catch {
        setLoadError(t("ai.userPlans.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [t]);

  const refreshData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [plansData, userPlansData] = await Promise.all([fetchPlans(), fetchUserPlans()]);
      setPlans(plansData);
      setUserPlans(userPlansData);
    } catch {
      setLoadError(t("ai.userPlans.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    const trimmedEmail = addEmail.trim();
    if (!trimmedEmail || !addPlan) return;
    
    setAddError(null);
    try {
      setSubmitting(true);
      // Convert date to end of day in Asia/Jerusalem if provided
      let expiresAt: string | null = null;
      if (addExpiresAt) {
        const d = new Date(addExpiresAt + "T23:59:59");
        // Convert to Asia/Jerusalem timezone (UTC+2 or UTC+3 depending on DST)
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jerusalem",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const parts = formatter.formatToParts(d);
        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        expiresAt = `${year}-${month}-${day}T23:59:59+02:00`;
      }
      await addUserPlan(trimmedEmail, addPlan, expiresAt, addNote.trim() || null, false);
      setShowAddDialog(false);
      setAddEmail("");
      setAddPlan("");
      setAddExpiresAt("");
      setAddNote("");
      toast.success(t("ai.userPlans.addSuccess"));
      await refreshData();
    } catch (err) {
      setAddError(mapError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (email: string, force: boolean) => {
    try {
      setSubmitting(true);
      await removeUserPlan(email, force);
      setRemoveDialog(null);
      toast.success(t("ai.userPlans.removeSuccess"));
      await refreshData();
    } catch (err) {
      toast.error(mapError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return t("ai.userPlans.never");
    return new Date(date).toLocaleDateString(i18n.language);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t("ai.userPlans.title")}</h3>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4" />
          <span className="ms-2">{t("ai.userPlans.addUser")}</span>
        </Button>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common:labels.loading")}</p>
      ) : userPlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ai.userPlans.noUsers")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start">
                <th className="py-2">{t("ai.userPlans.email")}</th>
                <th>{t("ai.userPlans.plan")}</th>
                <th>{t("ai.userPlans.source")}</th>
                <th>{t("ai.userPlans.expiresAt")}</th>
                <th>{t("ai.userPlans.note")}</th>
                <th>{t("ai.userPlans.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {userPlans.map((row) => (
                <tr key={row.user_id} className="border-t">
                  <td className="py-2" dir="ltr">{row.user_email}</td>
                  <td>{row.plan}</td>
                  <td>{t(`ai.userPlans.${row.source}`)}</td>
                  <td>{formatDate(row.expires_at)}</td>
                  <td className="max-w-xs truncate">{row.note || ""}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveDialog({ email: row.user_email, source: row.source })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ai.userPlans.addUser")}</DialogTitle>
          </DialogHeader>
          {addError ? (
            <Alert variant="destructive">
              <AlertDescription>{addError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-email">{t("ai.userPlans.emailLabel")}</Label>
              <Input
                id="add-email"
                dir="ltr"
                placeholder={t("ai.userPlans.emailPlaceholder")}
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="add-plan">{t("ai.userPlans.plan")}</Label>
              <Select value={addPlan} onValueChange={setAddPlan}>
                <SelectTrigger id="add-plan">
                  <SelectValue placeholder={t("ai.userPlans.selectPlan")} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.plan} value={plan.plan}>
                      {plan.plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-expiry">{t("ai.userPlans.expiryLabel")}</Label>
              <Input
                id="add-expiry"
                type="date"
                min={getTodayDate()}
                value={addExpiresAt}
                onChange={(e) => setAddExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="add-note">{t("ai.userPlans.noteLabel")}</Label>
              <Input
                id="add-note"
                placeholder={t("ai.userPlans.notePlaceholder")}
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>
              {t("common:actions.cancel")}
            </Button>
            <Button onClick={handleAddUser} disabled={!addEmail.trim() || !addPlan || submitting}>
              {t("ai.userPlans.addUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDialog !== null} onOpenChange={(open) => !open && setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ai.userPlans.remove")}</DialogTitle>
            <DialogDescription>
              {removeDialog?.source === "billing"
                ? t("ai.userPlans.confirmRemoveForce")
                : t("ai.userPlans.confirmRemove", { email: removeDialog?.email })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)} disabled={submitting}>
              {t("common:actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                removeDialog && handleRemove(removeDialog.email, removeDialog.source === "billing")
              }
              disabled={submitting}
            >
              {t("ai.userPlans.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
