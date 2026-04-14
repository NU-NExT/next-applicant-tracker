import { useCallback, useEffect, useMemo, useState } from "react";

import {
  authCreateAdmin,
  authDeleteUser,
  authListUsers,
  authSetUserActive,
  authSetUserRole,
  type AdminManagedUser,
} from "../api";
import { Header } from "../components/header";

const APP_ENVIRONMENT = (import.meta.env.VITE_ENVIRONMENT ?? "development").toLowerCase();
const IS_CLOUD_ENV = APP_ENVIRONMENT === "production" || APP_ENVIRONMENT === "staging";
const DEFAULT_REDIRECT_URI = IS_CLOUD_ENV ? "https://gateway.nunext.dev/login" : "http://localhost:3000/login";
const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? "").trim();
const COGNITO_CLIENT_ID = (import.meta.env.VITE_COGNITO_CLIENT_ID ?? "").trim();
const COGNITO_REDIRECT_URI = (import.meta.env.VITE_COGNITO_REDIRECT_URI ?? "").trim() || DEFAULT_REDIRECT_URI;

function buildCognitoLink(mode: "login" | "signup", email: string): string | null {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) return null;
  const query = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: COGNITO_REDIRECT_URI,
  });
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) query.set("login_hint", normalizedEmail);
  if (mode === "signup") query.set("screen_hint", "signup");
  return `https://${COGNITO_DOMAIN}/login?${query.toString()}`;
}

export function AdminManageAccountsPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const currentEmail = (localStorage.getItem("auth_user_email") ?? "").trim().toLowerCase();
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const loginLink = useMemo(() => buildCognitoLink("login", adminEmail), [adminEmail]);
  const signupLink = useMemo(() => buildCognitoLink("signup", adminEmail), [adminEmail]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      setStatusMessage("Missing access token. Please log in again.");
      return;
    }
    try {
      const rows = await authListUsers(token);
      setUsers(rows);
    } catch {
      setStatusMessage("Could not load user list.");
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return users;
    return users.filter((user) => {
      const haystack = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase();
      return haystack.includes(key);
    });
  }, [search, users]);

  const runAction = async (key: string, action: () => Promise<void>, successMessage: string) => {
    setBusyKey(key);
    setStatusMessage("");
    try {
      await action();
      setStatusMessage(successMessage);
      await loadUsers();
    } catch {
      setStatusMessage("Action failed. Please try again.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-5xl font-medium text-[#1f1f1f]">Admin account management</h1>
          <a href="/admin-dashboard" className="rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline">
            Back to dashboard
          </a>
        </div>

        <section className="mb-5 border border-[#c7c7c7] bg-[#d8d8d8] p-4">
          <h2 className="border-b border-[#b5b5b5] pb-1 text-2xl text-[#2d2d2d]">Create admin + share Cognito links</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1.1fr_1.1fr_auto]">
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded border border-[#bcbcbc] px-3 py-2"
            />
            <input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="name@northeastern.edu"
              className="w-full rounded border border-[#bcbcbc] px-3 py-2"
            />
            <button
              type="button"
              className="rounded bg-[#1f6f5f] px-4 py-2 text-white disabled:opacity-60"
              disabled={!token || !adminName.trim() || !adminEmail.trim() || busyKey === "create-admin"}
              onClick={() =>
                void runAction(
                  "create-admin",
                  async () => {
                    await authCreateAdmin({ name: adminName, email: adminEmail }, token);
                  },
                  "ADMIN account created. Cognito invitation email sent."
                )
              }
            >
              {busyKey === "create-admin" ? "Creating..." : "Create admin"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={loginLink ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded bg-[#1f6f5f] px-4 py-2 text-white no-underline ${loginLink ? "" : "pointer-events-none opacity-50"}`}
            >
              Send login link
            </a>
            <a
              href={signupLink ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded bg-[#1f6f5f] px-4 py-2 text-white no-underline ${signupLink ? "" : "pointer-events-none opacity-50"}`}
            >
              Send signup link
            </a>
            {!loginLink || !signupLink ? (
              <p className="text-sm text-[#444]">Set `VITE_COGNITO_DOMAIN` and `VITE_COGNITO_CLIENT_ID` to enable shareable links.</p>
            ) : null}
          </div>
        </section>

        <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b5b5b5] pb-2">
            <h2 className="text-2xl text-[#2d2d2d]">Manage roles and user accounts</h2>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="rounded border border-[#bcbcbc] px-3 py-2"
              />
              <button
                type="button"
                className="rounded bg-[#1f6f5f] px-3 py-2 text-white disabled:opacity-60"
                disabled={busyKey === "refresh"}
                onClick={() =>
                  void runAction(
                    "refresh",
                    async () => {
                      await loadUsers();
                    },
                    "User list refreshed."
                  )
                }
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#2d2d2d]">
              <thead>
                <tr className="border-b border-[#b5b5b5]">
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const ownAccount = user.email.toLowerCase() === currentEmail;
                  return (
                    <tr key={user.user_id} className="border-b border-[#cfcfcf] align-top">
                      <td className="px-2 py-2">{`${user.first_name} ${user.last_name}`.trim() || "Unknown"}</td>
                      <td className="px-2 py-2">{user.email}</td>
                      <td className="px-2 py-2">{user.is_admin ? "ADMIN" : "USER"}</td>
                      <td className="px-2 py-2">{user.is_active ? "Active" : "Deactivated"}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded bg-[#1f6f5f] px-3 py-1 text-white disabled:opacity-60"
                            disabled={ownAccount || busyKey === `role-${user.user_id}`}
                            onClick={() =>
                              void runAction(
                                `role-${user.user_id}`,
                                async () => {
                                  await authSetUserRole({ email: user.email, is_admin: !user.is_admin }, token);
                                },
                                `Updated ${user.email} role.`
                              )
                            }
                          >
                            {user.is_admin ? "Remove admin" : "Make admin"}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-[#1f6f5f] px-3 py-1 text-white disabled:opacity-60"
                            disabled={ownAccount || busyKey === `active-${user.user_id}`}
                            onClick={() =>
                              void runAction(
                                `active-${user.user_id}`,
                                async () => {
                                  await authSetUserActive({ email: user.email, is_active: !user.is_active }, token);
                                },
                                `Updated ${user.email} account status.`
                              )
                            }
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-[#7a1d1d] px-3 py-1 text-white disabled:opacity-60"
                            disabled={ownAccount || busyKey === `delete-${user.user_id}`}
                            onClick={() => {
                              const ok = window.confirm(`Delete ${user.email}? This removes the account from Cognito and ATS.`);
                              if (!ok) return;
                              void runAction(
                                `delete-${user.user_id}`,
                                async () => {
                                  await authDeleteUser({ email: user.email }, token);
                                },
                                `Deleted ${user.email}.`
                              );
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-[#444]">
                      No users found for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {statusMessage ? <p className="mt-3 text-sm text-[#333]">{statusMessage}</p> : null}
      </main>
    </div>
  );
}
