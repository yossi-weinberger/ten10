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

  async calculateUserTitheBalance(userId: string): Promise<number> {
    const { data: titheData, error } = await this.supabaseClient.rpc(
      "calculate_user_tithe_balance",
      { p_user_id: userId },
    );

    if (error) {
      console.error(`Error calculating tithe for user ${userId}:`, error);
      return 0; // Return 0 as fallback
    }

    return titheData || 0;
  }

  async getUsersWithTitheBalances(
    reminderDay: number,
  ): Promise<UserWithTitheBalance[]> {
    const users = await this.getReminderUsers(reminderDay);
    const usersWithBalances: UserWithTitheBalance[] = [];

    for (const user of users) {
      const titheBalance = await this.calculateUserTitheBalance(user.id);
      usersWithBalances.push({
        ...user,
        titheBalance,
      });
    }

    return usersWithBalances;
  }
}
