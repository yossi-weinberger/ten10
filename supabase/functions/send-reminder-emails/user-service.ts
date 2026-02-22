/**
 * User Service for fetching reminder users and calculating tithe balances
 * Handles all user-related database operations
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface ReminderUser {
  id: string;
  email: string;
  reminder_enabled: boolean;
  reminder_day_of_month: number;
}

export interface UserWithTitheBalance extends ReminderUser {
  titheBalance: number;
  maaserBalance?: number;
  chomeshBalance?: number;
}

export class UserService {
  private supabaseClient: any;

  constructor() {
    this.supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async getReminderUsers(reminderDay: number): Promise<ReminderUser[]> {
    const { data: users, error } = await this.supabaseClient.rpc(
      "get_reminder_users_with_emails",
      { reminder_day: reminderDay },
    );

    if (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }

    return users || [];
  }

  async calculateUserTitheBalance(
    userId: string,
  ): Promise<{ total: number; maaser: number; chomesh: number }> {
    const { data: titheData, error } = await this.supabaseClient.rpc(
      "calculate_user_tithe_balance",
      { p_user_id: userId },
    );

    if (error) {
      console.error(`Error calculating tithe for user ${userId}:`, error);
      return { total: 0, maaser: 0, chomesh: 0 };
    }

    // Handle new TABLE format (array of row objects)
    if (Array.isArray(titheData) && titheData.length > 0) {
      const row = titheData[0];
      return {
        total: row.total_balance ?? 0,
        maaser: row.maaser_balance ?? row.total_balance ?? 0,
        chomesh: row.chomesh_balance ?? 0,
      };
    }

    // Handle old scalar format (backward compat)
    if (typeof titheData === "number") {
      return { total: titheData, maaser: titheData, chomesh: 0 };
    }

    return { total: 0, maaser: 0, chomesh: 0 };
  }

  async getUsersWithTitheBalances(
    reminderDay: number,
  ): Promise<UserWithTitheBalance[]> {
    const users = await this.getReminderUsers(reminderDay);
    const usersWithBalances: UserWithTitheBalance[] = [];

    for (const user of users) {
      const balanceData = await this.calculateUserTitheBalance(user.id);
      usersWithBalances.push({
        ...user,
        titheBalance: balanceData.total,
        maaserBalance: balanceData.maaser,
        chomeshBalance: balanceData.chomesh,
      });
    }

    return usersWithBalances;
  }
}
