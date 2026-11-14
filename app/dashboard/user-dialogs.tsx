"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Save, Trash2, UserRound } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Feedback } from "@/components/feedback";
import { PasswordField } from "@/components/password-field";
import { RoleBadge } from "@/components/user-list";
import { errorMessage } from "@/lib/client";
import { roles, type ShopUser } from "@/lib/contracts";
import { formatDate } from "@/lib/users";

export type UserFormValues = { username: string; password: string; role: string };

export function UserFormDialog({ user, onClose, onSave }: { user?: ShopUser; onClose: () => void; onSave: (input: UserFormValues) => Promise<void> }) {
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prefix = user ? "edit" : "create";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try { await onSave({ username: username.trim(), password, role }); }
    catch (cause) { setError(errorMessage(cause)); setBusy(false); }
  }

  return (
    <Dialog title={user ? "Update a user" : "A new place on the team"} description={user ? `Update ${user.username}'s details or access. Leave the password blank to keep the current one.` : "Create an account for your flower shop. New accounts start with the user role."} busy={busy} onClose={onClose}>
      <form className="user-form" onSubmit={submit}>
        <div className="field"><label htmlFor={`${prefix}-username`}>Username</label><input className="input" id={`${prefix}-username`} name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={50} pattern={".*\\S.*"} autoFocus required disabled={busy} /></div>
        <PasswordField id={`${prefix}-password`} label={user ? "New password (optional)" : "Password"} value={password} onChange={setPassword} autoComplete="new-password" required={!user} minLength={8} disabled={busy} describedBy={`${prefix}-password-hint`} />
        <p className="field-hint" id={`${prefix}-password-hint`}>{user ? "Leave blank to keep the current password." : "Use at least 8 characters. Your password stays private."}</p>
        {user ? <div className="field"><label htmlFor="edit-role">Role</label><select className="input" id="edit-role" name="role" value={role} disabled={busy} onChange={(event) => setRole(event.target.value)}>{!roles.some(value => value === user.role) ? <option value={user.role}>{user.role}</option> : null}{roles.map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select><p className="field-hint">Roles control access to the shop workspace.</p></div> : null}
        {error ? <Feedback>{error}</Feedback> : null}
        <div className="dialog-actions"><button type="button" className="button button-outline" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : user ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}{busy ? "Saving…" : user ? "Save changes" : "Create user"}</button></div>
      </form>
    </Dialog>
  );
}

export function ReadUserDialog({ user, onClose }: { user: ShopUser | null; onClose: () => void }) {
  return (
    <Dialog title="A closer look" description="The account details stored in your flower shop's backend." onClose={onClose}>
      {user ? <><div className="account-preview"><span className="user-avatar" aria-hidden="true"><UserRound /></span><strong>{user.username}</strong><RoleBadge role={user.role} /></div><dl className="account-details"><div><dt>Account ID</dt><dd>{user.id}</dd></div><div><dt>Username</dt><dd>{user.username}</dd></div><div><dt>Role</dt><dd><RoleBadge role={user.role} /></dd></div><div><dt>Created at</dt><dd>{formatDate(user.created_at)}</dd></div></dl></> : <p className="details-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />Loading account details…</p>}
      <div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Close</button></div>
    </Dialog>
  );
}

export function DeleteUserDialog({ user, onClose, onDelete }: { user: ShopUser; onClose: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await onDelete(); }
    catch (cause) { setError(errorMessage(cause)); setBusy(false); }
  }

  return <Dialog title="Remove this account?" description={`Are you sure you want to delete ${user.username}? This permanently removes account #${user.id} and cannot be undone.`} busy={busy} onClose={onClose}><div className="dialog-symbol dialog-symbol-danger"><Trash2 aria-hidden="true" /></div>{error ? <Feedback>{error}</Feedback> : null}<div className="dialog-actions"><button type="button" className="button button-outline" autoFocus disabled={busy} onClick={onClose}>Keep account</button><button type="button" className="button button-danger-solid" disabled={busy} onClick={() => void remove()}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{busy ? "Deleting…" : "Yes, delete user"}</button></div></Dialog>;
}
