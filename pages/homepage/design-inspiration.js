import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getDesignInspiration, updateDesignInspiration, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const ITEM_TYPES = ["hero", "card", "wide", "accent"];

export default function DesignInspirationPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sectionLabel, setSectionLabel] = useState("");
    const [sectionTitle, setSectionTitle] = useState("");
    const [sectionDescription, setSectionDescription] = useState("");
    const [ctaText, setCtaText] = useState("");
    const [ctaLink, setCtaLink] = useState("");
    const [items, setItems] = useState([]);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getDesignInspiration();
            setSectionLabel(d.sectionLabel ?? "");
            setSectionTitle(d.sectionTitle ?? "");
            setSectionDescription(d.sectionDescription ?? "");
            setCtaText(d.ctaText ?? "");
            setCtaLink(d.ctaLink ?? "");
            setItems(d.items || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const addItem = () => setItems((i) => [...i, { type: "card", category: "", title: "", subtitle: "", url: "", href: "", dark: false }]);
    const removeItem = (idx) => setItems((i) => i.filter((_, j) => j !== idx));
    const updateItem = (idx, field, value) => setItems((i) => i.map((x, j) => (j === idx ? { ...x, [field]: value } : x)));

    const triggerUpload = (idx) => { setUploadingIndex(idx); fileInputRef.current?.click(); };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        const idx = uploadingIndex;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            updateItem(idx, "url", data.url || data.secure_url || data.fileUrl || "");
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setUploadingIndex(null); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDesignInspiration({
                sectionLabel: sectionLabel || undefined,
                sectionTitle: sectionTitle || undefined,
                sectionDescription: sectionDescription || undefined,
                ctaText: ctaText || undefined,
                ctaLink: ctaLink || undefined,
                items: items.map((x) => ({
                    id: x.id,
                    type: x.type || "card",
                    category: x.category || undefined,
                    title: x.title || undefined,
                    subtitle: x.subtitle || undefined,
                    url: x.url || undefined,
                    href: x.href || undefined,
                    dark: !!x.dark,
                })),
            });
            alert("Design Inspiration saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>Design Inspiration — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Design Inspiration — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Bento-style grid: section header and items (hero, card, wide, accent).</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section label</label><input className={INPUT} value={sectionLabel} onChange={(e) => setSectionLabel(e.target.value)} placeholder="Showcase" /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section title</label><input className={INPUT} value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Design Inspiration" /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section description</label><textarea className={INPUT} rows={2} value={sectionDescription} onChange={(e) => setSectionDescription(e.target.value)} /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">CTA text</label><input className={INPUT} value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Explore Gallery" /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">CTA link</label><input className={INPUT} value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/gallery" /></div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[#1d1d1f]">Items</label>
                                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline"><Plus size={16} /> Add</button>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <div className="space-y-3">
                                {items.map((it, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-black/10 bg-white space-y-2">
                                        <select className={INPUT} value={it.type} onChange={(e) => updateItem(i, "type", e.target.value)}>
                                            {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input className={INPUT} placeholder="Category badge" value={it.category} onChange={(e) => updateItem(i, "category", e.target.value)} />
                                        <input className={INPUT} placeholder="Title" value={it.title} onChange={(e) => updateItem(i, "title", e.target.value)} />
                                        <input className={INPUT} placeholder="Subtitle" value={it.subtitle} onChange={(e) => updateItem(i, "subtitle", e.target.value)} />
                                        <div className="flex flex-wrap items-center gap-2">
                                            {it.url ? <img src={it.url} alt="" className="w-12 h-12 object-cover rounded-lg border border-black/10 shrink-0" /> : null}
                                            <input className={`${INPUT} flex-1 min-w-[140px]`} placeholder="Image URL or upload" value={it.url} onChange={(e) => updateItem(i, "url", e.target.value)} />
                                            <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                                {uploadingIndex === i ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                                {uploadingIndex === i ? "Uploading..." : "Upload"}
                                            </button>
                                        </div>
                                        <input className={INPUT} placeholder="Link (href)" value={it.href} onChange={(e) => updateItem(i, "href", e.target.value)} />
                                        <label className="flex items-center gap-2 text-sm text-[#6e6e73]">
                                            <input type="checkbox" checked={!!it.dark} onChange={(e) => updateItem(i, "dark", e.target.checked)} />
                                            Dark card style
                                        </label>
                                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:underline text-sm flex items-center gap-1"><Trash2 size={14} /> Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </form>
                </div>
            </Layout>
        </>
    );
}
