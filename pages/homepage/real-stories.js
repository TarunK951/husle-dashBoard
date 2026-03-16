import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getUnboxing, updateUnboxing, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload, Pencil } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

function normalizeItem(it) {
    return {
        id: it.id,
        type: it.type || "image",
        src: it.src || "",
        videoSrc: it.videoSrc || "",
        title: it.title || "",
        user: it.user || "",
        rating: it.rating ?? 0,
    };
}

export default function RealStoriesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getUnboxing();
            const list = (d.items || []).map(normalizeItem);
            setItems(list);
            setSavedItems(list);
            setEditingIndex(null);
        } catch (e) {
            setError(e?.message || "Failed to load real stories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addItem = () => {
        const newItem = normalizeItem({ type: "image", src: "", videoSrc: "", title: "", user: "", rating: 0 });
        setItems((i) => [...i, newItem]);
        setEditingIndex(items.length);
    };

    const removeItem = (idx) => {
        setItems((i) => i.filter((_, j) => j !== idx));
        if (editingIndex === idx) setEditingIndex(null);
        else if (editingIndex != null && editingIndex > idx) setEditingIndex(editingIndex - 1);
    };

    const updateItem = (idx, field, value) =>
        setItems((i) => i.map((x, j) => (j === idx ? { ...x, [field]: value } : x)));

    const triggerUpload = (index) => {
        setUploadingIndex(index);
        fileInputRef.current?.click();
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            const url = data.url || data.secure_url || data.fileUrl || "";
            updateItem(uploadingIndex, "src", url);
        } catch (err) {
            alert(err.message || "Upload failed");
        } finally {
            setUploadingIndex(null);
        }
    };

    const isDirty =
        items.length !== savedItems.length ||
        JSON.stringify(items.map((x) => ({ ...x, id: undefined }))) !==
        JSON.stringify(savedItems.map((x) => ({ ...x, id: undefined })));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateUnboxing({
                items: items.map((x) => ({
                    id: x.id,
                    type: x.type || "image",
                    src: x.src,
                    videoSrc: x.videoSrc || undefined,
                    title: x.title,
                    user: x.user,
                    rating: Number(x.rating) || 0,
                })),
            });
            await fetchData();
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setItems(savedItems.map((x) => ({ ...x })));
        setEditingIndex(null);
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
                    <p className="text-sm text-[#6e6e73]">Carousel of videos and images (real stories / unboxing). Saved items appear below; use Add to create new, Edit to change, then Save or Cancel.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <>
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#1d1d1f]">Saved items</h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                    <div className="space-y-3">
                        {items.map((it, i) => (
                            <div key={it.id ?? `new-${i}`} className="rounded-xl border border-black/10 bg-white overflow-hidden">
                                {editingIndex === i ? (
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-[#6e6e73]">{it.id ? "Edit item" : "New item"}</span>
                                            <button type="button" onClick={() => setEditingIndex(null)} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f]">Done</button>
                                        </div>
                                        <select className={INPUT} value={it.type} onChange={(e) => updateItem(i, "type", e.target.value)}>
                                            <option value="video">Video</option>
                                            <option value="image">Image</option>
                                        </select>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input className={INPUT} placeholder="Source URL or upload image below" value={it.src} onChange={(e) => updateItem(i, "src", e.target.value)} />
                                            <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                                {uploadingIndex === i ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                                {uploadingIndex === i ? "Uploading…" : "Upload"}
                                            </button>
                                        </div>
                                        {it.src && (it.type === "image" || !it.type) && (
                                            <img src={it.src} alt="" className="w-20 h-20 object-cover rounded-lg border border-black/10" />
                                        )}
                                        <input className={INPUT} placeholder="Video URL (optional, for popup when card is image)" value={it.videoSrc || ""} onChange={(e) => updateItem(i, "videoSrc", e.target.value)} />
                                        <input className={INPUT} placeholder="Title" value={it.title} onChange={(e) => updateItem(i, "title", e.target.value)} />
                                        <input className={INPUT} placeholder="User / handle" value={it.user} onChange={(e) => updateItem(i, "user", e.target.value)} />
                                        <input className={INPUT} type="number" min={0} max={5} step={0.5} placeholder="Star rating shown on this story card (0–5, optional)" value={it.rating} onChange={(e) => updateItem(i, "rating", e.target.value)} />
                                    </div>
                                ) : (
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl border border-black/10 bg-[#f5f5f7] overflow-hidden shrink-0 flex items-center justify-center">
                                            {it.src && (it.type === "image" || !it.type) ? (
                                                <img src={it.src} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[#6e6e73] text-xs">{(it.type || "image").slice(0, 1)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[#1d1d1f] truncate">{it.title || "Untitled"}</p>
                                            <p className="text-sm text-[#6e6e73] truncate">{it.user ? `@${it.user.replace(/^@/, "")}` : "—"}</p>
                                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-[#f5f5f7] text-[#6e6e73]">{it.type || "image"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button type="button" onClick={() => setEditingIndex(i)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                                                <Pencil size={16} />
                                            </button>
                                            <button type="button" onClick={() => removeItem(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {items.length === 0 && (
                        <p className="text-sm text-[#6e6e73] py-4">No items yet. Click Add to create one, then Save to store it.</p>
                    )}

                    <div className="flex gap-3 pt-2 border-t border-black/10">
                        {isDirty && (
                            <button type="button" onClick={handleCancel} className="py-2.5 px-4 rounded-xl border border-black/10 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
                                Cancel
                            </button>
                        )}
                        <button type="button" onClick={handleSave} disabled={saving || !isDirty} className="py-2.5 px-6 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
