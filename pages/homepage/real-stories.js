import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getUnboxing, updateUnboxing } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function RealStoriesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getUnboxing();
            setItems(d.items || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const addItem = () => setItems((i) => [...i, { type: "image", src: "", videoSrc: "", title: "", user: "", rating: 5 }]);
    const removeItem = (idx) => setItems((i) => i.filter((_, j) => j !== idx));
    const updateItem = (idx, field, value) => setItems((i) => i.map((x, j) => (j === idx ? { ...x, [field]: value } : x)));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateUnboxing({ items: items.map((x) => ({ id: x.id, type: x.type || "image", src: x.src, videoSrc: x.videoSrc || undefined, title: x.title, user: x.user, rating: Number(x.rating) || 0 })) });
            alert("Real stories saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>Real stories — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Real stories — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Carousel of videos and images (real stories / unboxing).</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-[#1d1d1f]">Items</label>
                            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline"><Plus size={16} /> Add</button>
                        </div>
                        <div className="space-y-3">
                            {items.map((it, i) => (
                                <div key={i} className="p-4 rounded-xl border border-black/10 bg-white space-y-2">
                                    <select className={INPUT} value={it.type} onChange={(e) => updateItem(i, "type", e.target.value)}>
                                        <option value="video">Video</option>
                                        <option value="image">Image</option>
                                    </select>
                                    <input className={INPUT} placeholder="Source URL (image or video)" value={it.src} onChange={(e) => updateItem(i, "src", e.target.value)} />
                                    <input className={INPUT} placeholder="Video URL (optional, for popup when card is image)" value={it.videoSrc || ""} onChange={(e) => updateItem(i, "videoSrc", e.target.value)} />
                                    <input className={INPUT} placeholder="Title" value={it.title} onChange={(e) => updateItem(i, "title", e.target.value)} />
                                    <input className={INPUT} placeholder="User / handle" value={it.user} onChange={(e) => updateItem(i, "user", e.target.value)} />
                                    <input className={INPUT} type="number" min={0} max={5} step={0.5} placeholder="Star rating shown on this story card (0–5, optional)" value={it.rating} onChange={(e) => updateItem(i, "rating", e.target.value)} />
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
