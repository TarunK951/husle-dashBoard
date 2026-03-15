import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getEssentials, updateEssentials, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function EssentialsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [sectionLabel, setSectionLabel] = useState("");
    const [sectionTitle, setSectionTitle] = useState("");
    const [sectionDescription, setSectionDescription] = useState("");
    const [categories, setCategories] = useState([]);
    const [savedSection, setSavedSection] = useState(null);
    const [savedCategories, setSavedCategories] = useState([]);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getEssentials();
            const label = d.sectionLabel ?? "";
            const title = d.sectionTitle ?? "";
            const desc = d.sectionDescription ?? "";
            const cats = d.categories || [];
            setSectionLabel(label);
            setSectionTitle(title);
            setSectionDescription(desc);
            setCategories(cats);
            setSavedSection({ sectionLabel: label, sectionTitle: title, sectionDescription: desc });
            setSavedCategories(cats);
        } catch (e) { setError(e?.message || "Failed to load essentials"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const isDirty = savedSection === null ? false : sectionLabel !== savedSection.sectionLabel || sectionTitle !== savedSection.sectionTitle || sectionDescription !== savedSection.sectionDescription || JSON.stringify(categories) !== JSON.stringify(savedCategories);

    const addCategory = () => setCategories((c) => [...c, { id: "", title: "", src: "", isCustom: false }]);
    const removeCategory = (i) => setCategories((c) => c.filter((_, j) => j !== i));
    const updateCategory = (i, field, value) => setCategories((c) => c.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

    const triggerUpload = (i) => { setUploadingIndex(i); fileInputRef.current?.click(); };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        const idx = uploadingIndex;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            updateCategory(idx, "src", data.url || data.secure_url || data.fileUrl || "");
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setUploadingIndex(null); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateEssentials({
                sectionLabel: sectionLabel || undefined,
                sectionTitle: sectionTitle || undefined,
                sectionDescription: sectionDescription || undefined,
                categories: categories.map((x) => ({ id: x.id, title: x.title, src: x.src, isCustom: !!x.isCustom })),
            });
            setSavedSection({ sectionLabel: sectionLabel, sectionTitle: sectionTitle, sectionDescription: sectionDescription });
            setSavedCategories(categories);
            alert("The Essentials saved.");
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>The Essentials — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>The Essentials — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Category gallery section: section copy and category cards.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section label</label><input className={INPUT} value={sectionLabel} onChange={(e) => setSectionLabel(e.target.value)} placeholder="Ecosystem" /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section title</label><input className={INPUT} value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="The Essentials" /></div>
                            <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section description</label><textarea className={INPUT} rows={2} value={sectionDescription} onChange={(e) => setSectionDescription(e.target.value)} placeholder="A curated selection..." /></div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[#1d1d1f]">Categories</label>
                                <button type="button" onClick={addCategory} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline"><Plus size={16} /> Add</button>
                            </div>
                            {categories.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    <p className="text-xs font-medium text-[#6e6e73]">Saved categories (list)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded-xl border border-black/5 bg-[#f5f5f7]/50">
                                                {cat.src ? <img src={cat.src} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0" /> : null}
                                                <span className="text-sm font-medium text-[#1d1d1f] truncate max-w-[120px]">{cat.title || "Untitled"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <div className="space-y-3">
                                {categories.map((cat, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-black/10 bg-white flex flex-wrap items-center gap-3">
                                        <input className={`${INPUT} flex-1 min-w-[120px]`} placeholder="Title" value={cat.title} onChange={(e) => updateCategory(i, "title", e.target.value)} />
                                        {cat.src ? <img src={cat.src} alt="" className="w-12 h-12 object-cover rounded-lg border border-black/10 shrink-0" /> : null}
                                        <input className={`${INPUT} flex-1 min-w-[160px]`} placeholder="Image URL or upload" value={cat.src} onChange={(e) => updateCategory(i, "src", e.target.value)} />
                                        <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                            {uploadingIndex === i ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                            {uploadingIndex === i ? "Uploading..." : "Upload"}
                                        </button>
                                        <label className="flex items-center gap-2 text-sm text-[#6e6e73] shrink-0">
                                            <input type="checkbox" checked={!!cat.isCustom} onChange={(e) => updateCategory(i, "isCustom", e.target.checked)} />
                                            Exclusive badge
                                        </label>
                                        <button type="button" onClick={() => removeCategory(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="button" onClick={handleSave} disabled={saving || !isDirty} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
