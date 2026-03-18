import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, updateCategory, deleteCategory, upload3DModel } from "@/lib/api";
import { Plus, Trash2, X, FolderTree, ChevronDown, ChevronRight, Save, Undo2, Pencil, Box, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

// True when the category being edited is a Model (child of a brand)
const isModelLevel = (editCategory, categories) => {
    if (!editCategory || !editCategory.parentId) return false;
    const parent = categories.find((c) => Number(c.id) === Number(editCategory.parentId));
    if (!parent || !parent.parentId) return false;
    return true; // parent has parent = brand under root
};

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
    const [form, setForm] = useState({ name: "", description: "", image: "", parentId: "", model3d: "" });
    const [editCategory, setEditCategory] = useState(null);
    const [sortByName, setSortByName] = useState("");
    const [expandedSortBy, setExpandedSortBy] = useState(new Set());
    const [expandedEcom, setExpandedEcom] = useState(new Set());
    const [lastAction, setLastAction] = useState(null);
    const [uploadingModel3d, setUploadingModel3d] = useState(false);
    const model3dInputRef = useRef(null);

    const sortByGroups = categories.filter((c) => c.parentId == null || c.parentId === "");
    const childCategories = (parentId) => categories.filter((c) => Number(c.parentId) === Number(parentId));

    // E-commerce hierarchy: Category (root) → Brand (child of root) → Model (child of brand)
    const rootCategories = categories.filter((c) => c.parentId == null || c.parentId === "");
    const isBrand = (c) => c.parentId != null && c.parentId !== "" && rootCategories.some((r) => Number(r.id) === Number(c.parentId));
    const isModel = (c) => {
        const parent = categories.find((p) => Number(p.id) === Number(c.parentId));
        return parent && isBrand(parent);
    };
    const brandCategories = categories.filter(isBrand);
    const modelCategories = categories.filter(isModel);
    // Parent options for new category: None, any root (Category), any brand (so new item can be Model)
    const parentOptionsForCreate = [
        { value: "", label: "None (root category)", level: "category" },
        ...rootCategories.map((r) => ({ value: r.id, label: `Category: ${r.name}`, level: "category", id: r.id })),
        ...brandCategories.map((b) => {
            const parentName = rootCategories.find((r) => Number(r.id) === Number(b.parentId))?.name || "";
            return { value: b.id, label: `Brand: ${b.name} (under ${parentName})`, level: "brand", id: b.id };
        }),
    ];

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
    const toggleEcom = (id) => {
        setExpandedEcom((prev) => {
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
                ...(form.description?.trim() ? { description: form.description.trim() } : {}),
                ...(form.image?.trim() ? { image: form.image.trim() } : {}),
                ...(form.parentId && Number(form.parentId) > 0 ? { parentId: Number(form.parentId) } : {}),
                ...(form.model3d?.trim() ? { model3d: form.model3d.trim() } : {}),
            };
            if (editCategory && editCategory.id != null) {
                await updateCategory(editCategory.id, payload);
                setShowModal(false);
                setEditCategory(null);
                setForm({ name: "", description: "", image: "", parentId: "", model3d: "" });
            } else {
                const created = await createCategory(payload);
                const newId = created?.id ?? created?.data?.id;
                if (newId) setLastAction({ type: "createCategory", categoryId: newId });
                setShowModal(false);
                setForm({ name: "", description: "", image: "", parentId: "", model3d: "" });
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
                            <button onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: "", model3d: "" }); setShowModal(true); setError(null); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black">
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
                            <p className="text-xs text-[#6e6e73]">Category → Brand → Model. Products link to the last level. Edit a model to add an optional 3D file.</p>
                        </div>
                        {loading ? (
                            <div className="p-5 space-y-2">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-black/5 animate-pulse" />)}
                            </div>
                        ) : rootCategories.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <p className="text-sm text-[#6e6e73] mb-3">No categories yet.</p>
                                <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: "", model3d: "" }); setShowModal(true); setError(null); }} className="text-sm font-medium text-[#1d1d1f] underline hover:no-underline">Add category</button>
                            </div>
                        ) : (
                            <div className="divide-y divide-black/[0.06]">
                                {rootCategories.map((root) => {
                                    const brands = childCategories(root.id);
                                    const isRootOpen = expandedEcom.has(root.id);
                                    return (
                                        <div key={root.id}>
                                            <div className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer hover:bg-black/[0.03] transition-colors min-h-[44px]" onClick={() => toggleEcom(root.id)}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isRootOpen ? <ChevronDown size={18} className="text-[#6e6e73] shrink-0" /> : <ChevronRight size={18} className="text-[#6e6e73] shrink-0" />}
                                                    <span className="font-medium text-[#1d1d1f] truncate">{root.name}</span>
                                                    {brands.length > 0 && <span className="text-xs text-[#6e6e73] shrink-0">{brands.length}</span>}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: String(root.id), model3d: "" }); setShowModal(true); setError(null); }} className="p-1.5 rounded-md hover:bg-black/10 text-[#6e6e73]" title="Add brand"><Plus size={14} /></button>
                                                    <button type="button" onClick={() => { setEditCategory(root); setForm({ name: root.name || "", description: root.description || "", image: root.image || "", parentId: "", model3d: "" }); setShowModal(true); setError(null); }} className="p-1.5 rounded-md hover:bg-black/10 text-[#6e6e73]" title="Edit"><Pencil size={14} /></button>
                                                    <button type="button" onClick={() => handleDelete(root.id)} className="p-1.5 rounded-md hover:bg-red-50 text-[#6e6e73] hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            {isRootOpen && (
                                                <div className="bg-black/[0.02] pl-6 pr-4 pb-2 pt-0 space-y-0.5">
                                                    {brands.length === 0 ? (
                                                        <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: String(root.id), model3d: "" }); setShowModal(true); setError(null); }} className="flex items-center gap-2 py-2 text-sm text-[#6e6e73] hover:text-[#1d1d1f]">
                                                            <Plus size={14} /> Add brand
                                                        </button>
                                                    ) : (
                                                        brands.map((brand) => {
                                                            const models = childCategories(brand.id);
                                                            const isBrandOpen = expandedEcom.has(brand.id);
                                                            return (
                                                                <div key={brand.id} className="rounded-lg overflow-hidden">
                                                                    <div className="flex items-center justify-between gap-2 py-1.5 px-2 cursor-pointer hover:bg-white/80 rounded-md" onClick={() => toggleEcom(brand.id)}>
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            {isBrandOpen ? <ChevronDown size={16} className="text-[#6e6e73] shrink-0" /> : <ChevronRight size={16} className="text-[#6e6e73] shrink-0" />}
                                                                            <span className="text-sm text-[#1d1d1f] truncate">{brand.name}</span>
                                                                            {models.length > 0 && <span className="text-xs text-[#6e6e73] shrink-0">{models.length}</span>}
                                                                        </div>
                                                                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                            <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: String(brand.id), model3d: "" }); setShowModal(true); setError(null); }} className="p-1 rounded hover:bg-black/10 text-[#6e6e73]" title="Add model"><Plus size={12} /></button>
                                                                            <button type="button" onClick={() => { setEditCategory(brand); setForm({ name: brand.name || "", description: brand.description || "", image: brand.image || "", parentId: brand.parentId || "", model3d: "" }); setShowModal(true); setError(null); }} className="p-1 rounded hover:bg-black/10 text-[#6e6e73]"><Pencil size={12} /></button>
                                                                            <button type="button" onClick={() => handleDelete(brand.id)} className="p-1 rounded hover:bg-red-50 text-[#6e6e73] hover:text-red-500"><Trash2 size={12} /></button>
                                                                        </div>
                                                                    </div>
                                                                    {isBrandOpen && (
                                                                        <div className="pl-5 pr-2 pb-1">
                                                                            {models.length === 0 ? (
                                                                                <button type="button" onClick={() => { setEditCategory(null); setForm({ name: "", description: "", image: "", parentId: String(brand.id), model3d: "" }); setShowModal(true); setError(null); }} className="flex items-center gap-2 py-1.5 text-xs text-[#6e6e73] hover:text-[#1d1d1f]">
                                                                                    <Plus size={12} /> Add model
                                                                                </button>
                                                                            ) : (
                                                                                models.map((model) => (
                                                                                    <div key={model.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-white/80">
                                                                                        <span className="text-sm text-[#1d1d1f] truncate flex items-center gap-1.5">
                                                                                            {model.name}
                                                                                            {model.model3d && <span className="shrink-0 w-4 h-4 rounded bg-violet-100 text-violet-600 flex items-center justify-center" title="3D"><Box size={10} /></span>}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                                                            <button type="button" onClick={() => { setEditCategory(model); setForm({ name: model.name || "", description: model.description || "", image: model.image || "", parentId: model.parentId || "", model3d: model.model3d || "" }); setShowModal(true); setError(null); }} className="p-1 rounded hover:bg-black/10 text-[#6e6e73]"><Pencil size={12} /></button>
                                                                                            <button type="button" onClick={() => handleDelete(model.id)} className="p-1 rounded hover:bg-red-50 text-[#6e6e73] hover:text-red-500"><Trash2 size={12} /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Parent</label>
                                    <select className={INPUT} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                                        {parentOptionsForCreate.map((opt) => (
                                            <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Description (optional)</label>
                                    <input className={INPUT} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">Image URL (optional)</label>
                                    <input className={INPUT} type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                                </div>
                                {(() => {
                                    const parentCat = form.parentId ? categories.find((c) => Number(c.id) === Number(form.parentId)) : null;
                                    const parentIsBrand = parentCat && rootCategories.some((r) => Number(r.id) === Number(parentCat.parentId));
                                    const showModel3d = (editCategory && isModelLevel(editCategory, categories)) || (!editCategory && !!parentIsBrand);
                                    if (!showModel3d) return null;
                                    return (
                                        <div className="rounded-lg bg-violet-50/80 p-3 space-y-2">
                                            <span className="text-xs font-medium text-violet-800 flex items-center gap-1.5"><Box size={12} /> 3D model (optional)</span>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input ref={model3dInputRef} type="file" accept=".glb,.gltf,.obj,.fbx,.stl,.usdz" className="hidden" onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingModel3d(true);
                                                    try {
                                                        const data = await upload3DModel(file);
                                                        const url = data.url || data.secure_url || data.fileUrl || "";
                                                        if (url) setForm((f) => ({ ...f, model3d: url }));
                                                    } catch (err) { setError(err?.message || "Upload failed"); }
                                                    finally { setUploadingModel3d(false); e.target.value = ""; }
                                                }} />
                                                <button type="button" onClick={() => model3dInputRef.current?.click()} disabled={uploadingModel3d} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 disabled:opacity-60">
                                                    {uploadingModel3d ? "…" : <><Upload size={12} /> Upload</>}
                                                </button>
                                                {form.model3d && <button type="button" onClick={() => setForm((f) => ({ ...f, model3d: "" }))} className="text-xs text-red-600 hover:underline">Clear</button>}
                                            </div>
                                        </div>
                                    );
                                })()}
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
