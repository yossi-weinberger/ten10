import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function AdminUserPlans() {
  const { t, i18n } = useTranslation("admin");
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [userPlans, setUserPlans] = useState<AdminUserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<{ email: string; source: string } | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addPlan, setAddPlan] = useState("");
  const [addExpiresAt, setAddExpiresAt] = useState("");
  const [addNote, setAddNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [plansData, userPlansData] = await Promise.all([fetchPlans(), fetchUserPlans()]);
        setPlans(plansData);
        setUserPlans(userPlansData);
      } catch {
        setError(t("ai.userPlans.addError"));
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [t]);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, userPlansData] = await Promise.all([fetchPlans(), fetchUserPlans()]);
      setPlans(plansData);
      setUserPlans(userPlansData);
    } catch {
      setError(t("ai.userPlans.addError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!addEmail || !addPlan) return;
    try {
      setSubmitting(true);
      await addUserPlan(addEmail, addPlan, addExpiresAt || null, addNote || null, false);
      setShowAddDialog(false);
      setAddEmail("");
      setAddPlan("");
      setAddExpiresAt("");
      setAddNote("");
      await refreshData();
    } catch {
      setError(t("ai.userPlans.addError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (email: string, force: boolean) => {
    try {
      setSubmitting(true);
      await removeUserPlan(email, force);
      setRemoveDialog(null);
      await refreshData();
    } catch {
      setError(t("ai.userPlans.removeError"));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return t("ai.userPlans.never");
    return new Date(date).toLocaleDateString(i18n.language);
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
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
                  <td className="py-2">{row.user_email}</td>
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
          <div className="space-y-4">
            <div>
              <Input
                placeholder={t("ai.userPlans.emailPlaceholder")}
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div>
              <Select value={addPlan} onValueChange={setAddPlan}>
                <SelectTrigger>
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
              <Input
                type="date"
                placeholder={t("ai.userPlans.optional")}
                value={addExpiresAt}
                onChange={(e) => setAddExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder={t("ai.userPlans.notePlaceholder")}
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAddUser} disabled={!addEmail || !addPlan || submitting}>
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
              {t("cancel")}
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
