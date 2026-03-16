import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api";
import { Plus, Trash2, X, FolderTree, ChevronDown, ChevronRight, Save, Undo2 } from "lucide-react";
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
    const [form, setForm] = useState({ name: "", description: "", image: "", parentId: "" });
    const [sortByName, setSortByName] = useState("");
    const [expandedSortBy, setExpandedSortBy] = useState(new Set());
    const [lastAction, setLastAction] = useState(null);

    const sortByGroups = categories.filter((c) => c.parentId == null || c.parentId === "");
    const childCategories = (parentId) => categories.filter((c) => Number(c.parentId) === Number(parentId));

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

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name?.trim()) return;
        setSaving(true);
        setLastAction(null);
        try {
            const created = await createCategory({
                name: form.name.trim(),
                ...(form.description?.trim() ? { description: form.description.trim() } : {}),
                ...(form.image?.trim() ? { image: form.image.trim() } : {}),
                ...(form.parentId && Number(form.parentId) > 0 ? { parentId: Number(form.parentId) } : {}),
            });
            const newId = created?.id ?? created?.data?.id;
            if (newId) setLastAction({ type: "createCategory", categoryId: newId });
            setShowModal(false);
            setForm({ name: "", description: "", image: "", parentId: "" });
            fetchCategories();
        } catch (e) {
            setError(e?.message || "Failed to create category");
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
            setLastAction({ type: "deleteCategory", category: { name: cat.name, description: cat.description, image: cat.image, parentId: cat.parentId } });
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
                    parentId: action.previousParentId,
                });
            } else if (action.type === "removeFromGroup") {
                await updateCategory(action.categoryId, {
                    name: action.category.name,
                    ...(action.category.description ? { description: action.category.description } : {}),
                    ...(action.category.image ? { image: action.category.image } : {}),
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
                <div className="space-y-6 fade-in">
                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1"><X size={16} /></button>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-[#1d1d1f] text-sm font-medium hover:bg-black/5 disabled:opacity-50 transition-colors"
                        >
                            <Save size={16} /> Save
                        </button>
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={loading || saving || !lastAction}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-[#1d1d1f] text-sm font-medium hover:bg-black/5 disabled:opacity-50 transition-colors"
                        >
                            <Undo2 size={16} /> Undo
                        </button>
                    </div>

                    {/* Sort by section */}
                    <div className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between flex-wrap gap-3">
                            <h2 className="font-semibold text-[#1d1d1f]">Sort by</h2>
                            <button
                                type="button"
                                onClick={() => { setShowSortByModal(true); setSortByName(""); setError(null); }}
                                className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                            >
                                <Plus size={16} /> Add Sort by
                            </button>
                        </div>
                        <p className="px-5 py-2 text-sm text-[#6e6e73]">
                            Create Sort by titles (e.g. Price, Type). Under each Sort by you can select categories and add separate sort options (e.g. Price: Low to High).
                        </p>
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
                            </div>
                        ) : sortByGroups.length === 0 ? (
                            <div className="px-5 py-8 text-center text-[#6e6e73] text-sm">
                                No Sort by yet. Click &quot;Add Sort by&quot; to create one, then add categories under it.
                            </div>
                        ) : (
                            <div className="divide-y divide-black/5">
                                {sortByGroups.map((group) => {
                                    const children = childCategories(group.id);
                                    const isExpanded = expandedSortBy.has(group.id);
                                    return (
                                        <div key={group.id} className="bg-[#fafafa]">
                                            <div
                                                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-black/5 transition-colors"
                                                onClick={() => toggleSortBy(group.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ChevronDown size={18} className="text-[#6e6e73]" /> : <ChevronRight size={18} className="text-[#6e6e73]" />}
                                                    <span className="font-medium text-[#1d1d1f]">{group.name}</span>
                                                    <span className="text-xs text-[#6e6e73]">({children.length})</span>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddToGroupModal(group.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1d1d1f] bg-white border border-black/10 hover:bg-black/5"
                                                    >
                                                        <Plus size={14} /> Add category
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowAddSortOptionModal(group.id); setSortOptionLabel(""); setSortOptionValue(""); setError(null); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1d1d1f] bg-white border border-black/10 hover:bg-black/5"
                                                    >
                                                        <Plus size={14} /> Add sort option
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm(`Delete Sort by "${group.name}"? Categories under it will be ungrouped.`)) handleDelete(group.id);
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                                        title="Delete Sort by"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-5 pb-3 pl-10 space-y-1">
                                                    {children.length === 0 ? (
                                                        <p className="text-sm text-[#6e6e73] py-2">No items yet. Add a category (select existing) or add a sort option (e.g. Price: Low to High).</p>
                                                    ) : (
                                                        children.map((c) => (
                                                            <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-black/5">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {c.image ? (
                                                                        <img src={c.image} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0" />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center shrink-0"><FolderTree size={14} className="text-[#6e6e73]" /></div>
                                                                    )}
                                                                    <span className="text-sm font-medium text-[#1d1d1f] truncate">{c.name}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveFromGroup(c.id)}
                                                                    className="text-xs text-[#6e6e73] hover:text-red-600 px-2 py-1"
                                                                >
                                                                    Remove from group
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* All categories + Add Category */}
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <p className="text-sm text-[#6e6e73]">
                            {categories.length} categor{categories.length === 1 ? "y" : "ies"} total
                        </p>
                        <button
                            onClick={() => { setShowModal(true); setError(null); }}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                        >
                            <Plus size={16} /> Add Category
                        </button>
                    </div>

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
                                                {c.parentId != null && c.parentId !== "" && (
                                                    <p className="text-xs text-[#6e6e73] mt-0.5">
                                                        Sort by: {categories.find((p) => p.id === c.parentId)?.name ?? c.parentId}
                                                    </p>
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

                {/* Add Sort by modal */}
                {showSortByModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowSortByModal(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add Sort by</h2>
                                <button type="button" onClick={() => setShowSortByModal(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreateSortBy} className="p-6 space-y-4">
                                <p className="text-sm text-[#6e6e73]">Create a title for the product listing (e.g. Price, Type, Category). You can then add categories under it.</p>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Title *</label>
                                    <input
                                        className={INPUT}
                                        required
                                        value={sortByName}
                                        onChange={(e) => setSortByName(e.target.value)}
                                        placeholder="e.g. Price, Type, Category"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowSortByModal(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">{saving ? "Creating…" : "Create"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add category to group modal */}
                {showAddToGroupModal != null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddToGroupModal(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add category to this Sort by</h2>
                                <button type="button" onClick={() => setShowAddToGroupModal(null)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-[#6e6e73] mb-3">Choose a category to show under this Sort by on the product page.</p>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {categories
                                        .filter((c) => Number(c.parentId) !== Number(showAddToGroupModal))
                                        .map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleAddCategoryToGroup(showAddToGroupModal, c.id)}
                                                disabled={saving}
                                                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-black/10 hover:bg-black/5 text-left text-sm font-medium text-[#1d1d1f] disabled:opacity-60"
                                            >
                                                {c.image ? <img src={c.image} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0" /> : <FolderTree size={16} className="text-[#6e6e73] shrink-0" />}
                                                {c.name}
                                                {(c.parentId != null && c.parentId !== "") && (
                                                    <span className="text-xs text-[#6e6e73] ml-auto">in {categories.find((p) => p.id === c.parentId)?.name}</span>
                                                )}
                                            </button>
                                        ))}
                                </div>
                                {categories.filter((c) => Number(c.parentId) !== Number(showAddToGroupModal)).length === 0 && (
                                    <p className="text-sm text-[#6e6e73] py-4">All categories are already in a group, or there are no categories. Add a category first.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add sort option modal */}
                {showAddSortOptionModal != null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddSortOptionModal(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add sort option</h2>
                                <button type="button" onClick={() => setShowAddSortOptionModal(null)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddSortOption} className="p-6 space-y-4">
                                <p className="text-sm text-[#6e6e73]">Add a standalone option to this Sort by (e.g. &quot;Price: Low to High&quot;, &quot;Newest&quot;). This is not a product category.</p>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Label *</label>
                                    <input
                                        className={INPUT}
                                        required
                                        value={sortOptionLabel}
                                        onChange={(e) => setSortOptionLabel(e.target.value)}
                                        placeholder="e.g. Price: Low to High, Newest"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Value (optional)</label>
                                    <p className="text-xs text-[#6e6e73] mb-1.5">For the frontend to use (e.g. price_asc, newest).</p>
                                    <input
                                        className={INPUT}
                                        value={sortOptionValue}
                                        onChange={(e) => setSortOptionValue(e.target.value)}
                                        placeholder="e.g. price_asc"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddSortOptionModal(null)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">{saving ? "Adding…" : "Add"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Category modal */}
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
                                    <input className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Phone Cases" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Description</label>
                                    <textarea className={INPUT} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional short description" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Image URL</label>
                                    <input className={INPUT} type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Sort by title (optional)</label>
                                    <p className="text-xs text-[#6e6e73] mb-1.5">Assign this category to a Sort by group so it appears under that title on the product page.</p>
                                    <select className={INPUT} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                                        <option value="">None</option>
                                        {sortByGroups.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">{saving ? "Saving…" : "Create Category"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
