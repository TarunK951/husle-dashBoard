import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import {
    getProducts,
    getCategories,
    getBrands,
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

const Product3DViewer = dynamic(() => import("@/components/Product3DViewer"), { ssr: false });

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
    selectedRootId: "",
    selectedBrandId: "",
    brandId: "",
    shippingInfo: "",
    returnInfo: "",
    tags: "",
    images: [],
    gallery: [],
    models3d: [],
    model3dView360: false,
    variants: [{ id: null, color: "", images: [], stock: 0, models3d: [] }],
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
    const [productsError, setProductsError] = useState(null);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
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
    useEffect(() => {
        getBrands()
            .then((d) => setBrands(Array.isArray(d) ? d : (d?.data ?? d?.brands ?? [])))
            .catch(() => setBrands([]));
    }, []);

    // E-commerce hierarchy: root = Category, child of root = Brand, child of brand = Model
    const rootCategories = useMemo(() => categories.filter((c) => !c.parentId || c.parentId === ""), [categories]);
    const getChildren = (parentId) => categories.filter((c) => Number(c.parentId) === Number(parentId));
    const brandCategories = useMemo(() => rootCategories.flatMap((r) => getChildren(r.id)), [categories, rootCategories]);

    // Cascading selection: selected root → brands under it; selected brand → models under it
    const brandsForSelectedRoot = useMemo(() => (form.selectedRootId ? getChildren(form.selectedRootId) : []), [categories, form.selectedRootId]);
    const modelsForSelectedBrand = useMemo(() => (form.selectedBrandId ? getChildren(form.selectedBrandId) : []), [categories, form.selectedBrandId]);

    // Flat list of all models (and brands with no models) for "Assign to model" dropdown
    const allModelsWithPath = useMemo(() => {
        const list = [];
        rootCategories.forEach((root) => {
            getChildren(root.id).forEach((brand) => {
                const models = getChildren(brand.id);
                if (models.length === 0) {
                    list.push({
                        id: brand.id,
                        name: brand.name,
                        label: `${root.name} → ${brand.name} (brand only, no models yet)`,
                        rootId: root.id,
                        brandId: brand.id,
                        model3d: undefined,
                    });
                } else {
                    models.forEach((model) => {
                        list.push({
                            id: model.id,
                            name: model.name,
                            label: `${root.name} → ${brand.name} → ${model.name}`,
                            rootId: root.id,
                            brandId: brand.id,
                            model3d: model.model3d || undefined,
                        });
                    });
                }
            });
        });
        return list;
    }, [categories, rootCategories]);

    // Brand dropdown: API brands + e-commerce brand-level categories
    const brandOptions = useMemo(() => {
        const apiList = Array.isArray(brands) ? brands : [];
        const seen = new Set(apiList.map((b) => b.id));
        const merged = [...apiList];
        brandCategories.forEach((c) => {
            if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push({ id: c.id, name: c.name || "" });
            }
        });
        return merged;
    }, [brands, brandCategories]);

    useEffect(() => { fetchProducts(); }, [page, search, categoryId]);

    const openCreate = () => {
        setForm(emptyProduct);
        setFormError(null);
        setModal("create");
        getProducts({ limit: 200 }).then((data) => {
            const list = Array.isArray(data) ? data : (data?.products || data?.data || data?.items || []);
            setBundleProductList(Array.isArray(list) ? list : []);
        }).catch(() => setBundleProductList([]));
    };
    const openEdit = (p) => {
        setFormError(null);
        const product = normalizeProductFromApi(p);
        setEditTarget(product);
        const catId = product.categoryId != null && product.categoryId !== "" ? Number(product.categoryId) : null;
        let root = null, brand = null;
        if (product.category?.parent?.parent) {
            root = product.category.parent.parent;
            brand = product.category.parent;
        } else if (product.category?.parent) {
            brand = product.category.parent;
            root = product.category.parent.parent || categories.find((c) => Number(c.id) === Number(brand?.parentId || brand?.parent?.id));
        }
        if (!root || !brand) {
            const cat = catId ? categories.find((c) => Number(c.id) === catId) : null;
            if (cat) {
                const parent = cat.parentId != null && cat.parentId !== "" ? categories.find((c) => Number(c.id) === Number(cat.parentId)) : null;
                if (!parent) root = cat;
                else if (!parent.parentId || parent.parentId === "") {
                    brand = cat;
                    root = parent;
                } else {
                    brand = parent;
                    root = categories.find((c) => Number(c.id) === Number(parent.parentId)) || null;
                }
            }
        }
        const variantsRaw = product.variants || product.ProductVariants || [{ color: "", images: [], stock: 0 }];
        setForm({
            name: product.name || "",
            description: product.description || "",
            price: product.price ?? "",
            slashedPrice: product.slashedPrice ?? "",
            categoryId: product.categoryId ?? "",
            selectedRootId: root ? String(root.id) : "",
            selectedBrandId: brand ? String(brand.id) : "",
            brandId:
                product.brandId != null && product.brandId !== ""
                    ? String(product.brandId)
                    : (product.brand?.id != null && product.brand?.id !== "" ? String(product.brand.id) : (brand ? String(brand.id) : "")),
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
            featured: !!product.featured,
            limited: !!product.limited,
            offer: !!product.offer,
            discount: (product.discountPercent ?? product.discount) != null ? String(product.discountPercent ?? product.discount) : "",
            isBundle: !!product.isBundle,
            bundleProductIds: Array.isArray(product.bundleProductIds) ? product.bundleProductIds : (product.bundleProductIds ? [product.bundleProductIds] : []),
        });
        setModal("edit");
        getProducts({ limit: 200 }).then((data) => {
            const list = Array.isArray(data) ? data : (data?.products || data?.data || data?.items || []);
            setBundleProductList(Array.isArray(list) ? list : []);
        }).catch(() => setBundleProductList([]));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError(null);
        const categoryIdNum = Number(form.categoryId);
        const validCategoryIds = (categories || []).map((c) => Number(c.id)).filter((id) => id > 0);
        if (!form.categoryId || categoryIdNum <= 0 || Number.isNaN(categoryIdNum)) {
            setFormError("Please select Category → Brand → Model. Products must be linked to a Model (leaf category).");
            return;
        }
        if (!validCategoryIds.includes(categoryIdNum)) {
            setFormError("Selected model is invalid or was removed. Please choose from Category → Brand → Model.");
            return;
        }
        const brandIdNum = Number(form.brandId);
        const validBrandIds = (brandOptions || []).map((b) => Number(b.id)).filter((id) => id > 0);
        if (form.brandId && (brandIdNum <= 0 || Number.isNaN(brandIdNum))) {
            setFormError("Please select a valid brand or leave brand unset.");
            return;
        }
        if (form.brandId && validBrandIds.length && !validBrandIds.includes(brandIdNum)) {
            setFormError("Selected brand is invalid or was removed. Please choose a brand from the list or leave unset.");
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
            const galleryArray = (form.gallery || []).slice(0, 6).map((g) => (typeof g === "string" ? { url: g, type: "image" } : { url: g.url || "", type: g.type || "image" })).filter((g) => g.url && g.url.trim());
            const variantsNormalized = (form.variants || []).map((v) => ({
                ...(v.id != null && v.id !== "" ? { id: v.id } : {}),
                color: v.color || "",
                stock: v.stock ?? 0,
                images: Array.isArray(v.images) ? v.images : (v.images ? [v.images] : []),
                models3d: (v.models3d || []).map((m) => (typeof m === "string" ? m : m.url)).filter(Boolean),
            }));
            const selectedModel = categories.find((c) => Number(c.id) === categoryIdNum);
            const selectedBrand = selectedModel?.parentId ? categories.find((c) => Number(c.id) === Number(selectedModel.parentId)) : null;
            const selectedBrandId = selectedBrand?.id ? Number(selectedBrand.id) : undefined;
            const payloadBrandId = brandIdNum > 0 ? brandIdNum : selectedBrandId;
            const payload = {
                ...form,
                images: imagesArray,
                gallery: galleryArray,
                variants: variantsNormalized,
                price: Number(form.price),
                slashedPrice: form.slashedPrice ? Number(form.slashedPrice) : undefined,
                categoryId: categoryIdNum,
                ...(payloadBrandId ? { brandId: payloadBrandId } : {}),
                modelId: categoryIdNum,
                model: selectedModel ? {
                    id: Number(selectedModel.id),
                    name: selectedModel.name || "",
                    slug: selectedModel.slug || toSlug(selectedModel.name || ""),
                } : undefined,
                brand: selectedBrand ? {
                    id: Number(selectedBrand.id),
                    name: selectedBrand.name || "",
                    slug: selectedBrand.slug || toSlug(selectedBrand.name || ""),
                } : undefined,
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
                models3d: (form.models3d || []).map((m) => (typeof m === "string" ? m : m.url)),
                model3dView360: !!form.model3dView360,
                featured: !!form.featured,
                limited: !!form.limited,
                offer: !!form.offer,
                discount: form.offer && form.discount !== "" ? Number(form.discount) : undefined,
                discountPercent: form.offer && form.discount !== "" ? Number(form.discount) : undefined,
                isBundle: !!form.isBundle,
                bundleProductIds: form.isBundle && Array.isArray(form.bundleProductIds) ? form.bundleProductIds.filter((id) => id) : undefined,
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
                            <button onClick={openCreate} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-black">
                                <Plus size={14} /> Add product
                            </button>
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
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => openEdit(row)} className="p-1.5 rounded-md hover:bg-black/10 text-[#6e6e73] hover:text-[#1d1d1f]" title="Edit"><Pencil size={14} /></button>
                                                            <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded-md hover:bg-red-50 text-[#6e6e73] hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
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
                                        <input className={INPUT} type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="999" />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">Compare at (₹)</label>
                                        <input className={INPUT} type="number" value={form.slashedPrice} onChange={(e) => setForm({ ...form, slashedPrice: e.target.value })} placeholder="1299" />
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">
                                        <Tag size={14} className="text-[#1d1d1f]" /> Category (model)
                                    </label>
                                    <div className="relative">
                                        <select
                                            className={SELECT_CLASS}
                                            value={form.categoryId}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const chosen = allModelsWithPath.find((m) => String(m.id) === String(v));
                                                if (chosen) {
                                                    setForm({ ...form, categoryId: v, selectedRootId: String(chosen.rootId), selectedBrandId: String(chosen.brandId), brandId: String(chosen.brandId) });
                                                } else {
                                                    setForm({ ...form, categoryId: v, selectedRootId: v ? form.selectedRootId : "", selectedBrandId: v ? form.selectedBrandId : "", brandId: v ? form.brandId : "" });
                                                }
                                                setFormError(null);
                                            }}
                                            aria-invalid={!!formError && !form.categoryId}
                                        >
                                            <option value="">Select model</option>
                                            {allModelsWithPath.map((m) => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6e6e73]"><ChevronDown size={18} /></span>
                                    </div>
                                    {form.categoryId && (() => {
                                        const chosen = allModelsWithPath.find((m) => String(m.id) === String(form.categoryId));
                                        if (!chosen?.model3d) return null;
                                        return (
                                            <button type="button" onClick={() => {
                                                const url = chosen.model3d;
                                                const existing = (form.models3d || []).map((x) => (typeof x === "string" ? x : x.url));
                                                if (existing.includes(url)) return;
                                                setForm({ ...form, models3d: [{ url, name: (chosen.label || chosen.name) + " model", ext: "glb" }, ...(form.models3d || [])] });
                                            }} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-800">
                                                <Box size={12} /> Use category 3D model
                                            </button>
                                        );
                                    })()}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5"><Tag size={14} /> Tags</label>
                                        <input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-[#6e6e73] mb-1.5">Brand</label>
                                        <div className="relative">
                                            <select className={SELECT_CLASS} value={form.brandId} onChange={(e) => { setForm({ ...form, brandId: e.target.value }); setFormError(null); }}>
                                                <option value="">— Select brand —</option>
                                                {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6e6e73]"><ChevronDown size={18} /></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex flex-wrap items-center gap-4 py-3 border-t border-black/[0.08]">
                                <span className="flex items-center gap-2 text-xs font-medium text-[#6e6e73]"><CheckCircle2 size={14} /> Options</span>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-[#6e6e73]" /><span>Featured</span></label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.limited} onChange={(e) => setForm({ ...form, limited: e.target.checked })} className="rounded border-[#6e6e73]" /><span>Limited</span></label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.offer} onChange={(e) => setForm({ ...form, offer: e.target.checked, discount: e.target.checked ? form.discount : "" })} className="rounded border-[#6e6e73]" /><span>Offer</span></label>
                                {form.offer && <input type="number" min="0" max="100" className={`${INPUT} w-14 py-1.5 text-xs`} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="%" />}
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1d1d1f]"><input type="checkbox" checked={!!form.isBundle} onChange={(e) => setForm({ ...form, isBundle: e.target.checked, bundleProductIds: e.target.checked ? form.bundleProductIds : [] })} className="rounded border-[#6e6e73]" /><span>Bundle</span></label>
                                {form.isBundle && (
                                    <div className="w-full mt-1 max-h-28 overflow-y-auto space-y-1 pl-5">
                                        {bundleProductList.filter((p) => p.id !== editTarget?.id).map((prod) => {
                                            const checked = (form.bundleProductIds || []).includes(prod.id);
                                            return (
                                                <label key={prod.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                                    <input type="checkbox" checked={checked} onChange={(e) => setForm({ ...form, bundleProductIds: e.target.checked ? [...(form.bundleProductIds || []), prod.id] : (form.bundleProductIds || []).filter((i) => i !== prod.id) })} className="rounded" />
                                                    <span className="truncate">{prod.name}</span>
                                                    <span className="text-xs text-[#6e6e73]">₹{prod.price}</span>
                                                </label>
                                            );
                                        })}
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
                                    <div><label className="block text-xs text-[#6e6e73] mb-1">Description</label><textarea className={INPUT} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="flex items-center gap-1.5 text-xs text-[#6e6e73] mb-1"><Truck size={12} /> Shipping</label><input className={INPUT} value={form.shippingInfo} onChange={(e) => setForm({ ...form, shippingInfo: e.target.value })} placeholder="e.g. 3–5 days" /></div>
                                        <div><label className="block text-xs text-[#6e6e73] mb-1">Returns</label><input className={INPUT} value={form.returnInfo} onChange={(e) => setForm({ ...form, returnInfo: e.target.value })} placeholder="e.g. 7 days" /></div>
                                    </div>
                                </div>
                            </details>

                            <details className="group border border-black/[0.08] rounded-lg overflow-hidden" open>
                                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors [&::-webkit-details-marker]:hidden">
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f]">
                                        <ImageIcon size={16} className="text-[#6e6e73]" />
                                        Media (images, gallery, 3D)
                                    </span>
                                    <span className="flex items-center gap-1 text-[#6e6e73]">
                                        <ChevronRight size={18} className="group-open:hidden" />
                                        <ChevronDown size={18} className="hidden group-open:block" />
                                    </span>
                                </summary>
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-black/[0.06]">
                                    <ImageUploader label="Images" multiple initialUrls={form.images || []} onUploaded={(urls) => setForm({ ...form, images: urls })} />
                                    <div>
                                        <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-[#6e6e73]">Gallery (max 6)</span>{(form.gallery || []).length < 6 && <button type="button" onClick={() => setForm({ ...form, gallery: [...(form.gallery || []), { url: "", type: "image" }] })} className="text-xs font-medium text-[#1d1d1f] hover:underline">+ Add</button>}</div>
                                        <div className="space-y-1.5">
                                            {(form.gallery || []).map((item, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="relative w-24">
                                                        <select className={`${INPUT} w-full py-1.5 text-xs pr-8 appearance-none`} value={item.type || "image"} onChange={(e) => { const g = [...(form.gallery || [])]; g[i] = { ...g[i], type: e.target.value }; setForm({ ...form, gallery: g }); }}><option value="image">Image</option><option value="video">Video</option></select>
                                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#6e6e73]" />
                                                    </div>
                                                    <input className={`${INPUT} flex-1 py-1.5 text-xs`} placeholder="URL" value={item.url || ""} onChange={(e) => { const g = [...(form.gallery || [])]; g[i] = { ...g[i], url: e.target.value }; setForm({ ...form, gallery: g }); }} />
                                                    <button type="button" onClick={() => setForm({ ...form, gallery: (form.gallery || []).filter((_, j) => j !== i) })} className="p-1.5 rounded hover:bg-red-50 text-red-500"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-violet-50/50 p-3 space-y-2">
                                        <Model3DUploader label="3D model" initialModels={form.models3d || []} onUploaded={(models) => setForm({ ...form, models3d: models })} />
                                        <label className="flex items-center gap-2 cursor-pointer text-xs"><input type="checkbox" checked={!!form.model3dView360} onChange={(e) => setForm({ ...form, model3dView360: e.target.checked })} className="rounded" />360° view</label>
                                        {form.models3d?.length > 0 && (() => { const u = typeof form.models3d[0] === "string" ? form.models3d[0] : form.models3d[0]?.url; return u ? <div className="pt-1"><Product3DViewer glbUrl={u} view360={!!form.model3dView360} width={200} height={140} /></div> : null; })()}
                                    </div>
                                </div>
                            </details>

                            <details className="group border border-black/[0.08] rounded-lg overflow-hidden">
                                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors [&::-webkit-details-marker]:hidden">
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f]">
                                        <Layers size={16} className="text-[#6e6e73]" />
                                        Variants
                                    </span>
                                    <span className="flex items-center gap-1 text-[#6e6e73]">
                                        <ChevronRight size={18} className="group-open:hidden" />
                                        <ChevronDown size={18} className="hidden group-open:block" />
                                    </span>
                                </summary>
                                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-black/[0.06]">
                                    <div className="flex justify-end"><button type="button" onClick={() => setForm({ ...form, variants: [...form.variants, { id: null, color: "", images: [], stock: 0, models3d: [] }] })} className="text-xs font-medium px-2 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 flex items-center gap-1"><Plus size={12} /> Variant</button></div>
                                    {form.variants.map((v, i) => (
                                        <div key={i} className="rounded-lg border border-black/[0.06] p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[#6e6e73]">Variant {i + 1}</span>
                                                {form.variants.length > 1 && <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 text-xs">Remove</button>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input className={`${INPUT} py-1.5 text-xs`} placeholder="Color" value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} />
                                                <input className={`${INPUT} py-1.5 text-xs`} type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(i, "stock", Number(e.target.value))} />
                                            </div>
                                            <ImageUploader label="" multiple initialUrls={v.images || []} onUploaded={(urls) => updateVariant(i, "images", urls)} />
                                            <Model3DUploader label="3D" initialModels={v.models3d || []} onUploaded={(models) => updateVariant(i, "models3d", models)} />
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
