import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getHero, updateHero, uploadImage } from "@/lib/api";
import { Plus, Trash2, X, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function HeroPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [colors, setColors] = useState([]);
    const [ctaHeadline, setCtaHeadline] = useState("");
    const [ctaSubtitle, setCtaSubtitle] = useState("");
    const [ctaButtonText, setCtaButtonText] = useState("");
    const [ctaButtonLink, setCtaButtonLink] = useState("");
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getHero();
            const raw = (d.colors || []).slice(0, 3);
            setColors(raw.map((x) => ({ ...x, name: x.name ?? "", tooltip: x.tooltip ?? "" })));
            const cta = d.cta && typeof d.cta === "object" ? d.cta : {};
            setCtaHeadline(cta.headline ?? d.ctaHeadline ?? "");
            setCtaSubtitle(cta.subtitle ?? d.ctaSubtitle ?? "");
            setCtaButtonText(cta.buttonText ?? d.ctaButtonText ?? "");
            setCtaButtonLink(cta.buttonLink ?? d.ctaButtonLink ?? "");
        } catch (e) {
            setError(e?.message || "Failed to load hero");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const addColor = () => setColors((c) => (c.length >= 3 ? c : [...c, { id: "", name: "", img: "", hex: "#000000", tooltip: "" }]));
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
                colors: colors.slice(0, 3).map((x) => ({ id: x.id || undefined, name: x.name, img: x.img, hex: x.hex, tooltip: x.tooltip || undefined })),
                cta: {
                    headline: ctaHeadline || undefined,
                    subtitle: ctaSubtitle || undefined,
                    buttonText: ctaButtonText || undefined,
                    buttonLink: ctaButtonLink || undefined,
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
                    <p className="text-sm text-[#6e6e73]">Top of homepage: up to 3 color variants. Each variant has an image and a text/dot color.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[#1d1d1f]">Color variants (max 3)</label>
                                <button type="button" onClick={addColor} disabled={colors.length >= 3} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline disabled:opacity-50 disabled:pointer-events-none">
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
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-[#6e6e73]">Variant {i + 1}</span>
                                            <button type="button" onClick={() => removeColor(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={16} /></button>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#6e6e73] mb-1">Name</label>
                                            <input className={INPUT} placeholder="e.g. Midnight Black, Ocean Blue" value={c.name ?? ""} onChange={(e) => updateColor(i, "name", e.target.value)} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {c.img ? (
                                                <div className="relative shrink-0">
                                                    <img src={c.img} alt="" className="w-16 h-16 object-cover rounded-xl border border-black/10" />
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
                                            <label className="text-sm text-[#6e6e73] shrink-0">Text color:</label>
                                            <input type="color" className="w-10 h-10 rounded border border-black/10 cursor-pointer shrink-0" value={c.hex || "#000000"} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                            <input className={INPUT} placeholder="#2C2C2C" value={c.hex} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">CTA panel (scroll-reveal)</h3>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">CTA headline</label>
                                <input className={INPUT} placeholder="Pro Level Protection." value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">CTA subtitle</label>
                                <input className={INPUT} placeholder="Aerospace grade materials engineered for the modern husle." value={ctaSubtitle} onChange={(e) => setCtaSubtitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#6e6e73] mb-1">Button text</label>
                                    <input className={INPUT} placeholder="Buy Now" value={ctaButtonText} onChange={(e) => setCtaButtonText(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#6e6e73] mb-1">Button link</label>
                                    <input className={INPUT} placeholder="/products" value={ctaButtonLink} onChange={(e) => setCtaButtonLink(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save Hero"}
                        </button>
                    </form>
                    )}
                </div>
            </Layout>
        </>
    );
}
