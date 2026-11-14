"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, Flower2, Plus, RefreshCw, Search, Sprout, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Feedback, LoadingWorkspace } from "@/components/feedback";
import { UserList } from "@/components/user-list";
import { errorMessage } from "@/lib/client";
import { roles, type ShopUser, type UpdateUserInput } from "@/lib/contracts";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "@/lib/users";
import { DeleteUserDialog, ReadUserDialog, UserFormDialog, type UserFormValues } from "./user-dialogs";

type OpenDialog = { kind: "create" } | { kind: "read"; user: ShopUser | null } | { kind: "edit" | "delete"; user: ShopUser };

export default function DashboardPage() {
  const { user, checked, request } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ShopUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const readSequence = useRef(0);
  const loadSequence = useRef(0);
  const signedIn = Boolean(user);

  useEffect(() => { if (checked && !user) router.replace("/"); }, [checked, user, router]);

  // Read / Refresh -> lib/users.ts -> /api/users -> live GET /users.
  const load = useCallback(async () => {
    if (!signedIn) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const users = await listUsers(request);
      if (sequence === loadSequence.current) setRows(users);
    } catch (cause) {
      if (sequence === loadSequence.current) { setRows(null); setError(errorMessage(cause)); }
    } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [request, signedIn]);

  useEffect(() => { void load(); return () => { loadSequence.current++; }; }, [load]);

  function closeDialog() { readSequence.current++; setDialog(null); }

  // Row Read -> live GET /users/:id. Ignore stale responses after closing.
  async function read(row: ShopUser) {
    const sequence = ++readSequence.current;
    setDialog({ kind: "read", user: null });
    try {
      const record = await getUser(request, row.id);
      if (sequence === readSequence.current) setDialog({ kind: "read", user: record });
    } catch (cause) {
      if (sequence === readSequence.current) { setDialog(null); setError(errorMessage(cause)); }
    }
  }

  // Create User -> live POST /users. Do not send a role or an email field.
  async function create(values: UserFormValues) {
    await createUser(request, { username: values.username, password: values.password });
    closeDialog();
    setSuccess("The new user is ready. Use Update if you need to change their role.");
    await load();
  }

  // Update details and role together -> live PUT /users/:id.
  async function save(row: ShopUser, values: UserFormValues) {
    const input: UpdateUserInput = {};
    if (values.username.trim() !== row.username) input.username = values.username.trim();
    if (values.password) input.password = values.password;
    if (values.role !== row.role) {
      const selected = roles.find(role => role === values.role);
      if (selected) input.role = selected;
    }
    if (!Object.keys(input).length) { closeDialog(); return; }
    await updateUser(request, row.id, input);
    closeDialog();
    setSuccess("The account details have been updated.");
    await load();
  }

  // Confirmed Delete -> live DELETE /users/:id. Never retry a lost response.
  async function remove(row: ShopUser) {
    await deleteUser(request, row.id);
    closeDialog();
    setSuccess("The user account has been removed.");
    await load();
  }

  if (!checked || !user) return <LoadingWorkspace />;

  const search = query.trim().toLocaleLowerCase();
  const filtering = Boolean(search || roleFilter !== "all");
  const visible = rows?.filter(row => row.username.toLocaleLowerCase().includes(search) && (roleFilter === "all" || row.role === roleFilter)).sort((a, b) => {
    if (sort === "name") return a.username.localeCompare(b.username);
    const first = a.created_at ? Date.parse(a.created_at) : 0;
    const second = b.created_at ? Date.parse(b.created_at) : 0;
    const difference = (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
    return sort === "oldest" ? -difference || a.id - b.id : difference || b.id - a.id;
  }) ?? null;

  return (
    <main id="main-content" className="dashboard-main container">
      <section className="welcome-banner" aria-labelledby="dashboard-title">
        <div className="welcome-copy"><p className="eyebrow"><Sprout aria-hidden="true" />THE PANIMDIM WORKSPACE</p><h1 id="dashboard-title">People behind<br /><em>every little bloom.</em></h1><p>Manage your flower shop&apos;s accounts and roles,<br className="desktop-break" /> with everything in its place.</p></div>
        <Image className="welcome-bloom" src="/bloom.svg" alt="" width={280} height={280} loading="eager" unoptimized />
      </section>
      <section className="directory" aria-labelledby="users-heading">
        <div className="directory-heading"><div><p className="eyebrow directory-eyebrow">A GROWING COMMUNITY</p><h2 id="users-heading">Manage your users</h2><p>A thoughtful space for every member of your team.</p></div><div className="directory-actions"><button type="button" className="button button-ghost" disabled={loading} onClick={() => { setSuccess(""); void load(); }}><RefreshCw className={loading ? "spin" : undefined} aria-hidden="true" />{loading ? "Refreshing…" : "Read / Refresh"}</button><button type="button" className="button button-primary" onClick={() => { setSuccess(""); setDialog({ kind: "create" }); }}><Plus aria-hidden="true" />Create user</button></div></div>
        {success && !error ? <Feedback tone="success">{success}</Feedback> : null}
        {error ? <Feedback>{error}</Feedback> : null}
        <div className="directory-controls"><div className="search-field"><label className="sr-only" htmlFor="search-users">Search by username</label><Search aria-hidden="true" /><input id="search-users" type="search" placeholder="Search by username…" value={query} onChange={(event) => setQuery(event.target.value)} />{query ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" /></button> : null}</div><div className="sort-control"><ArrowDownWideNarrow aria-hidden="true" /><label htmlFor="sort-users" className="sr-only">Sort accounts</label><select id="sort-users" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Username: A–Z</option></select></div></div>
        <div className="role-filters" role="group" aria-label="Filter users by role"><button type="button" className={`filter-chip${roleFilter === "all" ? " active" : ""}`} aria-pressed={roleFilter === "all"} onClick={() => setRoleFilter("all")}>All accounts</button>{roles.map(role => <button type="button" key={role} className={`filter-chip${roleFilter === role ? " active" : ""}`} aria-pressed={roleFilter === role} onClick={() => setRoleFilter(role)}>{role === "user" ? "Users" : role === "staff" ? "Staff" : role === "admin" ? "Admins" : "Owners"}</button>)}</div>
        <div className="directory-meta"><p role="status">{rows ? `Showing ${visible?.length ?? 0} of ${rows.length} ${rows.length === 1 ? "account" : "accounts"}` : loading ? "Gathering your accounts…" : "Your account directory"}</p><span><Flower2 aria-hidden="true" />A place for everyone.</span></div>
        <div className="users-panel" aria-busy={loading}><UserList rows={visible} failed={Boolean(error)} filtering={filtering} onRead={(row) => void read(row)} onEdit={(row) => { setSuccess(""); setDialog({ kind: "edit", user: row }); }} onDelete={(row) => { setSuccess(""); setDialog({ kind: "delete", user: row }); }} /></div>
      </section>
      {dialog?.kind === "create" ? <UserFormDialog onClose={closeDialog} onSave={create} /> : null}
      {dialog?.kind === "edit" ? <UserFormDialog user={dialog.user} onClose={closeDialog} onSave={(values) => save(dialog.user, values)} /> : null}
      {dialog?.kind === "read" ? <ReadUserDialog user={dialog.user} onClose={closeDialog} /> : null}
      {dialog?.kind === "delete" ? <DeleteUserDialog user={dialog.user} onClose={closeDialog} onDelete={() => remove(dialog.user)} /> : null}
    </main>
  );
}
