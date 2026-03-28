import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, updateCategory, deleteCategory, uploadImage } from "@/lib/api";
import { Plus, Trash2, X, Save, Undo2, Pencil, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", image: "" });
    const [editCategory, setEditCategory] = useState(null);
    const [lastAction, setLastAction] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef(null);

    // Categories are flat (no nested groups / sub-types under a category).
    const rootCategories = categories.filter((c) => c.parentId == null || c.parentId === "");

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

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        if (!form.name?.trim()) return;
        setSaving(true);
        setLastAction(null);
        try {
            const payload = {
                name: form.name.trim(),
                ...(form.image?.trim() ? { image: form.image.trim() } : {}),
            };
            if (editCategory && editCategory.id != null) {
                await updateCategory(editCategory.id, payload);
                setShowModal(false);
                setEditCategory(null);
                setForm({ name: "", image: "" });
            } else {
                const created = await createCategory(payload);
                const newId = created?.id ?? created?.data?.id;
                if (newId) setLastAction({ type: "createCategory", categoryId: newId });
                setShowModal(false);
                setForm({ name: "", image: "" });
            }
            fetchCategories();
        } catch (e) {
            setError(e?.message || (editCategory ? "Failed to update category" : "Failed to create category"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this category? Products in this category may be affected.")) return;
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        try {
            await deleteCategory(id);
            setLastAction({ type: "deleteCategory", category: { name: cat.name, description: cat.description, image: cat.image, model3d: cat.model3d } });
            fetchCategories();
        } catch (e) {
            alert(e?.message || "Failed to delete category");
        }
    };

    const handleSave = () => {
        setError(null);
        fetchCategories();
    };

    const handleUndo = async () => {
        const action = lastAction;
        if (!action?.type) return;
        setSaving(true);
        setError(null);
        try {
            if (action.type === "createCategory") {
                await deleteCategory(action.categoryId);
            } else if (action.type === "deleteCategory") {
                await createCategory(action.category);
            }
            setLastAction(null);
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Undo failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head><title>Categories — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in max-w-4xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-lg font-semibold text-[#1d1d1f]">Categories</h1>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleSave} disabled={loading} className="p-2 rounded-lg text-[#6e6e73] hover:bg-black/5 hover:text-[#1d1d1f]" title="Refresh"><Save size={18} /></button>
                            <button type="button" onClick={handleUndo} disabled={loading || saving || !lastAction} className="p-2 rounded-lg text-[#6e6e73] hover:bg-black/5 hover:text-[#1d1d1f]" title="Undo"><Undo2 size={18} /></button>
                            <button onClick={() => { setEditCategory(null); setForm({ name: "", image: "" }); setShowModal(true); setError(null); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black">
                                <Plus size={16} /> Add category
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center justify-between">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)} className="p-1 text-red-500 hover:text-red-700"><X size={14} /></button>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                        <div className="px-4 py-3 border-b border-black/[0.06]">
                            <p className="text-xs text-[#6e6e73]">Categories are flat. Products are created under a category; models/colors are managed inside the product.</p>
                        </div>
                        {loading ? (
                            <div className="p-5 space-y-2">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-black/5 animate-pulse" />)}
                            </div>
                        ) : rootCategories.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <p className="text-sm text-[#6e6e73] mb-3">No categories yet.</p>
                                <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", image: "" }); setShowModal(true); setError(null); }} className="text-sm font-medium text-[#1d1d1f] underline hover:no-underline">Add category</button>
                            </div>
                        ) : (
                            <div className="divide-y divide-black/[0.06]">
                                {rootCategories.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-black/[0.02] transition-colors min-h-[44px]">
                                        <div className="min-w-0">
                                            <p className="font-medium text-[#1d1d1f] truncate">{c.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button type="button" onClick={() => { setEditCategory(c); setForm({ name: c.name || "", image: c.image || "" }); setShowModal(true); setError(null); }} className="p-1.5 rounded-md hover:bg-black/10 text-[#6e6e73]" title="Edit"><Pencil size={14} /></button>
                                            <button type="button" onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-red-50 text-[#6e6e73] hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-[#6e6e73]">{categories.length} categor{categories.length === 1 ? "y" : "ies"} total</p>
                </div>

                {/* Add / Edit Category modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => { setShowModal(false); setEditCategory(null); }}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                                <h2 className="text-sm font-semibold text-[#1d1d1f]">{editCategory ? "Edit category" : "Add category"}</h2>
                                <button type="button" onClick={() => { setShowModal(false); setEditCategory(null); }} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleCreateOrUpdate} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Name</label>
                                    <input className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Galaxy S24" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Category image (optional)</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setUploadingImage(true);
                                                try {
                                                    const data = await uploadImage(file);
                                                    const url = data.url || data.secure_url || data.fileUrl || "";
                                                    if (url) setForm((f) => ({ ...f, image: url }));
                                                } catch (err) {
                                                    setError(err?.message || "Image upload failed");
                                                } finally {
                                                    setUploadingImage(false);
                                                    e.target.value = "";
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium hover:bg-black/5 disabled:opacity-60"
                                        >
                                            {uploadingImage ? "…" : <><Upload size={12} /> Upload</>}
                                        </button>
                                        {form.image && (
                                            <>
                                                <img src={form.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-black/10" />
                                                <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="text-xs text-red-600 hover:underline">Clear</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => { setShowModal(false); setEditCategory(null); }} className="flex-1 py-2 rounded-lg border border-black/10 text-sm font-medium hover:bg-black/5">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black disabled:opacity-60">{saving ? "Saving…" : editCategory ? "Save" : "Create"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
