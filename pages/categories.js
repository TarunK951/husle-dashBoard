import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, deleteCategory } from "@/lib/api";
import { Plus, Trash2, X, FolderTree } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", image: "", parentId: "" });

    const fetchCategories = () => {
        setLoading(true);
        setError(null);
        getCategories()
            .then((d) => {
                const list = Array.isArray(d) ? d : (d?.data ?? d?.categories ?? []);
                setCategories(Array.isArray(list) ? list : []);
            })
            .catch((e) => setError(e?.message || "Failed to load categories"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name?.trim()) return;
        setSaving(true);
        try {
            await createCategory({
                name: form.name.trim(),
                ...(form.description?.trim() ? { description: form.description.trim() } : {}),
                ...(form.image?.trim() ? { image: form.image.trim() } : {}),
                ...(form.parentId && Number(form.parentId) > 0 ? { parentId: Number(form.parentId) } : {}),
            });
            setShowModal(false);
            setForm({ name: "", description: "", image: "", parentId: "" });
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to create category");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this category? Products in this category may be affected.")) return;
        try {
            await deleteCategory(id);
            fetchCategories();
        } catch (e) {
            alert(e?.message || "Failed to delete category");
        }
    };

    return (
        <>
            <Head><title>Categories — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <p className="text-sm text-[#6e6e73]">
                            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                        </p>
                        <button
                            onClick={() => { setShowModal(true); setError(null); }}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                        >
                            <Plus size={16} /> Add Category
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1"><X size={16} /></button>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="py-16 text-center text-[#6e6e73] text-sm">
                                No categories yet. Add one to use with products.
                            </div>
                        ) : (
                            <div className="divide-y divide-black/5">
                                {categories.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f5f5f7]/50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
                                                {c.image ? (
                                                    <img src={c.image} alt="" className="w-10 h-10 object-cover rounded-xl" />
                                                ) : (
                                                    <FolderTree size={18} className="text-[#6e6e73]" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#1d1d1f] text-sm truncate">{c.name}</p>
                                                {c.description && (
                                                    <p className="text-xs text-[#6e6e73] truncate mt-0.5">{c.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors shrink-0"
                                            title="Delete category"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add Category</h2>
                                <button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Name *</label>
                                    <input
                                        className={INPUT}
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Phone Cases"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Description</label>
                                    <textarea
                                        className={INPUT}
                                        rows={2}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Optional short description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Image URL</label>
                                    <input
                                        className={INPUT}
                                        type="url"
                                        value={form.image}
                                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Parent Category</label>
                                    <select
                                        className={INPUT}
                                        value={form.parentId}
                                        onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">
                                        {saving ? "Saving…" : "Create Category"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
