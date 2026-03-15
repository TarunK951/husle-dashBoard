import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getTestimonials, updateTestimonials, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload, Pencil } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

function itemsEqual(a, b) {
    if (a.length !== b.length) return false;
    return JSON.stringify(a.map((x) => ({ ...x, id: x.id }))) === JSON.stringify(b.map((x) => ({ ...x, id: x.id })));
}

export default function TestimonialsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getTestimonials();
            const list = d.items || [];
            setItems(list);
            setSavedItems(list);
            setExpandedIndex(null);
        } catch (e) { setError(e?.message || "Failed to load testimonials"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const isDirty = !itemsEqual(items, savedItems);

    const addItem = () => {
        setItems((i) => [...i, { quote: "", name: "", title: "", rating: 5, avatar: "", date: "" }]);
        setExpandedIndex(items.length);
    };
    const removeItem = (idx) => {
        setItems((i) => i.filter((_, j) => j !== idx));
        if (expandedIndex === idx) setExpandedIndex(null);
        else if (expandedIndex != null && expandedIndex > idx) setExpandedIndex(expandedIndex - 1);
    };
    const updateItem = (idx, field, value) => setItems((i) => i.map((x, j) => (j === idx ? { ...x, [field]: value } : x)));

    const triggerUpload = (idx) => { setUploadingIndex(idx); fileInputRef.current?.click(); };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        const idx = uploadingIndex;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            updateItem(idx, "avatar", data.url || data.secure_url || data.fileUrl || "");
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setUploadingIndex(null); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateTestimonials({
                items: items.map((x) => ({
                    id: x.id,
                    quote: x.quote,
                    name: x.name,
                    title: x.title,
                    rating: Number(x.rating) || 0,
                    avatar: x.avatar || undefined,
                    date: x.date || undefined,
                })),
            });
            setSavedItems(items);
            setExpandedIndex(null);
            alert("Testimonials saved.");
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleCancel = () => {
        setItems([...savedItems]);
        setExpandedIndex(null);
    };

    if (loading) {
        return (
            <>
                <Head><title>Testimonials — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Testimonials — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">What People Say: quote cards with rating, name, avatar. Saved items appear in the list; edit or add new, then Save when you have changes.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <>
                        {/* List view: saved items */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[#1d1d1f]">Testimonials</h2>
                            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline"><Plus size={16} /> Add</button>
                        </div>
                        <div className="space-y-2">
                            {items.length === 0 ? (
                                <p className="text-sm text-[#6e6e73] py-4 border border-black/5 rounded-xl bg-white text-center">No testimonials yet. Click Add to create one.</p>
                            ) : (
                                items.map((it, i) => (
                                    <div key={it.id ?? `i-${i}`} className="rounded-xl border border-black/10 bg-white overflow-hidden">
                                        {expandedIndex === i ? (
                                            <div className="p-4 space-y-2 border-t-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-semibold text-[#6e6e73]">{it.id ? "Edit" : "New"}</span>
                                                    <button type="button" onClick={() => setExpandedIndex(null)} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f]">Collapse</button>
                                                </div>
                                                <textarea className={INPUT} rows={2} placeholder="Quote" value={it.quote} onChange={(e) => updateItem(i, "quote", e.target.value)} />
                                                <input className={INPUT} placeholder="Name" value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
                                                <input className={INPUT} placeholder="Title (e.g. Verified Buyer · Titanium X)" value={it.title} onChange={(e) => updateItem(i, "title", e.target.value)} />
                                                <input className={INPUT} type="number" min={1} max={5} step={0.5} placeholder="Rating 1–5" value={it.rating} onChange={(e) => updateItem(i, "rating", e.target.value)} />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {it.avatar ? <img src={it.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-black/10 shrink-0" /> : null}
                                                    <input className={`${INPUT} flex-1 min-w-[140px]`} placeholder="Avatar URL or upload" value={it.avatar || ""} onChange={(e) => updateItem(i, "avatar", e.target.value)} />
                                                    <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                                        {uploadingIndex === i ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                                        {uploadingIndex === i ? "Uploading..." : "Upload"}
                                                    </button>
                                                </div>
                                                <input className={INPUT} placeholder="Date (optional)" value={it.date || ""} onChange={(e) => updateItem(i, "date", e.target.value)} />
                                                <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:underline text-sm flex items-center gap-1"><Trash2 size={14} /> Remove</button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setExpandedIndex(i)}
                                                className="w-full p-4 flex items-center gap-4 text-left hover:bg-[#f5f5f7]/50 transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-full border border-black/10 bg-[#f5f5f7] overflow-hidden shrink-0 flex items-center justify-center">
                                                    {it.avatar ? <img src={it.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-[#6e6e73] text-lg font-medium">{(it.name || "?")[0]}</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-[#1d1d1f] truncate">{it.name || "—"}</p>
                                                    <p className="text-sm text-[#6e6e73] truncate">{it.title || "—"}</p>
                                                    <p className="text-xs text-[#6e6e73] mt-0.5 line-clamp-1">{it.quote || "No quote"}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs font-medium text-amber-600">★ {Number(it.rating) || 0}</span>
                                                    <Pencil size={14} className="text-[#6e6e73]" />
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                        {/* Save button: only enabled when there are unsaved changes */}
                        <div className="flex gap-3 pt-2 border-t border-black/10">
                            {isDirty && (
                                <button type="button" onClick={handleCancel} className="py-2.5 px-4 rounded-xl border border-black/10 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className="py-2.5 px-6 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </>
                    )}
                </div>
            </Layout>
        </>
    );
}
