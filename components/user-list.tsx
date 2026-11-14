import { Eye, Pencil, Trash2, UsersRound } from "lucide-react";
import { formatDate } from "@/lib/users";
import type { ShopUser } from "@/lib/contracts";

type UserListProps = {
  rows: ShopUser[] | null;
  failed: boolean;
  filtering: boolean;
  onRead: (user: ShopUser) => void;
  onEdit: (user: ShopUser) => void;
  onDelete: (user: ShopUser) => void;
};

export function RoleBadge({ role }: { role: string }) {
  const tone = ["admin", "owner"].includes(role) ? "green" : role === "staff" ? "gold" : "neutral";
  return <span className={`role-badge role-${tone}`} title={role}>{role}</span>;
}

function UserName({ user }: { user: ShopUser }) {
  return <div className="user-name"><span className="user-avatar" aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span><strong>{user.username}</strong></div>;
}

function UserActions({ user, onRead, onEdit, onDelete }: { user: ShopUser } & Pick<UserListProps, "onRead" | "onEdit" | "onDelete">) {
  return <div className="user-actions"><button type="button" className="button button-small button-outline" aria-label={`Read user ${user.username}`} onClick={() => onRead(user)}><Eye aria-hidden="true" />Read</button><button type="button" className="button button-small button-outline" aria-label={`Update user ${user.username}`} onClick={() => onEdit(user)}><Pencil aria-hidden="true" />Update</button><button type="button" className="button button-small button-danger" aria-label={`Delete user ${user.username}`} onClick={() => onDelete(user)}><Trash2 aria-hidden="true" />Delete</button></div>;
}

export function UserList({ rows, failed, filtering, ...actions }: UserListProps) {
  if (!rows && !failed) return <div className="users-skeleton" role="status"><span className="sr-only">Loading users…</span><div aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-row"><span className="skeleton skeleton-avatar" /><span className="skeleton skeleton-name" /><span className="skeleton skeleton-role" /><span className="skeleton skeleton-actions" /></div>)}</div></div>;
  if (!rows?.length) return <div className="empty-state"><span className="empty-symbol"><UsersRound aria-hidden="true" /></span><h3>{failed ? "A little trouble connecting" : filtering ? "No matching users" : "A little room to grow"}</h3><p>{failed ? "Refresh the list to try loading your accounts again." : filtering ? "Try another username or choose a different role." : "Create a user to add someone to your flower shop team."}</p></div>;
  return (
    <>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Users table. Scroll horizontally for more columns.">
        <table className="users-table"><caption className="sr-only">Flower shop user accounts and actions</caption><thead><tr><th scope="col">ID</th><th scope="col">Username</th><th scope="col">Role</th><th scope="col">Created at</th><th scope="col" className="align-right">Actions</th></tr></thead><tbody>{rows.map(user => <tr key={user.id}><td className="id-cell">{user.id}</td><td><UserName user={user} /></td><td><RoleBadge role={user.role} /></td><td className="date-cell">{formatDate(user.created_at)}</td><td><UserActions user={user} {...actions} /></td></tr>)}</tbody></table>
      </div>
      <ul className="user-cards" aria-label="Users">{rows.map(user => <li className="user-card" key={user.id}><div className="user-card-heading"><UserName user={user} /><RoleBadge role={user.role} /></div><dl><div><dt>Account ID</dt><dd>{user.id}</dd></div><div><dt>Created</dt><dd>{formatDate(user.created_at)}</dd></div></dl><UserActions user={user} {...actions} /></li>)}</ul>
    </>
  );
}
