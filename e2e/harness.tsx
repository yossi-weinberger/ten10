import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

import { TransactionForm } from "@/components/forms/TransactionForm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import i18n from "@/lib/i18n";
import "@/index.css";
import type { Transaction } from "@/types/transaction";
import type { TransactionFormValues } from "@/lib/schemas";

declare global {
  interface Window {
    __E2E_SAVES__: TransactionFormValues[];
  }
}

window.__E2E_SAVES__ = [];

const initialSettings = useDonationStore.getState().settings;
useDonationStore.setState({
  settings: {
    ...initialSettings,
    calendarType: "gregorian",
    language: "he",
    defaultCurrency: "ILS",
  },
});
void i18n.changeLanguage("he");

const existingTransaction: Transaction = {
  id: "e2e-edit-1",
  user_id: "e2e",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  date: "2026-06-15",
  amount: 10,
  currency: "ILS",
  description: "existing",
  type: "income",
  category: null,
  is_chomesh: false,
  recipient: null,
  payment_method: null,
};

async function recordSave(values: TransactionFormValues) {
  window.__E2E_SAVES__.push(values);
}

function AddPage() {
  return <TransactionForm onOverrideSubmit={recordSave} />;
}

function EditPage() {
  return (
    <TransactionForm
      isEditMode
      initialData={existingTransaction}
      onOverrideSubmit={recordSave}
    />
  );
}

const mode = new URLSearchParams(window.location.search).get("mode");
const initialPath =
  mode === "edit" ? "/edit-transaction" : "/add-transaction";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
const addRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-transaction",
  component: AddPage,
});
const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit-transaction",
  component: EditPage,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([addRoute, editRoute]),
  history: createMemoryHistory({ initialEntries: [initialPath] }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </PlatformProvider>
  </StrictMode>,
);
