import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getTestimonials, updateTestimonials, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function TestimonialsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getTestimonials();
            setItems(d.items || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const addItem = () => setItems((i) => [...i, { quote: "", name: "", title: "", rating: 5, avatar: "", date: "" }]);
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
            alert("Testimonials saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
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
                    <p className="text-sm text-[#6e6e73]">What People Say: quote cards with rating, name, avatar.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-[#1d1d1f]">Items</label>
                            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline"><Plus size={16} /> Add</button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        <div className="space-y-3">
                            {items.map((it, i) => (
                                <div key={i} className="p-4 rounded-xl border border-black/10 bg-white space-y-2">
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
                            ))}
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
