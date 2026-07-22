export type AccountRole = "manager" | "commissioner";

export type AccountProfile = {
  userId: string;
  franchiseId: string;
  franchiseName: string;
  username: string;
  displayName: string;
  role: AccountRole;
  mustChangePassword: boolean;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function accountEmail(username: string) {
  const normalized = normalizeUsername(username);
  return normalized ? `${normalized}@okfl.example.com` : "";
}
