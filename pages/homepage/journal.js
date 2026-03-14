import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, uploadImage } from "@/lib/api";
import { Plus, Trash2, Pencil, X, Upload } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const emptyPost = { title: "", excerpt: "", date: "", author: "", category: "", image: "", slug: "" };

export default function JournalPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [posts, setPosts] = useState([]);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(emptyPost);
    const [editId, setEditId] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const imageFileRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getBlogPosts();
            setPosts(Array.isArray(d) ? d : (d.data || d.posts || []));
        } catch (e) { setError(e?.message || "Failed to load journal"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setForm(emptyPost); setEditId(null); setModal("edit"); };
    const openEdit = (p) => { setForm({ title: p.title ?? "", excerpt: p.excerpt ?? "", date: p.date ?? "", author: p.author ?? "", category: p.category ?? "", image: p.image ?? "", slug: p.slug ?? "" }); setEditId(p.id); setModal("edit"); };
    const closeModal = () => { setModal(null); setEditId(null); setForm(emptyPost); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) await updateBlogPost(editId, form);
            else await createBlogPost(form);
            closeModal();
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this post?")) return;
        try {
            await deleteBlogPost(id);
            fetchData();
        } catch (e) { alert(e.message); }
    };

    const triggerImageUpload = () => imageFileRef.current?.click();
    const handleImageFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setImageUploading(true);
        try {
            const data = await uploadImage(file);
            setForm((f) => ({ ...f, image: data.url || data.secure_url || data.fileUrl || "" }));
        } catch (err) { alert(err.message || "Upload failed"); }
        finally { setImageUploading(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>Journal — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Journal — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-[#6e6e73]">Blog posts for homepage preview and /blog page.</p>
                        <button onClick={openCreate} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors">
                            <Plus size={16} /> Add post
                        </button>
                    </div>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                        <>
                            {posts.length === 0 ? (
                                <div className="bg-white rounded-2xl p-16 text-center text-[#6e6e73] text-sm border border-black/5">No posts yet. Add your first one!</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {posts.map((p) => (
                                        <div key={p.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden flex">
                                            {p.image && <img src={p.image} alt="" className="w-24 h-24 object-cover shrink-0" />}
                                            <div className="p-4 flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <p className="font-medium text-[#1d1d1f] text-sm truncate">{p.title || "—"}</p>
                                                    <p className="text-xs text-[#6e6e73] mt-0.5">{p.category} · {p.date}</p>
                                                    <p className="text-xs text-[#6e6e73] mt-1 line-clamp-2">{p.excerpt}</p>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-[#f5f5f7] text-[#1d1d1f]"><Pencil size={14} /></button>
                                                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {modal === "edit" && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white">
                                <h2 className="font-bold text-[#1d1d1f]">{editId ? "Edit post" : "Add post"}</h2>
                                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Title *</label><input className={INPUT} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post headline" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Excerpt</label><textarea className={INPUT} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Date</label><input className={INPUT} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="Feb 22, 2026" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Author</label><input className={INPUT} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" /></div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Category</label><input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Engineering, Design, Tech" /></div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Cover image</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                                        {form.image ? <img src={form.image} alt="" className="w-14 h-14 object-cover rounded-lg border border-black/10 shrink-0" /> : null}
                                        <input className={INPUT} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="URL or upload" />
                                        <button type="button" onClick={triggerImageUpload} disabled={imageUploading} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                                            {imageUploading ? <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                            {imageUploading ? "Uploading..." : "Upload"}
                                        </button>
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-[#1d1d1f] mb-1">Slug (URL-friendly)</label><input className={INPUT} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="art-of-titanium" /></div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7]">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-black">{saving ? "Saving..." : "Save"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
