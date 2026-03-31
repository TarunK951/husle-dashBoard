import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { getDashboardUser, canWriteSection } from "@/lib/permissions";
import { getProducts, getProduct, updateProduct } from "@/lib/api";
import {
    Warehouse,
    Search,
    Package,
    Layers,
    Palette,
    Save,
    ChevronDown,
    ChevronRight,
    Image as ImageIcon,
    Loader2,
} from "lucide-react";
import Head from "next/head";

const INPUT =
    "w-full min-w-[4.5rem] max-w-[6rem] px-2 py-1.5 rounded-lg border border-black/10 bg-white text-[#1d1d1f] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]";

function toSlug(value = "") {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeProductFromApi(p) {
    if (!p) return p;
    const variants = p.ProductVariants ?? p.variants;
    const discount = p.discountPercent ?? p.discount;
    const model =
        p.model ||
        (p.category
            ? { id: p.category.id, name: p.category.name, slug: p.category.slug || toSlug(p.category.name) }
            : undefined);
    const brand =
        (typeof p.brand === "string" && p.brand.trim() ? { name: p.brand, slug: toSlug(p.brand) } : p.brand) ||
        (p.category?.parent
            ? {
                  id: p.category.parent.id,
                  name: p.category.parent.name,
                  slug: p.category.parent.slug || toSlug(p.category.parent.name),
              }
            : undefined);
    return {
        ...p,
        variants: Array.isArray(variants) ? variants : p.variants,
        discount: discount ?? p.discount,
        model,
        brand,
    };
}

function normalizeVariantForPayload(v) {
    const idRaw = v?.id;
    const idNum = idRaw != null && idRaw !== "" ? Number(idRaw) : null;
    const images = Array.isArray(v?.images) ? v.images.filter(Boolean) : v?.images ? [v.images] : [];
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

function normalizeModelForPayload(m) {
    const idRaw = m?.id;
    const idNum = idRaw != null && idRaw !== "" ? Number(idRaw) : null;
    const images = Array.isArray(m?.images) ? m.images.filter(Boolean) : [];
    const models3d = Array.isArray(m?.models3d)
        ? m.models3d.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
        : [];
    const name = String(m?.name || "").trim();
    const colors = Array.isArray(m?.colors) ? m.colors : [];
    return {
        ...(Number.isFinite(idNum) && idNum > 0 ? { id: idNum } : {}),
        name,
        images,
        models3d,
        model3dView360: !!m?.model3dView360,
        colors: colors
            .map((c) => {
                const cidRaw = c?.id;
                const cidNum = cidRaw != null && cidRaw !== "" ? Number(cidRaw) : null;
                const color = String(c?.color || "").trim();
                const colorCode = String(c?.colorCode || "").trim();
                const stock = Number(c?.stock ?? 0);
                return {
                    ...(Number.isFinite(cidNum) && cidNum > 0 ? { id: cidNum } : {}),
                    color,
                    ...(colorCode ? { colorCode } : {}),
                    stock: Number.isFinite(stock) ? stock : 0,
                };
            })
            .filter((c) => c.color),
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

function hasModelContent(m) {
    return Boolean(
        (m?.name && String(m.name).trim()) ||
        (Array.isArray(m?.images) && m.images.length > 0) ||
        (Array.isArray(m?.models3d) && m.models3d.length > 0) ||
        (Array.isArray(m?.colors) && m.colors.some((c) => c?.color && String(c.color).trim())) ||
        (m?.id != null && m.id !== "")
    );
}

function buildUpdatePayloadFromProduct(p) {
    const categoryIdNum = Number(p.categoryId);
    const imagesArray = Array.isArray(p.images) ? p.images : [];
    const galleryArray = (Array.isArray(p.gallery) ? p.gallery : [])
        .slice(0, 6)
        .map((g) => {
            if (typeof g === "string") return { url: g, type: "image" };
            if (g && typeof g === "object") return { url: g.url || "", type: g.type || "image" };
            return null;
        })
        .filter((g) => g && g.url && g.url.trim());
    const variantsRaw = p.variants || p.ProductVariants || [];
    const variantsNormalized = variantsRaw.map(normalizeVariantForPayload).filter(hasVariantContent);
    const modelsRaw = Array.isArray(p.models) ? p.models : [];
    const modelsNormalized = modelsRaw.map(normalizeModelForPayload).filter(hasModelContent);
    const brandRaw = typeof p.brand === "object" && p.brand ? p.brand.name : p.brand;
    const brand =
        brandRaw != null && String(brandRaw).trim() !== "" ? String(brandRaw).trim() : undefined;
    const disc = p.discountPercent ?? p.discount;
    return {
        name: p.name,
        description: p.description || "",
        price: Number(p.price),
        slashedPrice: p.slashedPrice != null && p.slashedPrice !== "" ? Number(p.slashedPrice) : undefined,
        categoryId: categoryIdNum,
        brand,
        shippingInfo: p.shippingInfo || "",
        returnInfo: p.returnInfo || "",
        tags: Array.isArray(p.tags) ? p.tags : [],
        images: imagesArray,
        gallery: galleryArray,
        models3d: (p.models3d || []).map((m) => (typeof m === "string" ? m : m.url)),
        model3dView360: !!p.model3dView360,
        variants: variantsNormalized,
        ProductVariants: variantsNormalized,
        models: modelsNormalized,
        featured: !!p.featured,
        limited: !!p.limited,
        offer: !!p.offer,
        discount: p.offer && disc != null && disc !== "" ? Number(disc) : undefined,
        discountPercent: p.offer && disc != null && disc !== "" ? Number(disc) : undefined,
        isBundle: !!p.isBundle,
        bundleProductIds: Array.isArray(p.bundleProductIds) ? p.bundleProductIds.filter(Boolean) : undefined,
        screenGuardOptions: Array.isArray(p.screenGuardOptions) ? p.screenGuardOptions : [],
    };
}

function sumStockForProduct(row) {
    let sum = 0;
    (row.modelLines || []).forEach((l) => {
        sum += Number(l.stock) || 0;
    });
    (row.variantLines || []).forEach((l) => {
        sum += Number(l.stock) || 0;
    });
    return sum;
}

function buildLinesFromProduct(p) {
    const row = normalizeProductFromApi(p);
    const modelLines = [];
    const models = Array.isArray(row.models) ? row.models : [];
    models.forEach((m, mi) => {
        const modelName = (m.name || "").trim() || `Model ${mi + 1}`;
        const colors = Array.isArray(m.colors) ? m.colors : [];
        if (colors.length === 0) {
            modelLines.push({
                kind: "modelColor",
                key: `${row.id}-m${mi}-c0`,
                productId: row.id,
                modelIndex: mi,
                colorIndex: 0,
                modelName,
                colorLabel: "—",
                stock: 0,
            });
        } else {
            colors.forEach((c, ci) => {
                const colorLabel = (c.color || "").trim() || "—";
                modelLines.push({
                    kind: "modelColor",
                    key: `${row.id}-m${mi}-c${ci}`,
                    productId: row.id,
                    modelIndex: mi,
                    colorIndex: ci,
                    modelName,
                    colorLabel,
                    stock: Number(c.stock ?? 0),
                });
            });
        }
    });

    const variantLines = [];
    const variants = row.variants || row.ProductVariants || [];
    if (Array.isArray(variants)) {
        variants.forEach((v, vi) => {
            const colorLabel = (v.color || "").trim() || `Variant ${vi + 1}`;
            variantLines.push({
                kind: "variant",
                key: `${row.id}-v${vi}`,
                productId: row.id,
                variantIndex: vi,
                modelName: "Legacy variant",
                colorLabel,
                stock: Number(v.stock ?? 0),
            });
        });
    }

    return { product: row, modelLines, variantLines };
}

export default function InventoryPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [openId, setOpenId] = useState(null);
    const [draft, setDraft] = useState({});
    const [savingKey, setSavingKey] = useState(null);
    const [savingProductId, setSavingProductId] = useState(null);
    const searchDebounceBoot = useRef(true);
    const [dashUser, setDashUser] = useState(null);
    useEffect(() => {
        setDashUser(getDashboardUser());
    }, []);
    const canWriteProducts = canWriteSection(dashUser, "products");

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProducts({ page: 1, limit: 500, search: search.trim() || undefined });
            const list = Array.isArray(data) ? data : data.products || data.data || data.items || [];
            setProducts(Array.isArray(list) ? list : []);
        } catch (e) {
            setError(e?.message || "Failed to load products");
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        if (searchDebounceBoot.current) {
            searchDebounceBoot.current = false;
            fetchProducts();
            return undefined;
        }
        const t = setTimeout(() => fetchProducts(), 300);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    const rows = useMemo(() => products.map((p) => buildLinesFromProduct(p)), [products]);

    const totals = useMemo(() => {
        let units = 0;
        let skus = 0;
        rows.forEach((r) => {
            const m = r.modelLines.length;
            const v = r.variantLines.length;
            skus += m + v;
            units += sumStockForProduct(r);
        });
        return { units, skus, products: rows.length };
    }, [rows]);

    const setDraftVal = (key, value) => {
        setDraft((d) => ({ ...d, [key]: value }));
    };

    const getDraftOr = (key, fallback) => {
        if (draft[key] !== undefined && draft[key] !== "") return draft[key];
        return fallback;
    };

    async function saveLine(line) {
        if (!canWriteProducts) return;
        const { productId, kind } = line;
        const key = line.key;
        const rawVal = getDraftOr(key, line.stock);
        const nextStock = Math.max(0, Math.floor(Number(rawVal)));
        if (Number.isNaN(nextStock)) {
            alert("Enter a valid quantity.");
            return;
        }
        setSavingKey(key);
        try {
            const raw = await getProduct(productId);
            const p = normalizeProductFromApi(raw);
            if (kind === "modelColor") {
                const models = Array.isArray(p.models) ? [...p.models] : [];
                const m = models[line.modelIndex];
                if (!m) throw new Error("Model not found");
                const colors = Array.isArray(m.colors) ? [...m.colors] : [];
                const c = colors[line.colorIndex];
                if (!c) {
                    colors[line.colorIndex] = { color: "Default", stock: nextStock };
                } else {
                    colors[line.colorIndex] = { ...c, stock: nextStock };
                }
                models[line.modelIndex] = { ...m, colors };
                p.models = models;
            } else if (kind === "variant") {
                const variants = [...(p.variants || p.ProductVariants || [])];
                const v = variants[line.variantIndex];
                if (!v) throw new Error("Variant not found");
                variants[line.variantIndex] = { ...v, stock: nextStock };
                p.variants = variants;
                p.ProductVariants = variants;
            }
            const payload = buildUpdatePayloadFromProduct(p);
            await updateProduct(String(productId), payload);
            setDraft((d) => {
                const next = { ...d };
                delete next[key];
                return next;
            });
            await fetchProducts();
        } catch (e) {
            alert(e?.message || "Failed to save stock");
        } finally {
            setSavingKey(null);
        }
    }

    async function saveAllForProduct(productId) {
        if (!canWriteProducts) return;
        const row = rows.find((r) => String(r.product.id) === String(productId));
        if (!row) return;
        const lines = [...row.modelLines, ...row.variantLines];
        setSavingProductId(productId);
        try {
            const raw = await getProduct(productId);
            let p = normalizeProductFromApi(raw);
            for (const line of lines) {
                const key = line.key;
                const rawVal = getDraftOr(key, line.stock);
                const nextStock = Math.max(0, Math.floor(Number(rawVal)));
                if (Number.isNaN(nextStock)) continue;
                if (line.kind === "modelColor") {
                    const models = Array.isArray(p.models) ? [...p.models] : [];
                    const m = models[line.modelIndex];
                    if (!m) continue;
                    const colors = Array.isArray(m.colors) ? [...m.colors] : [];
                    const c = colors[line.colorIndex];
                    if (!c) colors[line.colorIndex] = { color: "Default", stock: nextStock };
                    else colors[line.colorIndex] = { ...c, stock: nextStock };
                    models[line.modelIndex] = { ...m, colors };
                    p = { ...p, models };
                } else if (line.kind === "variant") {
                    const variants = [...(p.variants || p.ProductVariants || [])];
                    const v = variants[line.variantIndex];
                    if (!v) continue;
                    variants[line.variantIndex] = { ...v, stock: nextStock };
                    p = { ...p, variants, ProductVariants: variants };
                }
            }
            const payload = buildUpdatePayloadFromProduct(p);
            await updateProduct(String(productId), payload);
            setDraft((d) => {
                const next = { ...d };
                lines.forEach((l) => delete next[l.key]);
                return next;
            });
            await fetchProducts();
        } catch (e) {
            alert(e?.message || "Failed to save inventory");
        } finally {
            setSavingProductId(null);
        }
    }

    return (
        <>
            <Head>
                <title>Inventory — Hustle Admin</title>
            </Head>
            <Layout>
                <div className="space-y-5 fade-in max-w-6xl">
                    {dashUser?.role === "staff" && !canWriteProducts && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong className="font-semibold">View only.</strong> Stock quantities cannot be changed without Edit access on Products.
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[#1d1d1f] flex items-center gap-2">
                                <Warehouse className="text-[#6e6e73]" size={22} />
                                Inventory
                            </h1>
                            <p className="text-sm text-[#6e6e73] mt-1">
                                Track stock by product, device model, and color. Quantities sync with the product catalog.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search products"
                                    className="pl-8 pr-3 py-2 rounded-xl border border-black/10 bg-white text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border border-black/[0.06] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">Products</p>
                            <p className="text-2xl font-bold text-[#1d1d1f]">{loading ? "—" : totals.products}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-black/[0.06] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">SKU lines</p>
                            <p className="text-2xl font-bold text-[#1d1d1f]">{loading ? "—" : totals.skus}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-black/[0.06] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">Total units</p>
                            <p className="text-2xl font-bold text-[#1d1d1f]">{loading ? "—" : totals.units}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={fetchProducts} className="text-sm font-medium text-red-800 underline">
                                Retry
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                        {loading ? (
                            <div className="p-8 flex items-center justify-center gap-2 text-[#6e6e73]">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-sm">Loading inventory…</span>
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="p-12 text-center text-sm text-[#6e6e73]">No products match your search.</div>
                        ) : (
                            <ul className="divide-y divide-black/[0.06]">
                                {rows.map(({ product: p, modelLines, variantLines }) => {
                                    const total = sumStockForProduct({ modelLines, variantLines });
                                    const expanded = openId === p.id;
                                    const hasLines = modelLines.length + variantLines.length > 0;
                                    return (
                                        <li key={p.id}>
                                            <button
                                                type="button"
                                                onClick={() => setOpenId(expanded ? null : p.id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
                                            >
                                                <span className="text-[#6e6e73]">
                                                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </span>
                                                {p.images?.[0] ? (
                                                    <img
                                                        src={p.images[0]}
                                                        alt=""
                                                        className="w-10 h-10 rounded-lg object-cover border border-black/[0.06]"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-black/[0.04] flex items-center justify-center">
                                                        <ImageIcon size={18} className="text-[#6e6e73]" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-[#1d1d1f] truncate">{p.name}</p>
                                                    <p className="text-xs text-[#6e6e73]">
                                                        {hasLines
                                                            ? `${modelLines.length} model line(s) · ${variantLines.length} legacy variant(s) · ${total} units`
                                                            : "No model or variant rows — add models & colors under Products"}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-semibold text-[#1d1d1f] tabular-nums">{total} units</span>
                                            </button>
                                            {expanded && (
                                                <div className="px-4 pb-4 pt-0 border-t border-black/[0.04] bg-[#fafafa]">
                                                    {modelLines.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-2 flex items-center gap-1.5">
                                                                <Layers size={12} /> Models & colors
                                                            </p>
                                                            <div className="rounded-lg border border-black/[0.06] overflow-hidden bg-white">
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="bg-black/[0.02] border-b border-black/[0.06]">
                                                                            <th className="text-left px-3 py-2 text-xs font-medium text-[#6e6e73]">
                                                                                Model
                                                                            </th>
                                                                            <th className="text-left px-3 py-2 text-xs font-medium text-[#6e6e73]">
                                                                                Color
                                                                            </th>
                                                                            <th className="text-right px-3 py-2 text-xs font-medium text-[#6e6e73] w-32">
                                                                                Qty
                                                                            </th>
                                                                            <th className="w-28 px-3 py-2" />
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {modelLines.map((line) => (
                                                                            <tr key={line.key} className="border-b border-black/[0.04] last:border-0">
                                                                                <td className="px-3 py-2 text-[#1d1d1f]">{line.modelName}</td>
                                                                                <td className="px-3 py-2 text-[#6e6e73]">{line.colorLabel}</td>
                                                                                <td className="px-3 py-2 text-right">
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        readOnly={!canWriteProducts}
                                                                                        className={`${INPUT} inline-block`}
                                                                                        value={getDraftOr(line.key, line.stock)}
                                                                                        onChange={(e) => setDraftVal(line.key, e.target.value)}
                                                                                    />
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => saveLine(line)}
                                                                                        disabled={!canWriteProducts || savingKey === line.key}
                                                                                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-black disabled:opacity-50"
                                                                                    >
                                                                                        {savingKey === line.key ? (
                                                                                            <Loader2 size={12} className="animate-spin" />
                                                                                        ) : (
                                                                                            <Save size={12} />
                                                                                        )}
                                                                                        Save
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {variantLines.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-2 flex items-center gap-1.5">
                                                                <Palette size={12} /> Legacy variants
                                                            </p>
                                                            <div className="rounded-lg border border-black/[0.06] overflow-hidden bg-white">
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="bg-black/[0.02] border-b border-black/[0.06]">
                                                                            <th className="text-left px-3 py-2 text-xs font-medium text-[#6e6e73]">
                                                                                Variant
                                                                            </th>
                                                                            <th className="text-right px-3 py-2 text-xs font-medium text-[#6e6e73] w-32">
                                                                                Qty
                                                                            </th>
                                                                            <th className="w-28 px-3 py-2" />
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {variantLines.map((line) => (
                                                                            <tr key={line.key} className="border-b border-black/[0.04] last:border-0">
                                                                                <td className="px-3 py-2 text-[#1d1d1f]">{line.colorLabel}</td>
                                                                                <td className="px-3 py-2 text-right">
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        readOnly={!canWriteProducts}
                                                                                        className={`${INPUT} inline-block`}
                                                                                        value={getDraftOr(line.key, line.stock)}
                                                                                        onChange={(e) => setDraftVal(line.key, e.target.value)}
                                                                                    />
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => saveLine(line)}
                                                                                        disabled={!canWriteProducts || savingKey === line.key}
                                                                                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-black disabled:opacity-50"
                                                                                    >
                                                                                        {savingKey === line.key ? (
                                                                                            <Loader2 size={12} className="animate-spin" />
                                                                                        ) : (
                                                                                            <Save size={12} />
                                                                                        )}
                                                                                        Save
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasLines && (
                                                        <div className="mt-3 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => saveAllForProduct(p.id)}
                                                                disabled={!canWriteProducts || savingProductId === p.id}
                                                                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] disabled:opacity-50"
                                                            >
                                                                {savingProductId === p.id ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Package size={16} />
                                                                )}
                                                                Save all for this product
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}
