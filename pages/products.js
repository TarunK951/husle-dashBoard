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
    upload3DModel,
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
    Box,
    FileText,
    CheckCircle2,
    Tag,
    Package,
} from "lucide-react";
import Head from "next/head";

// ─── 3-D format registry ──────────────────────────────────────────────────────
const MODEL_FORMATS = [
    { ext: "glb",  label: "GLB",   mime: ".glb"  },
    { ext: "gltf", label: "GLTF",  mime: ".gltf" },
    { ext: "obj",  label: "OBJ",   mime: ".obj"  },
    { ext: "fbx",  label: "FBX",   mime: ".fbx"  },
    { ext: "stl",  label: "STL",   mime: ".stl"  },
    { ext: "dae",  label: "DAE",   mime: ".dae"  },
    { ext: "3ds",  label: "3DS",   mime: ".3ds"  },
    { ext: "usdz", label: "USDZ",  mime: ".usdz" },
    { ext: "abc",  label: "ABC",   mime: ".abc"  },
    { ext: "ply",  label: "PLY",   mime: ".ply"  },
    { ext: "x3d",  label: "X3D",   mime: ".x3d"  },
    { ext: "wrl",  label: "WRL",   mime: ".wrl"  },
];

// Known 3-D extensions for validation after the user picks a file.
// The file input itself uses accept="*" because Windows does not have
// registered MIME types for most 3-D formats, causing the picker to
// show nothing if extension-only values like ".glb" are used.
const MODEL_EXTENSIONS = new Set(MODEL_FORMATS.map((f) => f.ext));


function getExt(url = "") {
    const name = url.split("?")[0].split("/").pop() || "";
    return name.split(".").pop().toLowerCase();
}

function ModelBadge({ ext }) {
    const colors = {
        glb:  "bg-violet-100 text-violet-700",
        gltf: "bg-violet-100 text-violet-700",
        obj:  "bg-sky-100    text-sky-700",
        fbx:  "bg-amber-100  text-amber-700",
        stl:  "bg-green-100  text-green-700",
        dae:  "bg-rose-100   text-rose-700",
        usdz: "bg-pink-100   text-pink-700",
    };
    const cls = colors[ext] || "bg-gray-100 text-gray-600";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>
            <Box size={10} /> {ext}
        </span>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h2 className="font-bold text-[#1d1d1f]">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─── Image Uploader ───────────────────────────────────────────────────────────
function ImageUploader({ label, multiple, onUploaded, initialUrls = [] }) {
    const [uploading, setUploading] = useState(false);
    const [urls, setUrls] = useState(initialUrls);
    const inputRef = useRef();

    useEffect(() => { setUrls(initialUrls); }, [JSON.stringify(initialUrls)]);

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
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                className="border-2 border-dashed border-black/10 rounded-xl p-6 cursor-pointer hover:border-black/30 transition-colors flex flex-col items-center gap-2 bg-[#f5f5f7]"
            >
                {uploading ? (
                    <div className="flex items-center gap-2 text-[#6e6e73] text-sm">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                        Uploading…
                    </div>
                ) : (
                    <>
                        <Upload size={24} className="text-[#6e6e73]" />
                        <p className="text-sm text-[#6e6e73]">
                            {urls.length > 0 ? "Click to add more images" : "Click or drag & drop to upload"}
                        </p>
                    </>
                )}
                <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden"
                    onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {urls.map((url, i) => (
                        <div key={i} className="relative group">
                            <img src={url} alt={`upload-${i}`} className="w-16 h-16 object-cover rounded-xl border border-black/10" />
                            <button type="button"
                                onClick={() => {
                                    const next = urls.filter((_, j) => j !== i);
                                    setUrls(next);
                                    onUploaded(multiple ? next : "");
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            ><X size={10} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 3-D Model Uploader ───────────────────────────────────────────────────────
function Model3DUploader({ label = "3D Models", onUploaded, initialModels = [] }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState("");
    const [models, setModels] = useState(initialModels); // [{url, name, ext}]
    const inputRef = useRef();

    useEffect(() => { setModels(initialModels); }, [JSON.stringify(initialModels)]);

    const handleFiles = async (fileList) => {
        const files = Array.from(fileList);
        if (!files.length) return;

        // Warn if user picked a file that isn't a known 3-D format but still
        // allow it — the backend will accept any binary.
        const unknown = files.filter((f) => {
            const ext = f.name.split(".").pop().toLowerCase();
            return !MODEL_EXTENSIONS.has(ext);
        });
        if (unknown.length) {
            const names = unknown.map((f) => f.name).join(", ");
            if (!confirm(`"${names}" doesn't look like a 3D model. Upload anyway?`)) return;
        }

        setUploading(true);
        const uploaded = [...models];
        try {
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                setProgress(`Uploading ${i + 1}/${files.length}: ${f.name}`);
                const data = await upload3DModel(f);
                const url = data.url || data.secure_url || data.fileUrl || "";
                const ext = getExt(url) || getExt(f.name);
                uploaded.push({ url, name: f.name, ext });
            }
            setModels(uploaded);
            onUploaded(uploaded);
        } catch (e) {
            alert("3D Model upload failed: " + e.message);
        } finally {
            setUploading(false);
            setProgress("");
        }
    };

    const removeModel = (i) => {
        const next = models.filter((_, j) => j !== i);
        setModels(next);
        onUploaded(next);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1d1d1f]">{label}</label>
                <div className="flex flex-wrap gap-1">
                    {MODEL_FORMATS.map((f) => (
                        <span key={f.ext} className="text-[9px] font-semibold uppercase bg-[#f0f0f5] text-[#6e6e73] px-1.5 py-0.5 rounded-md tracking-wide">
                            {f.label}
                        </span>
                    ))}
                </div>
            </div>

            <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-6 transition-colors flex flex-col items-center gap-2
                    ${uploading ? "border-violet-300 bg-violet-50 cursor-wait" : "border-violet-200 bg-violet-50/50 cursor-pointer hover:border-violet-400"}`}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-violet-600 text-sm">
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                        <span className="text-xs">{progress || "Uploading…"}</span>
                    </div>
                ) : (
                    <>
                        <Box size={28} className="text-violet-400" />
                        <p className="text-sm text-violet-600 font-medium">
                            {models.length > 0 ? "Click to add more 3D models" : "Click or drag & drop 3D models"}
                        </p>
                        <p className="text-xs text-[#6e6e73]">
                            Supports GLB, GLTF, OBJ, FBX, STL, DAE, USDZ, 3DS, ABC, PLY, X3D, WRL
                        </p>
                    </>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="*/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {models.length > 0 && (
                <div className="space-y-1.5 mt-1">
                    {models.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-2 group">
                            <Box size={16} className="text-violet-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[#1d1d1f] truncate">{m.name || m.url.split("/").pop()}</p>
                                {m.url && (
                                    <a href={m.url} target="_blank" rel="noreferrer"
                                        className="text-[10px] text-violet-500 underline underline-offset-2 hover:text-violet-700 truncate block">
                                        View file ↗
                                    </a>
                                )}
                            </div>
                            <ModelBadge ext={m.ext || getExt(m.url)} />
                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                            <button type="button" onClick={() => removeModel(i)}
                                className="ml-1 text-[#6e6e73] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Shared input style ───────────────────────────────────────────────────────
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
    models3d: [],
    variants: [{ color: "", images: [], stock: 0 }],
    featured: false,
    limited: false,
    offer: false,
    discount: "",
    isBundle: false,
    bundleProductIds: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modal, setModal] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(emptyProduct);
    const [saving, setSaving] = useState(false);
    const [bundleProductList, setBundleProductList] = useState([]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts({ page, limit: 10, search, categoryId: categoryId || undefined });
            setProducts(data.products || data.data || []);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { getCategories().then((d) => setCategories(d.data || d || [])); }, []);
    useEffect(() => { fetchProducts(); }, [page, search, categoryId]);

    const openCreate = () => {
        setForm(emptyProduct);
        setModal("create");
        getProducts({ limit: 200 }).then((data) => setBundleProductList(data.products || data.data || [])).catch(() => setBundleProductList([]));
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
            models3d: p.models3d || [],
            variants: p.variants || [{ color: "", images: [], stock: 0 }],
            featured: !!p.featured,
            limited: !!p.limited,
            offer: !!p.offer,
            discount: p.discount != null ? String(p.discount) : "",
            isBundle: !!p.isBundle,
            bundleProductIds: Array.isArray(p.bundleProductIds) ? p.bundleProductIds : (p.bundleProductIds ? [p.bundleProductIds] : []),
        });
        setModal("edit");
        getProducts({ limit: 200 }).then((data) => setBundleProductList(data.products || data.data || [])).catch(() => setBundleProductList([]));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const categoryIdNum = Number(form.categoryId);
        const validCategoryIds = (categories || []).map((c) => Number(c.id)).filter((id) => id > 0);
        if (!form.categoryId || categoryIdNum <= 0 || Number.isNaN(categoryIdNum)) {
            alert("Please select a category. Products must be linked to an existing category.");
            return;
        }
        if (!validCategoryIds.includes(categoryIdNum)) {
            alert("Selected category is invalid or was removed. Please choose a category from the list.");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                slashedPrice: form.slashedPrice ? Number(form.slashedPrice) : undefined,
                categoryId: categoryIdNum,
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
                models3d: form.models3d.map((m) => (typeof m === "string" ? m : m.url)),
                featured: !!form.featured,
                limited: !!form.limited,
                offer: !!form.offer,
                discount: form.offer && form.discount !== "" ? Number(form.discount) : undefined,
                isBundle: !!form.isBundle,
                bundleProductIds: form.isBundle && Array.isArray(form.bundleProductIds) ? form.bundleProductIds.filter((id) => id) : undefined,
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
        try {
            await deleteProduct(id);
            fetchProducts();
        } catch (e) {
            alert(e.message || "Failed to delete product");
        }
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
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                                <input
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search products…"
                                    className="pl-9 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all w-60"
                                />
                            </div>
                            <select
                                value={categoryId}
                                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                                className="px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all"
                            >
                                <option value="">All categories</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button onClick={openCreate}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors">
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
                                            {["IMAGE", "NAME", "PRICE", "CATEGORY", "3D", "ACTIONS"].map((h) => (
                                                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6e6e73]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => {
                                            // normalise models: server may return string[] or {url,ext}[]
                                            const rawModels = p.models3d || [];
                                            const modelCount = rawModels.length;
                                            const firstExt = modelCount
                                                ? (typeof rawModels[0] === "string" ? getExt(rawModels[0]) : rawModels[0].ext || getExt(rawModels[0].url))
                                                : null;

                                            return (
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
                                                        {modelCount > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <ModelBadge ext={firstExt} />
                                                                {modelCount > 1 && (
                                                                    <span className="text-[10px] text-[#6e6e73] font-semibold">+{modelCount - 1}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[#6e6e73] text-xs">—</span>
                                                        )}
                                                    </td>
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
                                            );
                                        })}
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
                            </div>

                            {/* Product options: Featured, Limited, Offer, Bundle */}
                            <div className="border border-black/10 rounded-xl p-4 bg-[#f5f5f7]/50 space-y-4">
                                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                                    <Tag size={16} /> Product options
                                </h3>
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-black/20" />
                                        <span className="text-sm font-medium text-[#1d1d1f]">Featured</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!form.limited} onChange={(e) => setForm({ ...form, limited: e.target.checked })} className="rounded border-black/20" />
                                        <span className="text-sm font-medium text-[#1d1d1f]">Limited</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!form.offer} onChange={(e) => setForm({ ...form, offer: e.target.checked, discount: e.target.checked ? form.discount : "" })} className="rounded border-black/20" />
                                        <span className="text-sm font-medium text-[#1d1d1f]">Offer</span>
                                    </label>
                                    {form.offer && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-[#6e6e73]">Discount (%)</label>
                                            <input type="number" min="0" max="100" className={`${INPUT} w-24`} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="20" />
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!form.isBundle} onChange={(e) => setForm({ ...form, isBundle: e.target.checked, bundleProductIds: e.target.checked ? form.bundleProductIds : [] })} className="rounded border-black/20" />
                                        <span className="text-sm font-medium text-[#1d1d1f]">Bundle</span>
                                    </label>
                                </div>
                                {form.isBundle && (
                                    <div className="pt-2 border-t border-black/10">
                                        <p className="text-xs text-[#6e6e73] mb-2">Select products to include in this bundle (2 or more):</p>
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                                            {bundleProductList.filter((prod) => prod.id !== editTarget?.id).map((prod) => {
                                                const id = prod.id;
                                                const checked = (form.bundleProductIds || []).includes(id);
                                                return (
                                                    <label key={id} className="flex items-center gap-2 cursor-pointer hover:bg-white/60 rounded-lg px-2 py-1.5">
                                                        <input type="checkbox" checked={checked} onChange={(e) => {
                                                            const ids = form.bundleProductIds || [];
                                                            setForm({ ...form, bundleProductIds: e.target.checked ? [...ids, id] : ids.filter((i) => i !== id) });
                                                        }} className="rounded border-black/20" />
                                                        <Package size={14} className="text-[#6e6e73] shrink-0" />
                                                        <span className="text-sm text-[#1d1d1f] truncate">{prod.name}</span>
                                                        <span className="text-xs text-[#6e6e73] shrink-0">₹{prod.price}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {(!form.bundleProductIds || form.bundleProductIds.length === 0) && (
                                            <p className="text-xs text-amber-600 mt-1">Select at least one product for the bundle.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Description</label>
                                    <textarea className={INPUT} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description…" />
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

                            {/* 3D Models ↓ */}
                            <div className="border border-violet-200 rounded-2xl p-4 bg-violet-50/30">
                                <Model3DUploader
                                    label="3D Models"
                                    initialModels={form.models3d || []}
                                    onUploaded={(models) => setForm({ ...form, models3d: models })}
                                />
                            </div>

                            {/* Variants */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-[#1d1d1f]">Variants</label>
                                    <button type="button"
                                        onClick={() => setForm({ ...form, variants: [...form.variants, { color: "", images: [], stock: 0 }] })}
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
                                <button type="button" onClick={() => setModal(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">
                                    {saving ? "Saving…" : modal === "create" ? "Create Product" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </Layout>
        </>
    );
}
