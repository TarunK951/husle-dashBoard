import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
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
    ChevronDown,
    ArrowUp,
    ArrowDown,
    Image as ImageIcon,
    Box,
    FileText,
    CheckCircle2,
    Tag,
    Package,
    Truck,
    Layers,
} from "lucide-react";
import Head from "next/head";
import { getDashboardUser, canWriteSection } from "@/lib/permissions";

const Product3DViewer = dynamic(() => import("@/components/Product3DViewer"), { ssr: false });

/** Valid #rrggbb for native color input; falls back to #000000. */
function hexForColorPicker(code) {
    const s = String(code || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9A-Fa-f]{3}$/i.test(s)) {
        const x = s.slice(1);
        return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase();
    }
    return "#000000";
}

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

function toSlug(value = "") {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Normalize product from API (backend may use ProductVariants, discountPercent, nested category)
function normalizeProductFromApi(p) {
    if (!p) return p;
    const variants = p.ProductVariants ?? p.variants;
    const discount = p.discountPercent ?? p.discount;
    const model = p.model || (p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug || toSlug(p.category.name) } : undefined);
    const brand =
        (typeof p.brand === "string" && p.brand.trim() ? { name: p.brand, slug: toSlug(p.brand) } : p.brand) ||
        (p.category?.parent ? { id: p.category.parent.id, name: p.category.parent.name, slug: p.category.parent.slug || toSlug(p.category.parent.name) } : undefined);
    return {
        ...p,
        variants: Array.isArray(variants) ? variants : p.variants,
        discount: discount ?? p.discount,
        model,
        brand,
    };
}

// Category path string from nested category (e.g. Cases → apple → 17 pro)
function categoryPath(cat) {
    if (!cat || !cat.name) return "";
    const parts = [cat.name];
    let parent = cat.parent;
    while (parent && parent.name) {
        parts.unshift(parent.name);
        parent = parent.parent;
    }
    return parts.join(" → ");
}

function normalizeVariantForPayload(v) {
    const idRaw = v?.id;
    const idNum = idRaw != null && idRaw !== "" ? Number(idRaw) : null;
    const images = Array.isArray(v?.images) ? v.images.filter(Boolean) : (v?.images ? [v.images] : []);
    const models3d = Array.isArray(v?.models3d)
        ? v.models3d.map((m) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
        : [];
    const color = (v?.color || "").trim();
    const stock = Number(v?.stock ?? 0);
    return {
        ...(Number.isFinite(idNum) && idNum > 0 ? { id: idNum } : {}),
        color,
        stock: Number.isFinite(stock) ? stock : 0,
        images,
        models3d,
    };
}

function hasVariantContent(v) {
    return Boolean(
        (v?.color && v.color.trim()) ||
        (Array.isArray(v?.images) && v.images.length > 0) ||
        (Array.isArray(v?.models3d) && v.models3d.length > 0) ||
        Number(v?.stock ?? 0) > 0 ||
        (v?.id != null && v.id !== "")
    );
}

function normalizeModelForPayload(m, modelIndex = 0) {
    const idRaw = m?.id;
    const idNum = idRaw != null && idRaw !== "" ? Number(idRaw) : null;
    const images = Array.isArray(m?.images) ? m.images.filter(Boolean) : [];
    const models3d = Array.isArray(m?.models3d)
        ? m.models3d.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
        : [];
    const name = String(m?.name || "").trim();
    const colors = Array.isArray(m?.colors) ? m.colors : [];
    // Array index is the display order (see Move up/down); do not trust stale m.sortOrder after reorder.
    const sortOrder = modelIndex;
    const colorRows = colors
        .map((c) => {
            const cidRaw = c?.id;
            const cidNum = cidRaw != null && cidRaw !== "" ? Number(cidRaw) : null;
            const color = String(c?.color || "").trim();
            const colorCode = String(c?.colorCode || "").trim();
            const stock = Number(c?.stock ?? 0);
            const images = Array.isArray(c?.images) ? c.images.filter(Boolean) : [];
            const models3d = Array.isArray(c?.models3d)
                ? c.models3d.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
                : [];
            return {
                ...(Number.isFinite(cidNum) && cidNum > 0 ? { id: cidNum } : {}),
                color,
                ...(colorCode ? { colorCode } : {}),
                stock: Number.isFinite(stock) ? stock : 0,
                images,
                models3d,
            };
        })
        .filter((c) => c.color);
    return {
        ...(Number.isFinite(idNum) && idNum > 0 ? { id: idNum } : {}),
        name,
        images,
        models3d,
        model3dView360: !!m?.model3dView360,
        sortOrder,
        colors: colorRows.map((c, cIdx) => ({ ...c, sortOrder: cIdx })),
    };
}

function hasModelContent(m) {
    return Boolean(
        (m?.name && String(m.name).trim()) ||
        (Array.isArray(m?.images) && m.images.length > 0) ||
        (Array.isArray(m?.models3d) && m.models3d.length > 0) ||
        (Array.isArray(m?.colors) && m.colors.some((c) =>
            (c?.color && String(c.color).trim()) ||
            (Array.isArray(c?.images) && c.images.length > 0) ||
            (Array.isArray(c?.models3d) && c.models3d.length > 0)
        )) ||
        (m?.id != null && m.id !== "")
    );
}


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
function Modal({ title, onClose, children, icon }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] sticky top-0 bg-white z-10 rounded-t-xl">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]">
                        {icon && <span className="text-[#6e6e73]">{icon}</span>}
                        {title}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 text-[#6e6e73] hover:text-[#1d1d1f]"><X size={16} /></button>
                </div>
                <div className="p-4">{children}</div>
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

    const glbOnly = MODEL_FORMATS.filter((f) => f.ext === "glb");
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1d1d1f]">{label}</label>
                <div className="flex flex-wrap gap-1">
                    {glbOnly.map((f) => (
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
                            Supports GLB
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
const SELECT_CLASS = INPUT + " pr-10 appearance-none cursor-pointer bg-no-repeat bg-right";

const emptyProduct = {
    name: "",
    description: "",
    price: "",
    slashedPrice: "",
    categoryId: "",
    brand: "",
    shippingInfo: "",
    returnInfo: "",
    tags: "",
    images: [],
    gallery: [],
    models3d: [],
    model3dView360: false,
    variants: [{ id: null, color: "", images: [], stock: 0, models3d: [] }],
    models: [{ id: null, name: "", images: [], models3d: [], model3dView360: false, colors: [{ id: null, color: "", colorCode: "", stock: 0, images: [], models3d: [] }] }],
    featured: false,
    limited: false,
    offer: false,
    discount: "",
    isBundle: false,
    bundleProductIds: [],
    hasScreenOptions: false,
    screenGuardOptions: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [productsError, setProductsError] = useState(null);
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
    const [formError, setFormError] = useState(null);
    const [brandDropOpen, setBrandDropOpen] = useState(false);
    const brandInputRef = useRef(null);
    const [dashUser, setDashUser] = useState(null);
    useEffect(() => {
        setDashUser(getDashboardUser());
    }, []);
    const canWriteProducts = canWriteSection(dashUser, "products");

    const fetchProducts = async () => {
        setLoading(true);
        setProductsError(null);
        try {
            const limitNum = 10;
            const data = await getProducts({ page, limit: limitNum, search, categoryId: categoryId || undefined });
            // Backend may return { products }, { data: [] }, { items }, or array
            const list = Array.isArray(data)
                ? data
                : (data.products || data.data || data.items || []);
            setProducts(Array.isArray(list) ? list : []);
            const total = data.total ?? data.totalCount ?? list.length;
            setTotalPages(data.totalPages ?? (typeof total === "number" && limitNum > 0 ? Math.ceil(total / limitNum) : 1));
        } catch (e) {
            console.error(e);
            setProductsError(e?.message || "Failed to load products");
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { getCategories().then((d) => setCategories(Array.isArray(d) ? d : (d?.data ?? d?.categories ?? []))); }, []);

    // New flow: categories are flat (no brand/model nesting in categories)
    const rootCategories = useMemo(() => categories.filter((c) => !c.parentId || c.parentId === ""), [categories]);

    // Collect unique brand names already used across loaded products
    const knownBrands = useMemo(() => {
        const names = new Set();
        (Array.isArray(products) ? products : []).forEach((p) => {
            const b = typeof p.brand === "object" ? p.brand?.name : p.brand;
            if (b && b.trim()) names.add(b.trim());
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [products]);


    useEffect(() => { fetchProducts(); }, [page, search, categoryId]);

    const openCreate = () => {
        if (!canWriteProducts) return;
        setForm(emptyProduct);
        setFormError(null);
        setModal("create");
        getProducts({ limit: 200 }).then((data) => {
            const list = Array.isArray(data) ? data : (data?.products || data?.data || data?.items || []);
            setBundleProductList(Array.isArray(list) ? list : []);
        }).catch(() => setBundleProductList([]));
    };
    const openEdit = (p) => {
        if (!canWriteProducts) return;
        setFormError(null);
        const product = normalizeProductFromApi(p);
        setEditTarget(product);
        const variantsRaw = product.variants || product.ProductVariants || [{ color: "", images: [], stock: 0 }];
        const modelsRaw = Array.isArray(product.models) ? product.models : [];
        const modelsSorted = [...modelsRaw].sort(
            (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
        );
        setForm({
            name: product.name || "",
            description: product.description || "",
            price: product.price ?? "",
            slashedPrice: product.slashedPrice ?? "",
            categoryId: product.categoryId ?? "",
            brand: typeof product.brand === "object" ? (product.brand?.name || "") : (product.brand || ""),
            shippingInfo: product.shippingInfo || "",
            returnInfo: product.returnInfo || "",
            tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags || ""),
            images: product.images || [],
            gallery: Array.isArray(product.gallery) ? product.gallery : (product.gallery ? [product.gallery] : []).map((g) => (typeof g === "string" ? { url: g, type: "image" } : g)),
            models3d: product.models3d || [],
            model3dView360: !!product.model3dView360,
            variants: (Array.isArray(variantsRaw) ? variantsRaw : []).map((v) => ({
                id: v.id ?? null,
                color: v.color || "",
                images: v.images || [],
                stock: v.stock ?? 0,
                models3d: (v.models3d || []).map((m) => typeof m === "string" ? { url: m, name: m.split("/").pop() || "", ext: "glb" } : m),
            })),
            models: modelsSorted.length > 0
                ? modelsSorted.map((m) => ({
                    id: m.id ?? null,
                    name: m.name || "",
                    images: Array.isArray(m.images) ? m.images : [],
                    models3d: Array.isArray(m.models3d) ? m.models3d.map((u) => ({ url: u, name: u.split("/").pop() || "", ext: "glb" })) : [],
                    model3dView360: !!m.model3dView360,
                    colors: Array.isArray(m.colors) && m.colors.length > 0
                        ? [...m.colors]
                            .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
                            .map((c) => ({
                                id: c.id ?? null,
                                color: c.color || "",
                                colorCode: c.colorCode || "",
                                stock: c.stock ?? 0,
                                images: Array.isArray(c.images) ? c.images : [],
                                models3d: Array.isArray(c.models3d) ? c.models3d.map((u) => ({ url: typeof u === "string" ? u : u.url, name: (typeof u === "string" ? u : u.url).split("/").pop() || "", ext: "glb" })) : [],
                            }))
                        : [{ id: null, color: "", colorCode: "", stock: 0, images: [], models3d: [] }],
                }))
                : [{ id: null, name: "", images: [], models3d: [], model3dView360: false, colors: [{ id: null, color: "", colorCode: "", stock: 0, images: [], models3d: [] }] }],
            featured: !!product.featured,
            limited: !!product.limited,
            offer: !!product.offer,
            discount: (product.discountPercent ?? product.discount) != null ? String(product.discountPercent ?? product.discount) : "",
            isBundle: !!product.isBundle,
            bundleProductIds: (Array.isArray(product.bundleProductIds) ? product.bundleProductIds : (product.bundleProductIds ? [product.bundleProductIds] : []))
                .map((id) => Number(id))
                .filter((id) => !Number.isNaN(id)),
            hasScreenOptions: Array.isArray(product.screenGuardOptions) && product.screenGuardOptions.length > 0,
            screenGuardOptions: Array.isArray(product.screenGuardOptions) ? product.screenGuardOptions : [],
        });
        setModal("edit");
        getProducts({ limit: 200 }).then((data) => {
            const list = Array.isArray(data) ? data : (data?.products || data?.data || data?.items || []);
            setBundleProductList(Array.isArray(list) ? list : []);
        }).catch(() => setBundleProductList([]));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!canWriteProducts) return;
        setFormError(null);
        const categoryIdNum = Number(form.categoryId);
        const validCategoryIds = (rootCategories || []).map((c) => Number(c.id)).filter((id) => id > 0);
        if (!form.categoryId || categoryIdNum <= 0 || Number.isNaN(categoryIdNum)) {
            setFormError("Please select a Category. Products must be linked to a Category.");
            return;
        }
        if (!validCategoryIds.includes(categoryIdNum)) {
            setFormError("Selected category is invalid or was removed. Please choose a valid Category.");
            return;
        }
        if (form.isBundle && (!form.bundleProductIds || form.bundleProductIds.length < 2)) {
            setFormError("Bundle must include at least 2 products. Select two or more products in the Bundle section.");
            return;
        }
        if (modal === "edit" && (!editTarget || editTarget.id == null || editTarget.id === "")) {
            setFormError("Cannot save: missing product. Close and try editing again.");
            return;
        }
        setSaving(true);
        try {
            const imagesArray = Array.isArray(form.images) ? form.images : (form.images ? [form.images] : []);
            const galleryArray = (form.gallery || [])
                .slice(0, 6)
                .map((g) => {
                    if (typeof g === "string") return { url: g, type: "image" };
                    if (g && typeof g === "object") return { url: g.url || "", type: g.type || "image" };
                    return null;
                })
                .filter((g) => g && g.url && g.url.trim());
            const originalVariants = (editTarget?.variants || editTarget?.ProductVariants || []).map(normalizeVariantForPayload);
            const originalVariantIds = originalVariants.map((v) => v.id).filter((id) => id != null);
            const originalModels = Array.isArray(editTarget?.models)
                ? editTarget.models.map((m, i) => normalizeModelForPayload(m, i))
                : [];
            const originalModelIds = originalModels.map((m) => m.id).filter((id) => id != null);
            const originalColorIds = originalModels.flatMap((m) => (m.colors || []).map((c) => c.id)).filter((id) => id != null);
            const variantsNormalized = (form.variants || [])
                .map(normalizeVariantForPayload)
                .filter((v) => hasVariantContent(v));
            const keptVariantIds = new Set(variantsNormalized.map((v) => v.id).filter((id) => id != null));
            const deletedVariantIds = modal === "edit" ? originalVariantIds.filter((id) => !keptVariantIds.has(id)) : [];
            const modelsNormalized = (form.models || [])
                .map((m, i) => normalizeModelForPayload(m, i))
                .filter((m) => hasModelContent(m));
            const keptModelIds = new Set(modelsNormalized.map((m) => m.id).filter((id) => id != null));
            const keptColorIds = new Set(modelsNormalized.flatMap((m) => (m.colors || []).map((c) => c.id)).filter((id) => id != null));
            const deletedModelIds = modal === "edit" ? originalModelIds.filter((id) => !keptModelIds.has(id)) : [];
            const deletedColorIds = modal === "edit" ? originalColorIds.filter((id) => !keptColorIds.has(id)) : [];
            const payload = {
                ...form,
                images: imagesArray,
                gallery: galleryArray,
                variants: variantsNormalized,
                ProductVariants: variantsNormalized,
                models: modelsNormalized,
                price: Number(form.price),
                slashedPrice: form.slashedPrice ? Number(form.slashedPrice) : undefined,
                categoryId: categoryIdNum,
                brand: form.brand?.trim() || undefined,
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
                models3d: (form.models3d || []).map((m) => (typeof m === "string" ? m : m.url)),
                model3dView360: !!form.model3dView360,
                featured: !!form.featured,
                limited: !!form.limited,
                offer: !!form.offer,
                discount: form.offer && form.discount !== "" ? Number(form.discount) : undefined,
                discountPercent: form.offer && form.discount !== "" ? Number(form.discount) : undefined,
                isBundle: !!form.isBundle,
                bundleProductIds: form.isBundle && Array.isArray(form.bundleProductIds)
                    ? form.bundleProductIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n))
                    : undefined,
                screenGuardOptions: Array.isArray(form.screenGuardOptions)
                    ? form.screenGuardOptions
                        .filter((o) => o?.label && String(o.label).trim())
                        .map((o) => ({
                            label: String(o?.label || "").trim(),
                            value: String((o?.value ?? o?.label) || "").trim(),
                            ...(o?.price !== undefined && o?.price !== "" && !Number.isNaN(Number(o.price))
                                ? { price: Number(o.price) }
                                : {}),
                        }))
                    : [],
                ...(deletedVariantIds.length > 0 ? { deletedVariantIds } : {}),
                ...(deletedModelIds.length > 0 ? { deletedModelIds } : {}),
                ...(deletedColorIds.length > 0 ? { deletedColorIds } : {}),
            };
            if (modal === "create") {
                await createProduct(payload);
            } else {
                const id = editTarget.id != null ? String(editTarget.id) : editTarget.id;
                await updateProduct(id, payload);
            }
            setModal(null);
            setEditTarget(null);
            fetchProducts();
        } catch (e) {
            setFormError(e?.message || "Failed to save product.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!canWriteProducts) return;
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
                <div className="space-y-4 fade-in">
                    {dashUser?.role === "staff" && !canWriteProducts && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong className="font-semibold">View only.</strong> You can browse products but cannot add, edit, or delete them.
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <h1 className="text-lg font-semibold text-[#1d1d1f]">Products</h1>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search" className="pl-8 pr-3 py-2 rounded-lg border border-black/10 bg-white text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]" />
                            </div>
                            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]">
                                <option value="">All categories</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {canWriteProducts && (
                                <button type="button" onClick={openCreate} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-black">
                                    <Plus size={14} /> Add product
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                        {loading ? (
                            <div className="p-5 space-y-2">
                                {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-black/5 animate-pulse" />)}
                            </div>
                        ) : productsError ? (
                            <div className="py-12 text-center">
                                <p className="text-red-600 text-sm mb-1">{productsError}</p>
                                <button type="button" onClick={() => fetchProducts()} className="text-sm font-medium text-[#1d1d1f] underline hover:no-underline">Retry</button>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="py-12 text-center text-[#6e6e73] text-sm">No products found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/[0.08] bg-black/[0.02]">
                                            {["Image", "Product", "Price", "Category", "3D", "Variants", "Actions"].map((h) => (
                                                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#6e6e73]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => {
                                            const row = normalizeProductFromApi(p);
                                            const rawModels = row.models3d || [];
                                            const modelCount = rawModels.length;
                                            const firstExt = modelCount
                                                ? (typeof rawModels[0] === "string" ? getExt(rawModels[0]) : rawModels[0].ext || getExt(rawModels[0].url))
                                                : null;
                                            const path = categoryPath(row.category) || row.category?.name || "—";
                                            const brandName = row.brand?.name || row.category?.parent?.name;
                                            const variantCount = (row.ProductVariants ?? row.variants)?.length ?? 0;

                                            return (
                                                <tr key={row.id} className="border-b border-black/[0.06] hover:bg-black/[0.02] transition-colors">
                                                    <td className="px-4 py-2.5">
                                                        {row.images?.[0] ? (
                                                            <img src={row.images[0]} alt={row.name} className="w-11 h-11 object-cover rounded-lg" />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-lg bg-black/[0.04] flex items-center justify-center">
                                                                <ImageIcon size={18} className="text-[#6e6e73]" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-[#1d1d1f] truncate max-w-[220px]">{row.name}</p>
                                                            {brandName && <p className="text-xs text-[#6e6e73] truncate max-w-[220px]">{brandName}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="font-semibold text-[#1d1d1f]">₹{row.price}</span>
                                                        {(row.slashedPrice != null && row.slashedPrice > row.price) && <span className="text-xs text-[#6e6e73] line-through ml-1">₹{row.slashedPrice}</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-[#6e6e73] max-w-[200px] truncate" title={path}>{path}</td>
                                                    <td className="px-4 py-2.5">
                                                        {modelCount > 0 ? (
                                                            <div className="flex items-center gap-1">
                                                                <ModelBadge ext={firstExt} />
                                                                {modelCount > 1 && <span className="text-[10px] text-[#6e6e73]">+{modelCount - 1}</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[#6e6e73] text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {variantCount > 0 && <span className="text-xs text-[#6e6e73]">{variantCount} variant{variantCount !== 1 ? "s" : ""}</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {canWriteProducts ? (
                                                            <div className="flex items-center gap-1">
                                                                <button type="button" onClick={() => openEdit(row)} className="p-1.5 rounded-md hover:bg-black/10 text-[#6e6e73] hover:text-[#1d1d1f]" title="Edit"><Pencil size={14} /></button>
                                                                <button type="button" onClick={() => handleDelete(row.id)} className="p-1.5 rounded-md hover:bg-red-50 text-[#6e6e73] hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-[#86868b]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-3 border-t border-black/[0.06]">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-black/10 hover:bg-black/5 disabled:opacity-40">
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs text-[#6e6e73]">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-black/10 hover:bg-black/5 disabled:opacity-40">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Create / Edit Modal */}
                {modal && (
                    <Modal title={modal === "create" ? "Add product" : "Edit product"} onClose={() => { setModal(null); setEditTarget(null); }} icon={<Package size={18} />}>
                        <form onSubmit={handleSave} className="space-y-4">
                            {formError && (
                                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center justify-between">
                                    <span>{formError}</span>
                                    <button type="button" onClick={() => setFormError(null)} className="p-1 text-red-500 hover:text-red-700"><X size={14} /></button>
                                </div>
                            )}

                            {/* Media: Main Images & 3D */}
                            <div className="space-y-4 pb-4 border-b border-black/[0.08]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ImageUploader
                                        label="Product thumbnail"
                                        initialUrls={Array.isArray(form.images) ? form.images : (form.images ? [form.images] : [])}
                                        onUploaded={(url) => setForm({ ...form, images: url })}
                                    />
                                    <ImageUploader
                                        label="Gallery images (max 5)"
                                        multiple
                                        initialUrls={(form.gallery || []).map((g) => (typeof g === "string" ? g : g.url))}
                                        onUploaded={(urls) => setForm({ ...form, gallery: urls.slice(0, 5).map((u) => ({ url: u, type: "image" })) })}
                                    />
                                </div>
                                <div className="rounded-lg bg-violet-50/40 p-3 space-y-2">
                                    <Model3DUploader
                                        label="Product 3D Model"
                                        initialModels={(form.models3d || []).map((m) => typeof m === "string" ? { url: m, name: m.split("/").pop() || "", ext: "glb" } : m)}
                                        onUploaded={(models) => setForm({ ...form, models3d: models })}
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={!!form.model3dView360}
                                            onChange={(e) => setForm({ ...form, model3dView360: e.target.checked })}
                                            className="rounded"
                                        />
                                        360° view
                                    </label>
                                </div>
                            </div>

                            {/* Basics */}
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">
                                        <Package size={14} className="text-[#1d1d1f]" /> Name
                                    </label>
                                    <input className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">Price (₹)</label>
                                        <input
                                            className={INPUT} type="number" required value={form.price}
                                            onChange={(e) => {
                                                const newPrice = e.target.value;
                                                const sp = Number(form.slashedPrice);
                                                const np = Number(newPrice);
                                                const autoDiscount = (form.offer && sp > 0 && np > 0 && np < sp)
                                                    ? String(Math.round((1 - np / sp) * 100))
                                                    : form.discount;
                                                setForm({ ...form, price: newPrice, discount: autoDiscount });
                                            }}
                                            placeholder="999"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">Compare at / MRP (₹)</label>
                                        <input
                                            className={INPUT} type="number" value={form.slashedPrice}
                                            onChange={(e) => {
                                                const newSp = e.target.value;
                                                const sp = Number(newSp);
                                                const disc = Number(form.discount);
                                                const autoPrice = (form.offer && sp > 0 && disc > 0 && disc < 100)
                                                    ? String(Math.round(sp * (1 - disc / 100)))
                                                    : form.price;
                                                setForm({ ...form, slashedPrice: newSp, price: autoPrice });
                                            }}
                                            placeholder="1299"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">
                                        <Tag size={14} className="text-[#1d1d1f]" /> Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            className={SELECT_CLASS}
                                            value={form.categoryId}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setForm({ ...form, categoryId: v });
                                                setFormError(null);
                                            }}
                                            aria-invalid={!!formError && !form.categoryId}
                                        >
                                            <option value="">Select category</option>
                                            {rootCategories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6e6e73]"><ChevronDown size={18} /></span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5"><Tag size={14} /> Tags</label>
                                        <input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" />
                                    </div>
                                    <div className="relative">
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">Brand</label>
                                        <input
                                            ref={brandInputRef}
                                            className={INPUT}
                                            value={form.brand}
                                            onChange={(e) => { setForm({ ...form, brand: e.target.value }); setBrandDropOpen(true); }}
                                            onFocus={() => setBrandDropOpen(true)}
                                            onBlur={() => setTimeout(() => setBrandDropOpen(false), 150)}
                                            placeholder="Type or pick an existing brand"
                                            autoComplete="off"
                                        />
                                        {brandDropOpen && (() => {
                                            const q = (form.brand || "").toLowerCase().trim();
                                            const filtered = knownBrands.filter((b) => b.toLowerCase().includes(q));
                                            const showCreate = q && !knownBrands.some((b) => b.toLowerCase() === q);
                                            if (!filtered.length && !showCreate) return null;
                                            return (
                                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden">
                                                    {filtered.map((b) => (
                                                        <button key={b} type="button"
                                                            onMouseDown={() => { setForm({ ...form, brand: b }); setBrandDropOpen(false); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
                                                            {b}
                                                        </button>
                                                    ))}
                                                    {showCreate && (
                                                        <button type="button"
                                                            onMouseDown={() => { setForm({ ...form, brand: form.brand.trim() }); setBrandDropOpen(false); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-[#6e6e73] hover:bg-[#f5f5f7] border-t border-black/[0.06] transition-colors">
                                                            + Create &ldquo;{form.brand.trim()}&rdquo;
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex flex-wrap items-center gap-4 py-3 border-t border-black/[0.08]">
                                <span className="flex items-center gap-2 text-xs font-medium text-[#6e6e73]"><CheckCircle2 size={14} /> Options</span>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-[#6e6e73]" /><span>Featured</span></label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.limited} onChange={(e) => setForm({ ...form, limited: e.target.checked })} className="rounded border-[#6e6e73]" /><span>Limited</span></label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]">
                                    <input type="checkbox" checked={!!form.offer} onChange={(e) => {
                                        const on = e.target.checked;
                                        if (!on) { setForm({ ...form, offer: false, discount: "" }); return; }
                                        // Auto-calc discount from existing price + slashed price
                                        const sp = Number(form.slashedPrice);
                                        const p = Number(form.price);
                                        const autoDiscount = (sp > 0 && p > 0 && p < sp)
                                            ? String(Math.round((1 - p / sp) * 100))
                                            : form.discount;
                                        setForm({ ...form, offer: true, discount: autoDiscount });
                                    }} className="rounded border-[#6e6e73]" />
                                    <span>Offer</span>
                                </label>
                                {form.offer && (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number" min="0" max="100"
                                            className={`${INPUT} w-16 py-1.5 text-xs`}
                                            value={form.discount}
                                            onChange={(e) => {
                                                const disc = e.target.value;
                                                const sp = Number(form.slashedPrice);
                                                const d = Number(disc);
                                                const autoPrice = (sp > 0 && d > 0 && d < 100)
                                                    ? String(Math.round(sp * (1 - d / 100)))
                                                    : form.price;
                                                setForm({ ...form, discount: disc, price: autoPrice });
                                            }}
                                            placeholder="%"
                                        />
                                        <span className="text-xs text-[#6e6e73]">%</span>
                                        {form.discount && form.slashedPrice && (
                                            <span className="text-xs text-green-600 font-medium">→ ₹{Math.round(Number(form.slashedPrice) * (1 - Number(form.discount) / 100))}</span>
                                        )}
                                    </div>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.isBundle} onChange={(e) => setForm({ ...form, isBundle: e.target.checked, bundleProductIds: e.target.checked ? form.bundleProductIds : [] })} className="rounded border-[#6e6e73]" /><span>Bundle</span></label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.hasScreenOptions} onChange={(e) => setForm({ ...form, hasScreenOptions: e.target.checked, screenGuardOptions: e.target.checked ? (form.screenGuardOptions.length > 0 ? form.screenGuardOptions : [{ label: "", value: "", price: "" }]) : [] })} className="rounded border-[#6e6e73]" /><span>Screen Options</span></label>
                                {form.isBundle && (
                                    <div className="w-full mt-1 max-h-28 overflow-y-auto space-y-1 pl-5 border-l-2 border-black/5 ml-2">
                                        {bundleProductList.filter((p) => Number(p.id) !== Number(editTarget?.id)).map((prod) => {
                                            const pid = Number(prod.id);
                                            const ids = (form.bundleProductIds || []).map((x) => Number(x));
                                            const checked = ids.includes(pid);
                                            return (
                                                <label key={prod.id} className="flex items-center gap-2 cursor-pointer text-sm hover:text-black transition-colors">
                                                    <input type="checkbox" checked={checked} onChange={(e) => setForm({ ...form, bundleProductIds: e.target.checked ? [...ids.filter((x) => x !== pid), pid] : ids.filter((x) => x !== pid) })} className="rounded" />
                                                    <span className="truncate">{prod.name}</span>
                                                    <span className="text-xs text-[#6e6e73] whitespace-nowrap">₹{prod.price}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                {form.hasScreenOptions && (
                                    <div className="w-full mt-2 pl-5 border-l-2 border-violet-100 ml-2 py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-[#1d1d1f]">Screen Guard / Type Options</span>
                                                <p className="text-[10px] text-[#6e6e73]">Add options that customers can pick for this product.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, screenGuardOptions: [...(form.screenGuardOptions || []), { label: "", value: "", price: "" }] })}
                                                className="text-[11px] font-semibold text-violet-600 px-2 py-1 rounded-md bg-violet-50 hover:bg-violet-100 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add Option
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(form.screenGuardOptions || []).map((opt, i) => (
                                                <div key={i} className="group relative flex items-start gap-2 p-2 rounded-xl bg-black/[0.02] border border-black/[0.04] transition-all hover:border-black/10">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#6e6e73] ml-1">Label</label>
                                                            <input
                                                                className={`${INPUT} py-1.5 text-xs bg-white`}
                                                                placeholder="e.g. HD Clear"
                                                                value={opt?.label || ""}
                                                                onChange={(e) => {
                                                                    const next = [...(form.screenGuardOptions || [])];
                                                                    next[i] = { ...next[i], label: e.target.value, value: next[i]?.value || e.target.value };
                                                                    setForm({ ...form, screenGuardOptions: next });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#6e6e73] ml-1">Slug/Value</label>
                                                            <input
                                                                className={`${INPUT} py-1.5 text-xs bg-white`}
                                                                placeholder="e.g. hd-clear"
                                                                value={opt?.value || ""}
                                                                onChange={(e) => {
                                                                    const next = [...(form.screenGuardOptions || [])];
                                                                    next[i] = { ...next[i], value: e.target.value };
                                                                    setForm({ ...form, screenGuardOptions: next });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#6e6e73] ml-1">Price Add-on (₹)</label>
                                                            <input
                                                                className={`${INPUT} py-1.5 text-xs bg-white`}
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={opt?.price != null && opt?.price !== "" ? opt.price : ""}
                                                                onChange={(e) => {
                                                                    const next = [...(form.screenGuardOptions || [])];
                                                                    next[i] = { ...next[i], price: e.target.value };
                                                                    setForm({ ...form, screenGuardOptions: next });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm({ ...form, screenGuardOptions: (form.screenGuardOptions || []).filter((_, j) => j !== i) })}
                                                        className="mt-6 p-1.5 rounded-lg text-[#6e6e73] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Remove option"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(form.screenGuardOptions || []).length === 0 && (
                                                <div className="py-4 text-center border-2 border-dashed border-black/5 rounded-xl">
                                                    <p className="text-xs text-[#6e6e73]">Click "+ Add Option" to define screen types or variants.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <details className="group border border-black/[0.08] rounded-lg overflow-hidden">
                                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors [&::-webkit-details-marker]:hidden">
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f]">
                                        <FileText size={16} className="text-[#6e6e73]" />
                                        Description & shipping
                                    </span>
                                    <span className="flex items-center gap-1 text-[#6e6e73]">
                                        <ChevronRight size={18} className="group-open:hidden" />
                                        <ChevronDown size={18} className="hidden group-open:block" />
                                    </span>
                                </summary>
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-black/[0.06]">
                                    <div>
                                        <label className="block text-xs text-[#6e6e73] mb-1">Description</label>
                                        <textarea
                                            className={`${INPUT} font-mono text-[13px] leading-relaxed`}
                                            rows={8}
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder={"Write paragraphs, or use line breaks.\n\n- Bullet one\n- Bullet two\n\nCustomers will see this exactly as formatted."}
                                        />
                                        <p className="mt-1.5 text-[11px] text-[#6e6e73] leading-snug">
                                            Line breaks and spacing are preserved on the store. Use plain text; start lines with <code className="text-[10px] bg-black/[0.04] px-1 rounded">-</code>,{" "}
                                            <code className="text-[10px] bg-black/[0.04] px-1 rounded">•</code>, or numbers for lists.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="flex items-center gap-1.5 text-xs text-[#6e6e73] mb-1"><Truck size={12} /> Shipping</label><input className={INPUT} value={form.shippingInfo} onChange={(e) => setForm({ ...form, shippingInfo: e.target.value })} placeholder="e.g. 3–5 days" /></div>
                                        <div><label className="block text-xs text-[#6e6e73] mb-1">Returns</label><input className={INPUT} value={form.returnInfo} onChange={(e) => setForm({ ...form, returnInfo: e.target.value })} placeholder="e.g. 7 days" /></div>
                                    </div>
                                </div>
                            </details>

                            <details className="group border border-black/[0.08] rounded-lg overflow-hidden" open>
                                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors [&::-webkit-details-marker]:hidden">
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f]">
                                        <Layers size={16} className="text-[#6e6e73]" />
                                        Models & colors (new)
                                    </span>
                                    <span className="flex items-center gap-1 text-[#6e6e73]">
                                        <ChevronRight size={18} className="group-open:hidden" />
                                        <ChevronDown size={18} className="hidden group-open:block" />
                                    </span>
                                </summary>
                                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-black/[0.06]">
                                    <p className="text-[11px] text-[#6e6e73] leading-snug">
                                        Order of models below matches the <strong className="font-medium text-[#1d1d1f]">SELECT MODEL</strong> dropdown on the product page (top = first).
                                    </p>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setForm({
                                                ...form,
                                                models: [...(form.models || []), { id: null, name: "", images: [], models3d: [], model3dView360: false, colors: [{ id: null, color: "", colorCode: "", stock: 0, images: [] }] }],
                                            })}
                                            className="text-xs font-medium px-2 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Model
                                        </button>
                                    </div>

                                    {(form.models || []).map((m, mi) => (
                                        <div key={m.id != null ? `mid-${m.id}` : `mnew-${mi}`} className="rounded-lg border border-black/[0.06] p-3 space-y-3">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-xs text-[#6e6e73]">Model {mi + 1}</span>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex items-center rounded-lg border border-black/10 overflow-hidden mr-1">
                                                        <button
                                                            type="button"
                                                            title="Move up"
                                                            disabled={mi === 0}
                                                            onClick={() => {
                                                                if (mi === 0) return;
                                                                const next = [...(form.models || [])];
                                                                [next[mi - 1], next[mi]] = [next[mi], next[mi - 1]];
                                                                setForm({ ...form, models: next });
                                                            }}
                                                            className="p-1.5 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none text-[#1d1d1f]"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Move down"
                                                            disabled={mi >= (form.models || []).length - 1}
                                                            onClick={() => {
                                                                const arr = form.models || [];
                                                                if (mi >= arr.length - 1) return;
                                                                const next = [...arr];
                                                                [next[mi], next[mi + 1]] = [next[mi + 1], next[mi]];
                                                                setForm({ ...form, models: next });
                                                            }}
                                                            className="p-1.5 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none text-[#1d1d1f] border-l border-black/10"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>
                                                    {(form.models || []).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm({ ...form, models: (form.models || []).filter((_, j) => j !== mi) })}
                                                            className="text-red-500 hover:text-red-700 text-xs"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <input
                                                className={`${INPUT} py-1.5 text-xs`}
                                                placeholder="Model name (e.g. iPhone 14)"
                                                value={m.name || ""}
                                                onChange={(e) => {
                                                    const next = [...(form.models || [])];
                                                    next[mi] = { ...next[mi], name: e.target.value };
                                                    setForm({ ...form, models: next });
                                                }}
                                            />

                                            <ImageUploader
                                                label="Model images (store gallery when this model has no colors; add color rows below for per-color galleries)"
                                                multiple
                                                initialUrls={m.images || []}
                                                onUploaded={(urls) => {
                                                    const next = [...(form.models || [])];
                                                    next[mi] = { ...next[mi], images: urls };
                                                    setForm({ ...form, models: next });
                                                }}
                                            />

                                            <div className="rounded-lg bg-violet-50/40 p-3 space-y-2">
                                                <Model3DUploader
                                                    label="Model 3D"
                                                    initialModels={m.models3d || []}
                                                    onUploaded={(models) => {
                                                        const next = [...(form.models || [])];
                                                        next[mi] = { ...next[mi], models3d: models };
                                                        setForm({ ...form, models: next });
                                                    }}
                                                />
                                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!m.model3dView360}
                                                        onChange={(e) => {
                                                            const next = [...(form.models || [])];
                                                            next[mi] = { ...next[mi], model3dView360: e.target.checked };
                                                            setForm({ ...form, models: next });
                                                        }}
                                                        className="rounded"
                                                    />
                                                    360° view
                                                </label>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-[#6e6e73]">Colors</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = [...(form.models || [])];
                                                            const colors = Array.isArray(next[mi]?.colors) ? next[mi].colors : [];
                                                            next[mi] = { ...next[mi], colors: [...colors, { id: null, color: "", colorCode: "", stock: 0, images: [] }] };
                                                            setForm({ ...form, models: next });
                                                        }}
                                                        className="text-xs font-medium text-[#1d1d1f] hover:underline"
                                                    >
                                                        + Color
                                                    </button>
                                                </div>
                                                {(m.colors || []).map((c, ci) => (
                                                    <div key={ci} className="rounded-lg border border-black/[0.06] p-2 space-y-2 bg-black/[0.02]">
                                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                                            <input
                                                                className={`${INPUT} py-1.5 text-xs sm:col-span-4`}
                                                                placeholder="Color (e.g. Black)"
                                                                value={c.color || ""}
                                                                onChange={(e) => {
                                                                    const next = [...(form.models || [])];
                                                                    const colors = [...(next[mi].colors || [])];
                                                                    colors[ci] = { ...colors[ci], color: e.target.value };
                                                                    next[mi] = { ...next[mi], colors };
                                                                    setForm({ ...form, models: next });
                                                                }}
                                                            />
                                                            <div className="flex items-center gap-2 sm:col-span-4 min-w-0">
                                                                <input
                                                                    type="color"
                                                                    title="Pick color — fills hex code"
                                                                    className="h-9 w-11 shrink-0 rounded-lg border border-black/10 cursor-pointer bg-white p-0.5"
                                                                    value={hexForColorPicker(c.colorCode)}
                                                                    onChange={(e) => {
                                                                        const next = [...(form.models || [])];
                                                                        const colors = [...(next[mi].colors || [])];
                                                                        colors[ci] = {
                                                                            ...colors[ci],
                                                                            colorCode: e.target.value.toLowerCase(),
                                                                        };
                                                                        next[mi] = { ...next[mi], colors };
                                                                        setForm({ ...form, models: next });
                                                                    }}
                                                                />
                                                                <input
                                                                    className={`${INPUT} py-1.5 text-xs flex-1 min-w-0 font-mono`}
                                                                    placeholder="#000000"
                                                                    value={c.colorCode || ""}
                                                                    onChange={(e) => {
                                                                        const next = [...(form.models || [])];
                                                                        const colors = [...(next[mi].colors || [])];
                                                                        colors[ci] = { ...colors[ci], colorCode: e.target.value };
                                                                        next[mi] = { ...next[mi], colors };
                                                                        setForm({ ...form, models: next });
                                                                    }}
                                                                    aria-label="Color hex code"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 sm:col-span-4 justify-end sm:justify-start">
                                                                <input
                                                                    className={`${INPUT} py-1.5 text-xs`}
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={c.stock ?? 0}
                                                                    onChange={(e) => {
                                                                        const next = [...(form.models || [])];
                                                                        const colors = [...(next[mi].colors || [])];
                                                                        colors[ci] = { ...colors[ci], stock: Number(e.target.value) };
                                                                        next[mi] = { ...next[mi], colors };
                                                                        setForm({ ...form, models: next });
                                                                    }}
                                                                />
                                                                {(m.colors || []).length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const next = [...(form.models || [])];
                                                                            const colors = (next[mi].colors || []).filter((_, j) => j !== ci);
                                                                            next[mi] = { ...next[mi], colors };
                                                                            setForm({ ...form, models: next });
                                                                        }}
                                                                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                                                        title="Remove color"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ImageUploader
                                                            label="Images for this color (shown on the store when this color is selected)"
                                                            multiple
                                                            initialUrls={c.images || []}
                                                            onUploaded={(urls) => {
                                                                 const next = [...(form.models || [])];
                                                                 const colors = [...(next[mi].colors || [])];
                                                                 colors[ci] = { ...colors[ci], images: urls };
                                                                 next[mi] = { ...next[mi], colors };
                                                                 setForm({ ...form, models: next });
                                                             }}
                                                         />
                                                         <div className="rounded-lg bg-violet-50/40 p-3 mt-2">
                                                             <Model3DUploader
                                                                 label="Variant 3D (leave empty to use Model 3D)"
                                                                 initialModels={c.models3d || []}
                                                                 onUploaded={(models) => {
                                                                     const next = [...(form.models || [])];
                                                                     const colors = [...(next[mi].colors || [])];
                                                                     colors[ci] = { ...colors[ci], models3d: models };
                                                                     next[mi] = { ...next[mi], colors };
                                                                     setForm({ ...form, models: next });
                                                                 }}
                                                             />
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>

                            <div className="flex gap-2 pt-2 border-t border-black/[0.06]">
                                <button type="button" onClick={() => { setModal(null); setEditTarget(null); }} className="flex-1 py-2 rounded-lg border border-black/10 text-sm font-medium hover:bg-black/5">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black disabled:opacity-60">{saving ? "Saving…" : modal === "create" ? "Create" : "Save"}</button>
                            </div>
                        </form>
                    </Modal>
                )}
            </Layout>
        </>
    );
}
