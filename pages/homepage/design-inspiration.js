import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getDesignInspiration, updateDesignInspiration, uploadImage } from "@/lib/api";
import { Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function DesignInspirationPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [label, setLabel] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [ctaText, setCtaText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getDesignInspiration();
            setLabel(d.label ?? "");
            setTitle(d.title ?? "");
            setDescription(d.description ?? "");
            setCtaText(d.ctaText ?? "");
            setImageUrl(d.imageUrl ?? d.image ?? d.bannerUrl ?? "");
        } catch (e) {
            setError(e?.message || "Failed to load design inspiration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const triggerUpload = () => { fileInputRef.current?.click(); };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setUploading(true);
        try {
            const data = await uploadImage(file);
            setImageUrl(data.url || data.secure_url || data.fileUrl || "");
        } catch (err) {
            alert(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDesignInspiration({
                label: label || undefined,
                title: title || undefined,
                description: description || undefined,
                ctaText: ctaText || undefined,
                imageUrl: imageUrl || undefined,
                image: imageUrl || undefined,
                bannerUrl: imageUrl || undefined,
            });
            alert("Design inspiration saved.");
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
                <Head><title>Design inspiration — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Design inspiration — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Design inspiration section: label, title, description, CTA and optional image.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-3">
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section label</label><input className={INPUT} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Showcase" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Section title</label><input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Design Inspiration" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Description</label><textarea className={INPUT} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short paragraph about design inspiration..." /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">CTA button text</label><input className={INPUT} value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Explore Gallery" /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Image / banner URL</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <input className={`${INPUT} flex-1 min-w-[200px]`} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL or upload" />
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    <button type="button" onClick={triggerUpload} disabled={uploading} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50">
                                        {uploading ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                        {uploading ? "Uploading..." : "Upload"}
                                    </button>
                                </div>
                                {imageUrl ? <img src={imageUrl} alt="" className="mt-2 w-full max-h-48 object-cover rounded-xl border border-black/10" /> : null}
                            </div>
                            <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </form>
                    )}
                </div>
            </Layout>
        </>
    );
}
