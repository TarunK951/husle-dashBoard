import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getFaqs, createFaq, deleteFaq } from "@/lib/api";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

function FaqItem({ faq, onDelete }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f5f5f7]/50 transition-colors text-left"
            >
                <span className="font-medium text-[#1d1d1f] text-sm pr-4">{faq.question}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {faq.category && (
                        <span className="text-xs px-2 py-1 bg-[#f5f5f7] rounded-lg text-[#6e6e73] font-medium capitalize">{faq.category}</span>
                    )}
                    {open ? <ChevronUp size={16} className="text-[#6e6e73]" /> : <ChevronDown size={16} className="text-[#6e6e73]" />}
                </div>
            </button>
            {open && (
                <div className="px-5 pb-4 border-t border-black/5">
                    <p className="text-sm text-[#6e6e73] mt-3 leading-relaxed">{faq.answer}</p>
                    <button
                        onClick={() => onDelete(faq.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                        <Trash2 size={13} /> Delete FAQ
                    </button>
                </div>
            )}
        </div>
    );
}

export default function FaqsPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({ question: "", answer: "", category: "general" });
    const [saving, setSaving] = useState(false);

    const fetch = () => {
        setLoading(true);
        getFaqs().then((d) => setFaqs(d.data || d || [])).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createFaq(form);
            setShow(false);
            setForm({ question: "", answer: "", category: "general" });
            fetch();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this FAQ?")) return;
        await deleteFaq(id);
        fetch();
    };

    return (
        <>
            <Head><title>FAQs — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-4 fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-[#6e6e73]">{faqs.length} frequently asked questions</p>
                        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors">
                            <Plus size={16} /> Add FAQ
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="bg-white rounded-2xl p-16 text-center text-[#6e6e73] text-sm border border-black/5">No FAQs yet. Add your first one!</div>
                    ) : (
                        <div className="space-y-2">
                            {faqs.map((f) => <FaqItem key={f.id} faq={f} onDelete={handleDelete} />)}
                        </div>
                    )}
                </div>

                {show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg fade-in">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                                <h2 className="font-bold text-[#1d1d1f]">Add FAQ</h2>
                                <button onClick={() => setShow(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Question *</label>
                                    <input className={INPUT} required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="How do I track my order?" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Answer *</label>
                                    <textarea className={INPUT} rows={4} required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="You can track your order by..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Category</label>
                                    <select className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        <option value="general">General</option>
                                        <option value="shipping">Shipping</option>
                                        <option value="returns">Returns</option>
                                        <option value="products">Products</option>
                                        <option value="payments">Payments</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-black transition-colors">
                                        {saving ? "Adding..." : "Add FAQ"}
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
