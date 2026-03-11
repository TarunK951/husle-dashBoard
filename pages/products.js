import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import {
    getProducts,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
    uploadMultipleImages,
} from "@/lib/api";
import {
    Plus,
    Search,
    Trash2,
    Pencil,
    X,
    Upload,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
} from "lucide-react";
import Head from "next/head";

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h2 className="font-bold text-[#1d1d1f]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-black/5 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function ImageUploader({ label, multiple, onUploaded, initialUrls = [] }) {
    const [uploading, setUploading] = useState(false);
    const [urls, setUrls] = useState(initialUrls);
    const inputRef = useRef();

    // Sync if initialUrls changes (e.g. switching between edit targets)
    useEffect(() => {
        setUrls(initialUrls);
    }, [JSON.stringify(initialUrls)]);

    const handleFiles = async (files) => {
        if (!files.length) return;
        setUploading(true);
        try {
            if (multiple) {
                const data = await uploadMultipleImages(Array.from(files));
                const newUrls = [...urls, ...data.urls];
                setUrls(newUrls);
                onUploaded(newUrls);
            } else {
                const data = await uploadImage(files[0]);
                setUrls([data.url]);
                onUploaded(data.url);
            }
        } catch (e) {
            alert("Upload failed: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1d1d1f]">{label}</label>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-black/10 rounded-xl p-6 cursor-pointer hover:border-black/30 transition-colors flex flex-col items-center gap-2 bg-[#f5f5f7]"
            >
                {uploading ? (
                    <div className="flex items-center gap-2 text-[#6e6e73] text-sm">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                        Uploading...
                    </div>
                ) : (
                    <>
                        <Upload size={24} className="text-[#6e6e73]" />
                        <p className="text-sm text-[#6e6e73]">
                            {urls.length > 0 ? "Click to add more images" : "Click or drag & drop to upload"}
                        </p>
                    </>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple={multiple}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>
            {urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {urls.map((url, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={url}
                                alt={`upload-${i}`}
                                className="w-16 h-16 object-cover rounded-xl border border-black/10"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const next = urls.filter((_, j) => j !== i);
                                    setUrls(next);
                                    onUploaded(multiple ? next : "");
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const INPUT =
    "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const emptyProduct = {
    name: "",
    description: "",
    price: "",
    slashedPrice: "",
    categoryId: "",
    shippingInfo: "",
    returnInfo: "",
    tags: "",
    images: [],
    variants: [{ color: "", images: [], stock: 0 }],
};

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modal, setModal] = useState(null); // null | 'create' | 'edit'
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(emptyProduct);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts({ page, limit: 10, search });
            setProducts(data.products || data.data || []);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { getCategories().then((d) => setCategories(d.data || d || [])); }, []);
    useEffect(() => { fetchProducts(); }, [page, search]);

    const openCreate = () => {
        setForm(emptyProduct);
        setModal("create");
    };
    const openEdit = (p) => {
        setEditTarget(p);
        setForm({
            name: p.name || "",
            description: p.description || "",
            price: p.price || "",
            slashedPrice: p.slashedPrice || "",
            categoryId: p.categoryId || "",
            shippingInfo: p.shippingInfo || "",
            returnInfo: p.returnInfo || "",
            tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "",
            images: p.images || [],
            variants: p.variants || [{ color: "", images: [], stock: 0 }],
        });
        setModal("edit");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                slashedPrice: Number(form.slashedPrice),
                categoryId: Number(form.categoryId),
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            };
            if (modal === "create") await createProduct(payload);
            else await updateProduct(editTarget.id, payload);
            setModal(null);
            fetchProducts();
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this product?")) return;
        await deleteProduct(id);
        fetchProducts();
    };

    const updateVariant = (i, field, value) => {
        const v = [...form.variants];
        v[i] = { ...v[i], [field]: value };
        setForm({ ...form, variants: v });
    };

    return (
        <>
            <Head><title>Products — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    {/* Header */}
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search products..."
                                className="pl-9 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all w-60"
                            />
                        </div>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                        >
                            <Plus size={16} /> Add Product
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="py-16 text-center text-[#6e6e73] text-sm">No products found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/50">
                                            {["IMAGE", "NAME", "PRICE", "CATEGORY", "ACTIONS"].map((h) => (
                                                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6e6e73]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => (
                                            <tr key={p.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    {p.images?.[0] ? (
                                                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-xl" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                                                            <ImageIcon size={16} className="text-[#6e6e73]" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 font-medium text-[#1d1d1f] max-w-[200px] truncate">{p.name}</td>
                                                <td className="px-5 py-3 font-semibold text-[#1d1d1f]">₹{p.price}</td>
                                                <td className="px-5 py-3 text-[#6e6e73]">{p.category?.name || "—"}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-[#6e6e73]">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Create / Edit Modal */}
                {modal && (
                    <Modal title={modal === "create" ? "Add New Product" : "Edit Product"} onClose={() => setModal(null)}>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Product Name *</label>
                                    <input className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Titanium X Case" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Price (₹) *</label>
                                    <input className={INPUT} type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="999" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Slashed Price (₹)</label>
                                    <input className={INPUT} type="number" value={form.slashedPrice} onChange={(e) => setForm({ ...form, slashedPrice: e.target.value })} placeholder="1299" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Category</label>
                                    <select className={INPUT} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">Select category</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Tags (comma-separated)</label>
                                    <input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="iphone, case, magsafe" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Description</label>
                                    <textarea className={INPUT} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Shipping Info</label>
                                    <input className={INPUT} value={form.shippingInfo} onChange={(e) => setForm({ ...form, shippingInfo: e.target.value })} placeholder="Ships in 3-5 days" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Return Info</label>
                                    <input className={INPUT} value={form.returnInfo} onChange={(e) => setForm({ ...form, returnInfo: e.target.value })} placeholder="7-day returns" />
                                </div>
                            </div>

                            {/* Product Images */}
                            <ImageUploader
                                label="Product Images"
                                multiple
                                initialUrls={form.images || []}
                                onUploaded={(urls) => setForm({ ...form, images: urls })}
                            />

                            {/* Variants */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-[#1d1d1f]">Variants</label>
                                    <button type="button" onClick={() => setForm({ ...form, variants: [...form.variants, { color: "", images: [], stock: 0 }] })}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#f5f5f7] hover:bg-black/10 transition-colors">
                                        + Add Variant
                                    </button>
                                </div>
                                {form.variants.map((v, i) => (
                                    <div key={i} className="border border-black/10 rounded-xl p-4 mb-3 space-y-3 bg-[#f5f5f7]/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[#6e6e73]">Variant {i + 1}</span>
                                            {form.variants.length > 1 && (
                                                <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}
                                                    className="text-red-500 hover:text-red-700 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-[#6e6e73] mb-1">Color</label>
                                                <input className={INPUT} value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} placeholder="Black" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-[#6e6e73] mb-1">Stock</label>
                                                <input className={INPUT} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(i, "stock", Number(e.target.value))} placeholder="50" />
                                            </div>
                                        </div>
                                        <ImageUploader
                                            label="Variant Images"
                                            multiple
                                            initialUrls={v.images || []}
                                            onUploaded={(urls) => updateVariant(i, "images", urls)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">
                                    {saving ? "Saving..." : modal === "create" ? "Create Product" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </Layout>
        </>
    );
}


