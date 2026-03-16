import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getSearchConfig, updateSearchConfig, uploadImage, getCategories } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";
const MAX_QUICK_LINKS = 5;
const MAX_POPULAR = 5;

function hrefToCategoryId(href) {
    if (!href || typeof href !== "string") return "";
    try {
        const u = new URL(href, "http://x");
        const c = u.searchParams.get("categoryId") || u.searchParams.get("category");
        return c ?? "";
    } catch {
        return "";
    }
}

function categoryIdToHref(categoryId) {
    return categoryId ? `/products?categoryId=${categoryId}` : "/products";
}

export default function SearchConfigPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [quickLinks, setQuickLinks] = useState([]);
    const [popular, setPopular] = useState([]);
    const [featured, setFeatured] = useState({ title: "", subtitle: "", image: "", link: "", categoryId: "", ctaText: "Shop now" });
    const featuredImageRef = useRef(null);
    const [uploadingFeatured, setUploadingFeatured] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [configRes, categoriesRes] = await Promise.all([getSearchConfig(), getCategories()]);
            const d = configRes;
            const cats = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data ?? categoriesRes ?? []);
            setCategories(Array.isArray(cats) ? cats : []);

            const ql = Array.isArray(d.quickLinks) ? d.quickLinks : [];
            setQuickLinks(ql.map((x) => ({ label: x.label ?? "", href: x.href ?? "/products", categoryId: hrefToCategoryId(x.href) })));

            const pop = Array.isArray(d.popular) ? d.popular : [];
            setPopular(pop.map((x) => ({ label: x.label ?? "", href: x.href ?? "/products", categoryId: hrefToCategoryId(x.href) })));

            const link = d.featured?.link ?? "";
            setFeatured({
                title: d.featured?.title ?? "",
                subtitle: d.featured?.subtitle ?? "",
                image: d.featured?.image ?? "",
                link,
                categoryId: hrefToCategoryId(link),
                ctaText: d.featured?.ctaText ?? "Shop now",
            });
        } catch (e) {
            setError(e?.message || "Failed to load search config");
            setQuickLinks([]);
            setPopular([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addQuickLink = () => setQuickLinks((s) => (s.length >= MAX_QUICK_LINKS ? s : [...s, { label: "", href: "/products", categoryId: "" }]));
    const removeQuickLink = (i) => setQuickLinks((s) => s.filter((_, j) => j !== i));
    const updateQuickLink = (i, field, value) => {
        setQuickLinks((s) => s.map((x, j) => {
            if (j !== i) return x;
            const next = { ...x, [field]: value };
            if (field === "categoryId") next.href = categoryIdToHref(value);
            return next;
        }));
    };

    const addPopular = () => setPopular((s) => (s.length >= MAX_POPULAR ? s : [...s, { label: "", href: "/products", categoryId: "" }]));
    const removePopular = (i) => setPopular((s) => s.filter((_, j) => j !== i));
    const updatePopular = (i, field, value) => {
        setPopular((s) => s.map((x, j) => {
            if (j !== i) return x;
            const next = { ...x, [field]: value };
            if (field === "categoryId") next.href = categoryIdToHref(value);
            return next;
        }));
    };

    const handleFeaturedImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setUploadingFeatured(true);
        try {
            const data = await uploadImage(file);
            setFeatured((f) => ({ ...f, image: data.url || data.secure_url || data.fileUrl || "" }));
        } catch (err) {
            alert(err.message || "Upload failed");
        } finally {
            setUploadingFeatured(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const qlPayload = quickLinks.map(({ label, href, categoryId }) => ({ label, href: categoryIdToHref(categoryId) }));
            const popPayload = popular.map(({ label, href, categoryId }) => ({ label, href: categoryIdToHref(categoryId) }));
            const featuredLink = categoryIdToHref(featured.categoryId);
            const featuredPayload = featured.title || featured.image || featuredLink
                ? { title: featured.title, subtitle: featured.subtitle, image: featured.image, link: featuredLink, ctaText: featured.ctaText }
                : undefined;
            await updateSearchConfig({
                quickLinks: qlPayload,
                popular: popPayload,
                featured: featuredPayload,
            });
            alert("Search config saved.");
            fetchData();
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <Head><title>Search config — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Search config — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-8 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Content shown when users click the search icon: Quick Links, Popular tags, and optional Featured product card.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <form onSubmit={handleSave} className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Quick Links (max {MAX_QUICK_LINKS})</h3>
                            <div className="space-y-2">
                                {quickLinks.map((link, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input className={INPUT} value={link.label ?? ""} onChange={(e) => updateQuickLink(i, "label", e.target.value)} placeholder="Label (e.g. Titanium Series)" />
                                        <select className={INPUT} value={link.categoryId ?? ""} onChange={(e) => updateQuickLink(i, "categoryId", e.target.value)}>
                                            <option value="">All products</option>
                                            {categories.map((c) => (
                                                <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.name ?? c.title ?? c.id ?? c._id}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => removeQuickLink(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addQuickLink} disabled={quickLinks.length >= MAX_QUICK_LINKS} className="flex items-center gap-2 text-sm text-[#1d1d1f] font-medium disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={14} /> Add Quick Link</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Popular (tags) (max {MAX_POPULAR})</h3>
                            <div className="space-y-2">
                                {popular.map((tag, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input className={INPUT} value={tag.label ?? ""} onChange={(e) => updatePopular(i, "label", e.target.value)} placeholder="Label (e.g. Cases)" />
                                        <select className={INPUT} value={tag.categoryId ?? ""} onChange={(e) => updatePopular(i, "categoryId", e.target.value)}>
                                            <option value="">All products</option>
                                            {categories.map((c) => (
                                                <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.name ?? c.title ?? c.id ?? c._id}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => removePopular(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addPopular} disabled={popular.length >= MAX_POPULAR} className="flex items-center gap-2 text-sm text-[#1d1d1f] font-medium disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={14} /> Add Popular tag</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Featured card (optional)</h3>
                            <div className="space-y-3 p-4 rounded-xl bg-[#f5f5f7]">
                                <div>
                                    <label className="block text-xs text-[#6e6e73] mb-1">Title</label>
                                    <input className={INPUT} value={featured.title} onChange={(e) => setFeatured({ ...featured, title: e.target.value })} placeholder="e.g. iPhone 15 Pro Leather Case" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6e6e73] mb-1">Subtitle</label>
                                    <input className={INPUT} value={featured.subtitle} onChange={(e) => setFeatured({ ...featured, subtitle: e.target.value })} placeholder="Optional short line" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6e6e73] mb-1">Image</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input ref={featuredImageRef} type="file" accept="image/*" className="hidden" onChange={handleFeaturedImage} />
                                        {featured.image && <img src={featured.image} alt="" className="w-14 h-14 object-cover rounded-lg border shrink-0" />}
                                        <input className={INPUT} value={featured.image} onChange={(e) => setFeatured({ ...featured, image: e.target.value })} placeholder="URL or upload" />
                                        <button type="button" onClick={() => featuredImageRef.current?.click()} disabled={uploadingFeatured} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm font-medium hover:bg-black/5 disabled:opacity-50">
                                            {uploadingFeatured ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                            {uploadingFeatured ? "Uploading..." : "Upload"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6e6e73] mb-1">Where Shop now goes (products + category)</label>
                                    <select className={INPUT} value={featured.categoryId ?? ""} onChange={(e) => setFeatured({ ...featured, categoryId: e.target.value })}>
                                        <option value="">All products (/products)</option>
                                        {categories.map((c) => (
                                            <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.name ?? c.title ?? c.id ?? c._id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6e6e73] mb-1">CTA text</label>
                                    <input className={INPUT} value={featured.ctaText} onChange={(e) => setFeatured({ ...featured, ctaText: e.target.value })} placeholder="Shop now" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save Search config"}
                        </button>
                    </form>
                    )}
                </div>
            </Layout>
        </>
    );
}
