import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getAboutPage, updateAboutPage, uploadImage } from "@/lib/api";
import { Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function AboutPageEditor() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        eyebrow: "",
        headline: "",
        image: "",
        contentHeading: "",
        paragraphs: ["", "", ""],
        contentImage: "",
    });
    const [uploadingField, setUploadingField] = useState(null);
    const heroImageRef = useRef(null);
    const contentImageRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getAboutPage();
            setForm({
                eyebrow: d.eyebrow ?? "",
                headline: d.headline ?? "",
                image: d.image ?? "",
                contentHeading: d.contentHeading ?? "",
                paragraphs: Array.isArray(d.paragraphs) ? [...d.paragraphs, "", ""].slice(0, 3) : ["", "", ""],
                contentImage: d.contentImage ?? "",
            });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const setParagraph = (i, value) => setForm((f) => {
        const p = [...(f.paragraphs || [])];
        p[i] = value;
        return { ...f, paragraphs: p };
    });

    const triggerHeroUpload = () => { setUploadingField("hero"); heroImageRef.current?.click(); };
    const triggerContentImageUpload = () => { setUploadingField("content"); contentImageRef.current?.click(); };
    const handleHeroFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            setForm((f) => ({ ...f, image: data.url || data.secure_url || data.fileUrl || "" }));
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setUploadingField(null); }
    };
    const handleContentImageFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        try {
            const data = await uploadImage(file);
            setForm((f) => ({ ...f, contentImage: data.url || data.secure_url || data.fileUrl || "" }));
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setUploadingField(null); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateAboutPage({
                eyebrow: form.eyebrow || undefined,
                headline: form.headline || undefined,
                image: form.image || undefined,
                contentHeading: form.contentHeading || undefined,
                paragraphs: (form.paragraphs || []).filter(Boolean),
                contentImage: form.contentImage || undefined,
            });
            alert("About page saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>About — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>About — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">About page: hero (eyebrow, headline, image) and content block.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Hero</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Eyebrow</label><input className={INPUT} value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="Our Origins" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Headline</label><input className={INPUT} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Engineered for the Unstoppable." /></div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Hero image</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input ref={heroImageRef} type="file" accept="image/*" className="hidden" onChange={handleHeroFile} />
                                    {form.image ? <img src={form.image} alt="" className="w-14 h-14 object-cover rounded-lg border border-black/10 shrink-0" /> : null}
                                    <input className={INPUT} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="URL or upload" />
                                    <button type="button" onClick={triggerHeroUpload} disabled={uploadingField !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                        {uploadingField === "hero" ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                        {uploadingField === "hero" ? "Uploading..." : "Upload"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Content</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Content heading</label><input className={INPUT} value={form.contentHeading} onChange={(e) => setForm({ ...form, contentHeading: e.target.value })} placeholder="The Husle Mindset" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Paragraphs (1–3)</label>
                                {(form.paragraphs || []).map((p, i) => (
                                    <textarea key={i} className={`${INPUT} mt-1 mb-2`} rows={3} value={p} onChange={(e) => setParagraph(i, e.target.value)} placeholder={`Paragraph ${i + 1}`} />
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Content image (optional)</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input ref={contentImageRef} type="file" accept="image/*" className="hidden" onChange={handleContentImageFile} />
                                    {form.contentImage ? <img src={form.contentImage} alt="" className="w-14 h-14 object-cover rounded-lg border border-black/10 shrink-0" /> : null}
                                    <input className={INPUT} value={form.contentImage} onChange={(e) => setForm({ ...form, contentImage: e.target.value })} placeholder="URL or upload" />
                                    <button type="button" onClick={triggerContentImageUpload} disabled={uploadingField !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                        {uploadingField === "content" ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                        {uploadingField === "content" ? "Uploading..." : "Upload"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save About page"}
                        </button>
                    </form>
                </div>
            </Layout>
        </>
    );
}
