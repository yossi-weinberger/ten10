import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: (...args: unknown[]) => mockSingle(...args) }),
      }),
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return {
          eq: (...eqArgs: unknown[]) => mockUpdateEq(...eqArgs),
        };
      },
    }),
    storage: {
      from: () => ({ getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args) }),
    },
  },
}));

import {
  fetchUserProfileDisplay,
  fetchProfileFullName,
  updateProfileFullName,
} from "./profile.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchUserProfileDisplay", () => {
  it("returns full_name and passes through an already-full avatar URL unchanged", async () => {
    mockSingle.mockResolvedValue({
      data: { full_name: "Yossi", avatar_url: "https://cdn.example.com/pic.png" },
      error: null,
      status: 200,
    });
    const result = await fetchUserProfileDisplay("u1");
    expect(result).toEqual({ fullName: "Yossi", avatarUrl: "https://cdn.example.com/pic.png" });
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });

  it("resolves a storage path via getPublicUrl", async () => {
    mockSingle.mockResolvedValue({
      data: { full_name: "Yossi", avatar_url: "u1/avatar.png" },
      error: null,
      status: 200,
    });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://supabase.example/avatars/u1/avatar.png" } });
    const result = await fetchUserProfileDisplay("u1");
    expect(mockGetPublicUrl).toHaveBeenCalledWith("u1/avatar.png");
    expect(result.avatarUrl).toBe("https://supabase.example/avatars/u1/avatar.png");
  });

  it("returns null avatarUrl when the profile has none", async () => {
    mockSingle.mockResolvedValue({ data: { full_name: "Yossi", avatar_url: null }, error: null, status: 200 });
    const result = await fetchUserProfileDisplay("u1");
    expect(result).toEqual({ fullName: "Yossi", avatarUrl: null });
  });

  it("treats a 406 (no row found) as an empty profile instead of throwing", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "no rows" }, status: 406 });
    const result = await fetchUserProfileDisplay("u1");
    expect(result).toEqual({ fullName: null, avatarUrl: null });
  });

  it("throws on a real fetch error (non-406)", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "network error" }, status: 500 });
    await expect(fetchUserProfileDisplay("u1")).rejects.toEqual({ message: "network error" });
  });
});

describe("fetchProfileFullName", () => {
  it("returns the full_name string from the profile row", async () => {
    mockSingle.mockResolvedValue({
      data: { full_name: "Yossi Weinberger" },
      error: null,
      status: 200,
    });
    await expect(fetchProfileFullName("u1")).resolves.toBe("Yossi Weinberger");
  });

  it("returns an empty string when full_name is null", async () => {
    mockSingle.mockResolvedValue({ data: { full_name: null }, error: null, status: 200 });
    await expect(fetchProfileFullName("u1")).resolves.toBe("");
  });

  it("treats a 406 (no row) as an empty name", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "no rows" }, status: 406 });
    await expect(fetchProfileFullName("u1")).resolves.toBe("");
  });

  it("throws on a real fetch error (non-406)", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "network error" }, status: 500 });
    await expect(fetchProfileFullName("u1")).rejects.toEqual({ message: "network error" });
  });
});

describe("updateProfileFullName", () => {
  it("updates full_name and resolves when Supabase succeeds", async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    await expect(updateProfileFullName("u1", "New Name")).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: "New Name" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "u1");
  });

  it("stores an empty name as null", async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    await updateProfileFullName("u1", "");
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: null });
  });

  it("throws when the update fails", async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: "rls denied" } });
    await expect(updateProfileFullName("u1", "X")).rejects.toEqual({ message: "rls denied" });
  });
});
