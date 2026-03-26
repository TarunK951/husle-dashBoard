import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, updateCategory, deleteCategory, uploadImage } from "@/lib/api";
import { Plus, Trash2, X, FolderTree, ChevronDown, ChevronRight, Save, Undo2, Pencil, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showSortByModal, setShowSortByModal] = useState(false);
    const [showAddToGroupModal, setShowAddToGroupModal] = useState(null);
    const [showAddSortOptionModal, setShowAddSortOptionModal] = useState(null);
    const [sortOptionLabel, setSortOptionLabel] = useState("");
    const [sortOptionValue, setSortOptionValue] = useState("");
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", image: "" });
    const [editCategory, setEditCategory] = useState(null);
    const [sortByName, setSortByName] = useState("");
    const [expandedSortBy, setExpandedSortBy] = useState(new Set());
    const [lastAction, setLastAction] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef(null);

    const sortByGroups = categories.filter((c) => c.parentId == null || c.parentId === "");
    const childCategories = (parentId) => categories.filter((c) => Number(c.parentId) === Number(parentId));

    // New flow: categories are flat (no Category → Brand → Model tree)
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

    const toggleSortBy = (id) => {
        setExpandedSortBy((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
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

    const handleCreateSortBy = async (e) => {
        e.preventDefault();
        if (!sortByName?.trim()) return;
        setSaving(true);
        setLastAction(null);
        try {
            const created = await createCategory({ name: sortByName.trim() });
            const newId = created?.id ?? created?.data?.id;
            if (newId) setLastAction({ type: "createSortBy", categoryId: newId });
            setShowSortByModal(false);
            setSortByName("");
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to create Sort by");
        } finally {
            setSaving(false);
        }
    };

    const handleAddCategoryToGroup = async (groupId, categoryId) => {
        const cat = categories.find((c) => c.id === categoryId);
        if (!cat) return;
        setSaving(true);
        const previousParentId = cat.parentId != null && cat.parentId !== "" ? Number(cat.parentId) : null;
        try {
            await updateCategory(categoryId, {
                name: cat.name,
                ...(cat.description ? { description: cat.description } : {}),
                ...(cat.image ? { image: cat.image } : {}),
                ...(cat.model3d ? { model3d: cat.model3d } : {}),
                parentId: Number(groupId),
            });
            setLastAction({ type: "addToGroup", categoryId, previousParentId, category: cat });
            setShowAddToGroupModal(null);
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to add category to group");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFromGroup = async (categoryId) => {
        const cat = categories.find((c) => c.id === categoryId);
        if (!cat) return;
        setSaving(true);
        const previousParentId = cat.parentId != null && cat.parentId !== "" ? Number(cat.parentId) : null;
        try {
            await updateCategory(categoryId, {
                name: cat.name,
                ...(cat.description ? { description: cat.description } : {}),
                ...(cat.image ? { image: cat.image } : {}),
                ...(cat.model3d ? { model3d: cat.model3d } : {}),
                parentId: null,
            });
            setLastAction({ type: "removeFromGroup", categoryId, previousParentId, category: cat });
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to remove from group");
        } finally {
            setSaving(false);
        }
    };

    const handleAddSortOption = async (e) => {
        e.preventDefault();
        if (!showAddSortOptionModal || !sortOptionLabel?.trim()) return;
        setSaving(true);
        setLastAction(null);
        try {
            const created = await createCategory({
                name: sortOptionLabel.trim(),
                parentId: Number(showAddSortOptionModal),
                ...(sortOptionValue?.trim() ? { description: sortOptionValue.trim() } : {}),
            });
            const newId = created?.id ?? created?.data?.id;
            if (newId) setLastAction({ type: "createSortBy", categoryId: newId });
            setShowAddSortOptionModal(null);
            setSortOptionLabel("");
            setSortOptionValue("");
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to add sort option");
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
            setLastAction({ type: "deleteCategory", category: { name: cat.name, description: cat.description, image: cat.image, parentId: cat.parentId, model3d: cat.model3d } });
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
        if (!action) return;
        setSaving(true);
        setError(null);
        try {
            if (action.type === "addToGroup") {
                await updateCategory(action.categoryId, {
                    name: action.category.name,
                    ...(action.category.description ? { description: action.category.description } : {}),
                    ...(action.category.image ? { image: action.category.image } : {}),
                    ...(action.category.model3d ? { model3d: action.category.model3d } : {}),
                    parentId: action.previousParentId,
                });
            } else if (action.type === "removeFromGroup") {
                await updateCategory(action.categoryId, {
                    name: action.category.name,
                    ...(action.category.description ? { description: action.category.description } : {}),
                    ...(action.category.image ? { image: action.category.image } : {}),
                    ...(action.category.model3d ? { model3d: action.category.model3d } : {}),
                    parentId: action.previousParentId,
                });
            } else if (action.type === "createCategory" || action.type === "createSortBy") {
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

                    {/* Main hierarchy: Category → Brand → Model */}
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

                    {/* Sort by (collapsible) */}
                    <details className="bg-white rounded-xl border border-black/[0.06] overflow-hidden group">
                        <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none hover:bg-black/[0.02] [&::-webkit-details-marker]:hidden">
                            <span className="text-sm font-medium text-[#1d1d1f]">Sort by</span>
                            <span className="text-xs text-[#6e6e73]">{sortByGroups.length} group(s)</span>
                        </summary>
                        <div className="border-t border-black/[0.06] px-4 py-3 space-y-2">
                            <button type="button" onClick={() => { setShowSortByModal(true); setSortByName(""); setError(null); }} className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f] hover:underline">
                                <Plus size={14} /> Add Sort by
                            </button>
                            {!loading && sortByGroups.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    {sortByGroups.map((group) => {
                                        const children = childCategories(group.id);
                                        const isExpanded = expandedSortBy.has(group.id);
                                        return (
                                            <div key={group.id} className="rounded-lg border border-black/[0.06] overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-black/[0.02]" onClick={() => toggleSortBy(group.id)}>
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown size={16} className="text-[#6e6e73]" /> : <ChevronRight size={16} className="text-[#6e6e73]" />}
                                                        <span className="text-sm text-[#1d1d1f]">{group.name}</span>
                                                        <span className="text-xs text-[#6e6e73]">({children.length})</span>
                                                    </div>
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <button type="button" onClick={() => setShowAddToGroupModal(group.id)} className="p-1 rounded hover:bg-black/10 text-[#6e6e73]" title="Add category"><Plus size={12} /></button>
                                                        <button type="button" onClick={() => { setShowAddSortOptionModal(group.id); setSortOptionLabel(""); setSortOptionValue(""); setError(null); }} className="p-1 rounded hover:bg-black/10 text-[#6e6e73]" title="Add option"><Plus size={12} /></button>
                                                        <button type="button" onClick={() => { if (confirm(`Delete "${group.name}"?`)) handleDelete(group.id); }} className="p-1 rounded hover:bg-red-50 text-[#6e6e73] hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                {isExpanded && children.length > 0 && (
                                                    <div className="px-3 pb-2 pl-6 space-y-0.5">
                                                        {children.map((c) => (
                                                            <div key={c.id} className="flex items-center justify-between py-1 px-2 rounded text-sm">
                                                                <span className="truncate text-[#1d1d1f]">{c.name}</span>
                                                                <button type="button" onClick={() => handleRemoveFromGroup(c.id)} className="text-xs text-[#6e6e73] hover:text-red-600">Remove</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </details>

                    <p className="text-xs text-[#6e6e73]">{categories.length} categor{categories.length === 1 ? "y" : "ies"} total</p>
                </div>

                {/* Add Sort by modal */}
                {showSortByModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowSortByModal(false)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                                <h2 className="text-sm font-semibold text-[#1d1d1f]">Add Sort by</h2>
                                <button type="button" onClick={() => setShowSortByModal(false)} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleCreateSortBy} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Title</label>
                                    <input className={INPUT} required value={sortByName} onChange={(e) => setSortByName(e.target.value)} placeholder="e.g. Price, Type" />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowSortByModal(false)} className="flex-1 py-2 rounded-lg border border-black/10 text-sm font-medium hover:bg-black/5">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium disabled:opacity-60">{saving ? "…" : "Create"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add category to group modal */}
                {showAddToGroupModal != null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddToGroupModal(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                                <h2 className="text-sm font-semibold text-[#1d1d1f]">Add to group</h2>
                                <button type="button" onClick={() => setShowAddToGroupModal(null)} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} /></button>
                            </div>
                            <div className="p-4 max-h-72 overflow-y-auto space-y-1">
                                {categories.filter((c) => Number(c.parentId) !== Number(showAddToGroupModal)).map((c) => (
                                    <button key={c.id} type="button" onClick={() => handleAddCategoryToGroup(showAddToGroupModal, c.id)} disabled={saving} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 text-left text-sm text-[#1d1d1f] disabled:opacity-60">
                                        {c.image ? <img src={c.image} alt="" className="w-6 h-6 object-cover rounded shrink-0" /> : <FolderTree size={14} className="text-[#6e6e73] shrink-0" />}
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                ))}
                                {categories.filter((c) => Number(c.parentId) !== Number(showAddToGroupModal)).length === 0 && <p className="text-xs text-[#6e6e73] py-2">No categories to add.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add sort option modal */}
                {showAddSortOptionModal != null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddSortOptionModal(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                                <h2 className="text-sm font-semibold text-[#1d1d1f]">Add option</h2>
                                <button type="button" onClick={() => setShowAddSortOptionModal(null)} className="p-1.5 rounded-lg hover:bg-black/5"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleAddSortOption} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Label</label>
                                    <input className={INPUT} required value={sortOptionLabel} onChange={(e) => setSortOptionLabel(e.target.value)} placeholder="e.g. Price: Low to High" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Value (optional)</label>
                                    <input className={INPUT} value={sortOptionValue} onChange={(e) => setSortOptionValue(e.target.value)} placeholder="price_asc" />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowAddSortOptionModal(null)} className="flex-1 py-2 rounded-lg border border-black/10 text-sm font-medium hover:bg-black/5">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium disabled:opacity-60">{saving ? "…" : "Add"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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
