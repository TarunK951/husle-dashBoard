import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getSearchConfig, updateSearchConfig, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function SearchConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quickLinks, setQuickLinks] = useState([]);
    const [popular, setPopular] = useState([]);
    const [featured, setFeatured] = useState({ title: "", subtitle: "", image: "", link: "", ctaText: "Shop now" });
    const featuredImageRef = useRef(null);
    const [uploadingFeatured, setUploadingFeatured] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getSearchConfig();
            setQuickLinks(Array.isArray(d.quickLinks) ? d.quickLinks : []);
            setPopular(Array.isArray(d.popular) ? d.popular : []);
            setFeatured({
                title: d.featured?.title ?? "",
                subtitle: d.featured?.subtitle ?? "",
                image: d.featured?.image ?? "",
                link: d.featured?.link ?? "",
                ctaText: d.featured?.ctaText ?? "Shop now",
            });
        } catch (e) {
            console.error(e);
            setQuickLinks([]);
            setPopular([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addQuickLink = () => setQuickLinks((s) => [...s, { label: "", href: "" }]);
    const removeQuickLink = (i) => setQuickLinks((s) => s.filter((_, j) => j !== i));
    const updateQuickLink = (i, field, value) => setQuickLinks((s) => s.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

    const addPopular = () => setPopular((s) => [...s, { label: "", href: "" }]);
    const removePopular = (i) => setPopular((s) => s.filter((_, j) => j !== i));
    const updatePopular = (i, field, value) => setPopular((s) => s.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

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
            await updateSearchConfig({
                quickLinks,
                popular,
                featured: featured.title || featured.image || featured.link ? featured : undefined,
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

                    <form onSubmit={handleSave} className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Quick Links</h3>
                            <div className="space-y-2">
                                {quickLinks.map((link, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input className={INPUT} value={link.label ?? ""} onChange={(e) => updateQuickLink(i, "label", e.target.value)} placeholder="Label (e.g. Titanium Series)" />
                                        <input className={INPUT} value={link.href ?? ""} onChange={(e) => updateQuickLink(i, "href", e.target.value)} placeholder="Link (e.g. /products?category=Titanium)" />
                                        <button type="button" onClick={() => removeQuickLink(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addQuickLink} className="flex items-center gap-2 text-sm text-[#1d1d1f] font-medium"><Plus size={14} /> Add Quick Link</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Popular (tags)</h3>
                            <div className="space-y-2">
                                {popular.map((tag, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input className={INPUT} value={tag.label ?? ""} onChange={(e) => updatePopular(i, "label", e.target.value)} placeholder="Label (e.g. Cases)" />
                                        <input className={INPUT} value={tag.href ?? ""} onChange={(e) => updatePopular(i, "href", e.target.value)} placeholder="Link (e.g. /search?q=Cases)" />
                                        <button type="button" onClick={() => removePopular(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addPopular} className="flex items-center gap-2 text-sm text-[#1d1d1f] font-medium"><Plus size={14} /> Add Popular tag</button>
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
                                    <label className="block text-xs text-[#6e6e73] mb-1">Link</label>
                                    <input className={INPUT} value={featured.link} onChange={(e) => setFeatured({ ...featured, link: e.target.value })} placeholder="Where Shop now goes" />
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
                </div>
            </Layout>
        </>
    );
}
