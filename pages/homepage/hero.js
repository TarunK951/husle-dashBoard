import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getHero, updateHero, uploadImage } from "@/lib/api";
import { Plus, Trash2, X, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function HeroPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [colors, setColors] = useState([]);
    const [sideText, setSideText] = useState(["", "", ""]);
    const [imageWidth, setImageWidth] = useState({ mobile: "", desktop: "" });
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getHero();
            setColors(d.colors || []);
            if (Array.isArray(d.sideText)) setSideText([d.sideText[0] ?? "", d.sideText[1] ?? "", d.sideText[2] ?? ""]);
            if (d.config?.imageWidth) setImageWidth({
                mobile: d.config.imageWidth.mobile ?? "",
                desktop: d.config.imageWidth.desktop ?? "",
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const addColor = () => setColors((c) => [...c, { id: "", name: "", img: "", hex: "#000000" }]);
    const removeColor = (i) => setColors((c) => c.filter((_, j) => j !== i));
    const updateColor = (i, field, value) => setColors((c) => c.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

    const triggerUpload = (index) => {
        setUploadingIndex(index);
        fileInputRef.current?.click();
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        const idx = uploadingIndex;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            updateColor(idx, "img", data.url || data.secure_url || data.fileUrl || "");
        } catch (err) {
            alert(err.message || "Upload failed");
        } finally {
            setUploadingIndex(null);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateHero({
                colors: colors.map((x) => ({ id: x.id || undefined, name: x.name, img: x.img, hex: x.hex })),
                sideText: sideText.filter(Boolean),
                config: {
                    imageWidth: (imageWidth.mobile || imageWidth.desktop)
                        ? { mobile: imageWidth.mobile || undefined, desktop: imageWidth.desktop || undefined }
                        : undefined,
                },
            });
            alert("Hero saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>Hero — Hustle Admin</title></Head>
                <Layout>
                    <div className="space-y-4"><div className="skeleton h-64 rounded-2xl" /></div>
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Hero — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Top of homepage: product color variants and background text.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[#1d1d1f]">Color variants</label>
                                <button type="button" onClick={addColor} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline">
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="space-y-3">
                                {colors.map((c, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-black/10 bg-white space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input className={`${INPUT} flex-1 min-w-[120px]`} placeholder="Name (e.g. Midnight)" value={c.name} onChange={(e) => updateColor(i, "name", e.target.value)} />
                                            <button type="button" onClick={() => removeColor(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {c.img ? (
                                                <div className="relative shrink-0">
                                                    <img src={c.img} alt={c.name || "Variant"} className="w-16 h-16 object-cover rounded-xl border border-black/10" />
                                                    <button type="button" onClick={() => updateColor(i, "img", "")} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><X size={12} /></button>
                                                </div>
                                            ) : null}
                                            <input className={`${INPUT} flex-1 min-w-[160px]`} placeholder="Image URL or upload below" value={c.img} onChange={(e) => updateColor(i, "img", e.target.value)} />
                                            <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium text-[#1d1d1f] hover:bg-black/5 disabled:opacity-50 shrink-0">
                                                {uploadingIndex === i ? (
                                                    <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> Uploading...</span>
                                                ) : (
                                                    <><Upload size={16} /> Upload</>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-10 h-10 rounded border border-black/10 cursor-pointer shrink-0" value={c.hex || "#000000"} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                            <input className={INPUT} placeholder="#2C2C2C" value={c.hex} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Background text lines (2–3 words each)</label>
                            <div className="space-y-2">
                                {[0, 1, 2].map((i) => (
                                    <input key={i} className={INPUT} placeholder={`Line ${i + 1} (e.g. HUSLE, LIFESTYLE)`} value={sideText[i] ?? ""} onChange={(e) => setSideText((s) => { const n = [...s]; n[i] = e.target.value; return n; })} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Image width mobile (optional)</label>
                                <input className={INPUT} placeholder="370px" value={imageWidth.mobile} onChange={(e) => setImageWidth((w) => ({ ...w, mobile: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Image width desktop (optional)</label>
                                <input className={INPUT} placeholder="640px" value={imageWidth.desktop} onChange={(e) => setImageWidth((w) => ({ ...w, desktop: e.target.value }))} />
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save Hero"}
                        </button>
                    </form>
                </div>
            </Layout>
        </>
    );
}
