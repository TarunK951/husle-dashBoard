import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { listStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from "@/lib/api";
import { normalizePermLevel } from "@/lib/permissions";
import { Users, Plus, Trash2, Save, Shield } from "lucide-react";

const PERM_ROWS = [
    { key: "homepage", label: "Homepage (hero, essentials, offers, stories, …)" },
    { key: "pages", label: "About & Support pages" },
    { key: "navigation", label: "Navigation (navbar)" },
    { key: "searchConfig", label: "Search config" },
    { key: "products", label: "Products & uploads" },
    { key: "categories", label: "Categories" },
    { key: "orders", label: "Orders" },
    { key: "reviews", label: "Product reviews" },
    { key: "settings", label: "Store settings & offers" },
];

const ACCESS_SELECT_CLASS =
    "min-w-[140px] px-3 py-2 rounded-lg border border-black/10 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]";

function levelLabel(v) {
    const n = normalizePermLevel(v);
    if (n === "write") return "Edit";
    if (n === "read") return "View only";
    return null;
}

function summarizePermissions(dashboardPermissions) {
    if (!dashboardPermissions || typeof dashboardPermissions !== "object") return "No sections";
    const parts = [];
    PERM_ROWS.forEach(({ key, label }) => {
        const lbl = levelLabel(dashboardPermissions[key]);
        if (lbl) parts.push(`${label.split("(")[0].trim()}: ${lbl}`);
    });
    return parts.length ? parts.join(" · ") : "No sections";
}

const emptyForm = {
    username: "",
    email: "",
    password: "",
    dashboardPermissions: {},
};

function PermAccessSelect({ value, onChange }) {
    const v = value == null || value === "" ? "" : normalizePermLevel(value) === "write" ? "write" : normalizePermLevel(value) === "read" ? "read" : "";
    return (
        <select
            className={ACCESS_SELECT_CLASS}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Access level"
        >
            <option value="">No access</option>
            <option value="read">View only</option>
            <option value="write">Edit</option>
        </select>
    );
}

export default function TeamPage() {
    const router = useRouter();
    const [me, setMe] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem("hustle_admin_user");
            const u = raw ? JSON.parse(raw) : null;
            setMe(u);
            if (u?.role !== "admin") router.replace("/");
        } catch {
            router.replace("/login");
        }
    }, [router]);

    const load = useCallback(() => {
        setLoading(true);
        listStaffUsers()
            .then((d) => setStaff(Array.isArray(d.staff) ? d.staff : []))
            .catch((e) => setError(e?.message || "Failed to load"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (me?.role === "admin") load();
    }, [me?.role, load]);

    const setPermLevel = (key, level, state, setState) => {
        const next = { ...(state.dashboardPermissions || {}) };
        if (!level) delete next[key];
        else next[key] = level;
        setState({ ...state, dashboardPermissions: next });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.email?.trim() || !form.password || !form.username?.trim()) {
            alert("Username, email, and password are required.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createStaffUser({
                username: form.username.trim(),
                email: form.email.trim(),
                password: form.password,
                dashboardPermissions: form.dashboardPermissions,
            });
            setForm(emptyForm);
            load();
        } catch (err) {
            setError(err?.message || "Failed to create");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            await updateStaffUser(editing.id, {
                email: editing.email,
                username: editing.username,
                dashboardPermissions: editing.dashboardPermissions || {},
                ...(editing.newPassword?.trim() ? { password: editing.newPassword.trim() } : {}),
            });
            setEditing(null);
            load();
        } catch (err) {
            alert(err?.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this staff user? They will no longer be able to log in.")) return;
        try {
            await deleteStaffUser(id);
            if (editing?.id === id) setEditing(null);
            load();
        } catch (err) {
            alert(err?.message || "Delete failed");
        }
    };

    if (me?.role !== "admin") {
        return (
            <Layout>
                <div className="p-8 text-sm text-[#6e6e73]">Checking access…</div>
            </Layout>
        );
    }

    return (
        <>
            <Head><title>Team & access — Hustle Admin</title></Head>
            <Layout>
                <div className="max-w-3xl mx-auto space-y-8 fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-[#1d1d1f]">Team & access</h1>
                            <p className="text-sm text-[#6e6e73]">
                                Create staff logins and set <strong className="font-medium text-[#1d1d1f]">View only</strong> (browse) or{" "}
                                <strong className="font-medium text-[#1d1d1f]">Edit</strong> (create, update, cancel orders, etc.) per section.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                            <Plus size={16} /> New staff user
                        </h2>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="grid sm:grid-cols-3 gap-3">
                            <input
                                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm"
                                placeholder="Display name"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                            />
                            <input
                                type="email"
                                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm"
                                placeholder="Email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            <input
                                type="password"
                                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm"
                                placeholder="Password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-[#6e6e73]">Access by section</p>
                            <div className="space-y-2 rounded-xl border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden">
                                {PERM_ROWS.map(({ key, label }) => (
                                    <div key={key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-black/[0.02]">
                                        <span className="text-sm text-[#1d1d1f]">{label}</span>
                                        <PermAccessSelect
                                            value={form.dashboardPermissions[key]}
                                            onChange={(level) => setPermLevel(key, level, form, setForm)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Create staff user"}
                        </button>
                    </form>

                    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center gap-2">
                            <Users size={18} className="text-[#6e6e73]" />
                            <h2 className="text-sm font-semibold text-[#1d1d1f]">Staff accounts</h2>
                        </div>
                        {loading ? (
                            <div className="p-8 text-sm text-[#6e6e73]">Loading…</div>
                        ) : staff.length === 0 ? (
                            <div className="p-8 text-sm text-[#6e6e73]">No staff users yet.</div>
                        ) : (
                            <ul className="divide-y divide-black/[0.06]">
                                {staff.map((row) => (
                                    <li key={row.id} className="p-4 sm:p-6 space-y-3">
                                        {editing?.id === row.id ? (
                                            <div className="space-y-3">
                                                <div className="grid sm:grid-cols-2 gap-2">
                                                    <input
                                                        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm"
                                                        value={editing.username}
                                                        onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                                                    />
                                                    <input
                                                        type="email"
                                                        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm"
                                                        value={editing.email}
                                                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                                                    />
                                                </div>
                                                <input
                                                    type="password"
                                                    className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm"
                                                    placeholder="New password (optional)"
                                                    value={editing.newPassword || ""}
                                                    onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })}
                                                />
                                                <div className="space-y-2 rounded-xl border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden">
                                                    {PERM_ROWS.map(({ key, label }) => (
                                                        <div key={key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-black/[0.02]">
                                                            <span className="text-sm text-[#1d1d1f]">{label}</span>
                                                            <PermAccessSelect
                                                                value={editing.dashboardPermissions?.[key]}
                                                                onChange={(level) => setPermLevel(key, level, editing, setEditing)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveEdit}
                                                        disabled={saving}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1d1d1f] text-white text-xs font-medium disabled:opacity-50"
                                                    >
                                                        <Save size={14} /> Save
                                                    </button>
                                                    <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-[#1d1d1f]">{row.username}</p>
                                                    <p className="text-xs text-[#6e6e73]">{row.email}</p>
                                                    <p className="text-[11px] text-[#86868b] mt-2 leading-relaxed">{summarizePermissions(row.dashboardPermissions)}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditing({
                                                                id: row.id,
                                                                username: row.username,
                                                                email: row.email,
                                                                dashboardPermissions: { ...(row.dashboardPermissions || {}) },
                                                                newPassword: "",
                                                            })
                                                        }
                                                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(row.id)}
                                                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} className="inline" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}
