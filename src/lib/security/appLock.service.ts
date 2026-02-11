/**
 * App Lock service for desktop (Tauri). Manages password-protected lock using Stronghold.
 * Only use on desktop; all functions guard against non-desktop or missing APIs.
 */

const VAULT_FILENAME = "app_vault.hold";
const RECOVERY_KEY_HASH_FILENAME = "recovery_key_hash.txt";
const CLIENT_NAME = "app_lock";
const STORE_KEY_INITIALIZED = "initialized";
const RECOVERY_KEY_LENGTH = 24;
const RECOVERY_KEY_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

let strongholdInstance: Awaited<
  ReturnType<typeof import("@tauri-apps/plugin-stronghold").Stronghold.load>
> | null = null;
let isUnlockedFlag = false;

function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__
  );
}

async function getVaultPath(): Promise<string> {
  const { appDataDir } = await import("@tauri-apps/api/path");
  const { join } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  return join(dir, VAULT_FILENAME);
}

async function getRecoveryHashPath(): Promise<string> {
  const { appDataDir } = await import("@tauri-apps/api/path");
  const { join } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  return join(dir, RECOVERY_KEY_HASH_FILENAME);
}

async function hashRecoveryKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns whether app lock is enabled (vault exists). Safe to call on web (returns false).
 */
export async function isDesktopLockEnabled(): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    const path = await getVaultPath();
    const { exists } = await import("@tauri-apps/plugin-fs");
    return await exists(path);
  } catch {
    return false;
  }
}

/**
 * Set up lock with password (first-time setup). Creates vault and recovery key.
 * Removes any existing vault/recovery file first so we always create a fresh vault
 * (avoids BadFileKey from leftover or corrupted files).
 */
export async function setupLock(
  password: string,
): Promise<{ recoveryKey: string }> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  const vaultPath = await getVaultPath();
  const hashPath = await getRecoveryHashPath();
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (await exists(vaultPath)) await remove(vaultPath);
  if (await exists(hashPath)) await remove(hashPath);

  const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
  const stronghold = await Stronghold.load(vaultPath, password);
  let client;
  try {
    client = await stronghold.loadClient(CLIENT_NAME);
  } catch {
    client = await stronghold.createClient(CLIENT_NAME);
  }
  const store = client.getStore();
  await store.insert(STORE_KEY_INITIALIZED, [1]);
  await stronghold.save();

  const recoveryKey = generateRecoveryKeyRandom();
  const hash = await hashRecoveryKey(recoveryKey);
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(hashPath, hash);

  strongholdInstance = stronghold;
  isUnlockedFlag = true;
  return { recoveryKey };
}

function generateRecoveryKeyRandom(): string {
  const arr = new Uint8Array(RECOVERY_KEY_LENGTH);
  crypto.getRandomValues(arr);
  return Array.from(
    arr,
    (b) => RECOVERY_KEY_CHARS[b % RECOVERY_KEY_CHARS.length],
  ).join("");
}

/**
 * Unlock with password. Throws on wrong password or missing vault.
 */
export async function unlock(password: string): Promise<void> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
  const vaultPath = await getVaultPath();
  const stronghold = await Stronghold.load(vaultPath, password);
  await stronghold.loadClient(CLIENT_NAME);
  strongholdInstance = stronghold;
  isUnlockedFlag = true;
}

/**
 * Lock the app (clear in-memory session). Does not remove vault.
 */
export function lockNow(): void {
  if (strongholdInstance) {
    strongholdInstance.unload().catch(() => {});
    strongholdInstance = null;
  }
  isUnlockedFlag = false;
}

/**
 * Whether the app is currently unlocked (session in memory).
 */
export function isUnlocked(): boolean {
  return isUnlockedFlag;
}

/**
 * Verify recovery key against stored hash. Safe to call without being unlocked.
 */
export async function verifyRecoveryKey(key: string): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    const hashPath = await getRecoveryHashPath();
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const { exists } = await import("@tauri-apps/plugin-fs");
    if (!(await exists(hashPath))) return false;
    const storedHash = await readTextFile(hashPath);
    const computedHash = await hashRecoveryKey(key);
    return storedHash.trim() === computedHash;
  } catch {
    return false;
  }
}

/**
 * Generate a new recovery key (after unlock). Overwrites stored hash. Returns the new key to show once.
 */
export async function generateRecoveryKey(): Promise<string> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  if (!isUnlockedFlag)
    throw new Error("Must be unlocked to generate recovery key");
  const recoveryKey = generateRecoveryKeyRandom();
  const hash = await hashRecoveryKey(recoveryKey);
  const hashPath = await getRecoveryHashPath();
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(hashPath, hash);
  return recoveryKey;
}

/**
 * Reset vault and set new password (e.g. after "forgot password" with recovery key).
 * Removes existing vault and recovery hash, then runs setup with new password.
 */
export async function resetVaultWithNewPassword(
  newPassword: string,
): Promise<{ recoveryKey: string }> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  const vaultPath = await getVaultPath();
  const hashPath = await getRecoveryHashPath();
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (strongholdInstance) {
    strongholdInstance.unload().catch(() => {});
    strongholdInstance = null;
  }
  isUnlockedFlag = false;
  if (await exists(vaultPath)) await remove(vaultPath);
  if (await exists(hashPath)) await remove(hashPath);
  return setupLock(newPassword);
}

/**
 * Change password (must be unlocked). Keeps the same recovery key.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  if (!isUnlockedFlag) throw new Error("Must be unlocked to change password");
  const vaultPath = await getVaultPath();
  const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
  let passwordVerifier: Awaited<
    ReturnType<typeof import("@tauri-apps/plugin-stronghold").Stronghold.load>
  > | null = null;
  try {
    passwordVerifier = await Stronghold.load(vaultPath, oldPassword);
    await passwordVerifier.loadClient(CLIENT_NAME);
  } catch {
    throw new Error("Current password is incorrect");
  } finally {
    if (passwordVerifier) {
      await passwordVerifier.unload().catch(() => {});
    }
  }

  const hashPath = await getRecoveryHashPath();
  const { readTextFile, writeTextFile, readFile, writeFile, exists, remove } =
    await import("@tauri-apps/plugin-fs");

  let existingVault: Uint8Array | null = null;
  let existingHash: string | null = null;
  if (await exists(vaultPath)) {
    existingVault = await readFile(vaultPath);
  }
  if (await exists(hashPath)) {
    existingHash = await readTextFile(hashPath);
  }

  try {
    await disableLock();
    await setupLock(newPassword);
    if (existingHash !== null) {
      await writeTextFile(hashPath, existingHash);
    }
  } catch (error) {
    const originalMsg =
      error instanceof Error ? error.message : String(error);
    let rollbackError: unknown = null;

    try {
      // Best-effort rollback: restore original vault/hash so user is not locked out.
      if (await exists(vaultPath)) await remove(vaultPath);
      if (await exists(hashPath)) await remove(hashPath);
      if (existingVault !== null) {
        await writeFile(vaultPath, existingVault);
      }
      if (existingHash !== null) {
        await writeTextFile(hashPath, existingHash);
      }
      try {
        const restored = await Stronghold.load(vaultPath, oldPassword);
        await restored.loadClient(CLIENT_NAME);
        strongholdInstance = restored;
        isUnlockedFlag = true;
      } catch {
        strongholdInstance = null;
        isUnlockedFlag = false;
      }
    } catch (rbErr) {
      rollbackError = rbErr;
    }

    const rollbackMsg = rollbackError
      ? rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError)
      : null;
    throw new Error(
      rollbackMsg
        ? `Failed to change password: ${originalMsg}. Rollback failed: ${rollbackMsg}`
        : `Failed to change password: ${originalMsg}. Rollback completed successfully.`,
    );
  }
}

/**
 * Disable app lock (remove vault and recovery hash). Must be unlocked first.
 */
export async function disableLock(): Promise<void> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  if (!isUnlockedFlag) throw new Error("Must be unlocked to disable lock");
  const vaultPath = await getVaultPath();
  const hashPath = await getRecoveryHashPath();
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (strongholdInstance) {
    strongholdInstance.unload().catch(() => {});
    strongholdInstance = null;
  }
  isUnlockedFlag = false;
  if (await exists(vaultPath)) await remove(vaultPath);
  if (await exists(hashPath)) await remove(hashPath);
}

/**
 * Remove vault and recovery key files only (no unlock required).
 * Use when user has neither password nor recovery key and chooses full app reset.
 * Call after clearAllData(); then reload the app.
 */
export async function removeVaultAndRecoveryKeyOnly(): Promise<void> {
  if (!isDesktop()) throw new Error("App lock is only available on desktop");
  const vaultPath = await getVaultPath();
  const hashPath = await getRecoveryHashPath();
  const { remove, exists } = await import("@tauri-apps/plugin-fs");
  if (strongholdInstance) {
    strongholdInstance.unload().catch(() => {});
    strongholdInstance = null;
  }
  isUnlockedFlag = false;
  if (await exists(vaultPath)) await remove(vaultPath);
  if (await exists(hashPath)) await remove(hashPath);
}
