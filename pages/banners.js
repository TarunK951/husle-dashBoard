import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getBanners, createBanner, deleteBanner, uploadImage } from "@/lib/api";
import { Plus, Trash2, X, Upload, ExternalLink } from "lucide-react";
import Head from "next/head";

const TYPES = ["main", "video", "brand"];
const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function BannersPage() {
    const [activeType, setActiveType] = useState("main");
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({ type: "main", title: "", imageUrl: "", link: "" });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const fetchBanners = () => {
        setLoading(true);
        getBanners(activeType).then((d) => setBanners(d.data || d || [])).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { fetchBanners(); }, [activeType]);

    const handleUpload = async (file) => {
        setUploading(true);
        try {
            const data = await uploadImage(file);
            setForm((f) => ({ ...f, imageUrl: data.url }));
        } catch (e) { alert(e.message); }
        finally { setUploading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.imageUrl) { alert("Please upload an image first"); return; }
        setSaving(true);
        try {
            await createBanner({ ...form, type: activeType });
            setShow(false);
            setForm({ type: activeType, title: "", imageUrl: "", link: "" });
            fetchBanners();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this banner?")) return;
        await deleteBanner(id);
        fetchBanners();
    };

    return (
        <>
            <Head><title>Banners — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2">
                            {TYPES.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setActiveType(t)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${activeType === t
                                            ? "bg-[#1d1d1f] text-white"
                                            : "bg-white border border-black/10 text-[#6e6e73] hover:border-black/30"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { setShow(true); setForm({ type: activeType, title: "", imageUrl: "", link: "" }); }}
                            className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                        >
                            <Plus size={16} /> Add Banner
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="bg-white rounded-2xl p-16 text-center text-[#6e6e73] text-sm border border-black/5">
                            No {activeType} banners yet. Add one!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {banners.map((b) => (
                                <div key={b.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                    <div className="aspect-[16/6] bg-[#f5f5f7] overflow-hidden relative">
                                        <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                    <div className="px-4 py-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="font-medium text-[#1d1d1f] text-sm truncate">{b.title || "—"}</p>
                                            {b.link && (
                                                <a href={b.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                                                    <ExternalLink size={11} />{b.link}
                                                </a>
                                            )}
                                        </div>
                                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0 ml-2">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add {activeType} Banner</h2>
                                <button onClick={() => setShow(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Title <span className="text-[#6e6e73] font-normal">(optional)</span></label>
                                    <input className={INPUT} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summer Sale" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Link <span className="text-[#6e6e73] font-normal">(optional)</span></label>
                                    <input className={INPUT} type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Banner Image *</label>
                                    {form.imageUrl ? (
                                        <div className="relative">
                                            <img src={form.imageUrl} className="w-full h-32 object-cover rounded-xl border border-black/10" />
                                            <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-black/10 rounded-xl p-8 cursor-pointer hover:border-black/30 transition-colors flex flex-col items-center gap-2 bg-[#f5f5f7]">
                                            {uploading ? (
                                                <div className="text-sm text-[#6e6e73] flex items-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                                                    Uploading...
                                                </div>
                                            ) : (
                                                <><Upload size={24} className="text-[#6e6e73]" /><span className="text-sm text-[#6e6e73]">Click to upload banner image</span></>
                                            )}
                                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.imageUrl} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-black transition-colors">
                                        {saving ? "Adding..." : "Add Banner"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
