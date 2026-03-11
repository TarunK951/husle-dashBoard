import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getCategories, createCategory, deleteCategory, uploadImage } from "@/lib/api";
import { Plus, Trash2, Image as ImageIcon, X, Upload } from "lucide-react";
import Head from "next/head";
import { useRef } from "react";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function CategoriesPage() {
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", image: "", parentId: "" });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const fetch = () => {
        setLoading(true);
        getCategories().then((d) => setCats(d.data || d || [])).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const handleUpload = async (file) => {
        setUploading(true);
        try {
            const data = await uploadImage(file);
            setForm((f) => ({ ...f, image: data.url }));
        } catch (e) { alert(e.message); }
        finally { setUploading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createCategory({ ...form, parentId: form.parentId ? Number(form.parentId) : undefined });
            setShow(false);
            setForm({ name: "", description: "", image: "", parentId: "" });
            fetch();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this category?")) return;
        await deleteCategory(id);
        fetch();
    };

    return (
        <>
            <Head><title>Categories — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-[#6e6e73]">{cats.length} categories</p>
                        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors">
                            <Plus size={16} /> Add Category
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
                        </div>
                    ) : cats.length === 0 ? (
                        <div className="bg-white rounded-2xl p-16 text-center text-[#6e6e73] text-sm border border-black/5">No categories yet</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {cats.map((c) => (
                                <div key={c.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                                    <div className="aspect-video bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
                                        {c.image ? (
                                            <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={28} className="text-[#c7c7cc]" />
                                        )}
                                    </div>
                                    <div className="p-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[#1d1d1f] text-sm truncate">{c.name}</p>
                                            {c.description && <p className="text-xs text-[#6e6e73] truncate">{c.description}</p>}
                                        </div>
                                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0 ml-2">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add Category</h2>
                                <button onClick={() => setShow(false)} className="p-2 rounded-xl hover:bg-black/5 transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Name *</label>
                                    <input className={INPUT} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iPhone Cases" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Description</label>
                                    <input className={INPUT} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Parent Category</label>
                                    <select className={INPUT} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                                        <option value="">None (top-level)</option>
                                        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Image</label>
                                    {form.image ? (
                                        <div className="relative inline-block">
                                            <img src={form.image} className="w-24 h-24 object-cover rounded-xl border border-black/10" />
                                            <button type="button" onClick={() => setForm({ ...form, image: "" })} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-black/10 rounded-xl p-6 cursor-pointer hover:border-black/30 transition-colors flex flex-col items-center gap-2 bg-[#f5f5f7]">
                                            {uploading ? (
                                                <div className="text-sm text-[#6e6e73] flex items-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                                                    Uploading...
                                                </div>
                                            ) : (
                                                <><Upload size={20} className="text-[#6e6e73]" /><span className="text-sm text-[#6e6e73]">Click to upload</span></>
                                            )}
                                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60">
                                        {saving ? "Creating..." : "Create"}
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
