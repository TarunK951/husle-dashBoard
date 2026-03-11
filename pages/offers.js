import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getOffers, createOffer, deleteOffer } from "@/lib/api";
import { Plus, Trash2, X, Ticket, Percent, DollarSign } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const emptyForm = {
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderValue: "",
    expiryDate: "",
    isActive: true,
    usageLimit: "",
};

export default function OffersPage() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetch = () => {
        setLoading(true);
        getOffers().then((d) => setOffers(d.data || d || [])).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createOffer({
                code: form.code.toUpperCase(),
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
                expiryDate: form.expiryDate,
                isActive: form.isActive,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
            });
            setShow(false);
            setForm(emptyForm);
            fetch();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this offer?")) return;
        await deleteOffer(id);
        fetch();
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

    return (
        <>
            <Head><title>Offers & Coupons — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-[#6e6e73]">{offers.length} active offers</p>
                        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors">
                            <Plus size={16} /> Create Offer
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-16 text-center text-[#6e6e73] text-sm border border-black/5">No offers yet. Create your first coupon!</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {offers.map((o) => (
                                <div key={o.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                            <Ticket size={20} className="text-amber-600" />
                                        </div>
                                        <button onClick={() => handleDelete(o.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p className="font-black text-xl text-[#1d1d1f] tracking-wider font-mono">{o.code}</p>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            {o.discountType === "percentage" ? <Percent size={14} className="text-[#6e6e73]" /> : <span className="text-[#6e6e73] text-xs font-bold">₹</span>}
                                            <span className="font-semibold text-[#1d1d1f]">
                                                {o.discountValue}{o.discountType === "percentage" ? "% off" : " off"}
                                            </span>
                                        </div>
                                        {o.minOrderValue && (
                                            <p className="text-xs text-[#6e6e73]">Min order: ₹{o.minOrderValue}</p>
                                        )}
                                        <p className="text-xs text-[#6e6e73]">Expires: {formatDate(o.expiryDate)}</p>
                                        {o.usageLimit && <p className="text-xs text-[#6e6e73]">Limit: {o.usageCount || 0}/{o.usageLimit} uses</p>}
                                    </div>
                                    <div className="mt-3">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${o.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                            {o.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white rounded-t-2xl">
                                <h2 className="font-bold text-[#1d1d1f]">Create Offer</h2>
                                <button onClick={() => setShow(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Coupon Code *</label>
                                    <input className={INPUT + " uppercase font-mono"} required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE20" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Discount Type *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["percentage", "fixed"].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setForm({ ...form, discountType: t })}
                                                className={`py-2.5 rounded-xl text-sm font-medium capitalize flex items-center justify-center gap-2 transition-all ${form.discountType === t ? "bg-[#1d1d1f] text-white" : "border border-black/10 text-[#6e6e73] hover:border-black/30"
                                                    }`}
                                            >
                                                {t === "percentage" ? <Percent size={15} /> : <span>₹</span>}
                                                {t === "percentage" ? "Percentage" : "Fixed Amount"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                                            Discount {form.discountType === "percentage" ? "(%)" : "(₹)"} *
                                        </label>
                                        <input className={INPUT} type="number" min="0" required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === "percentage" ? "20" : "100"} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Min Order (₹)</label>
                                        <input className={INPUT} type="number" min="0" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} placeholder="500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Expiry Date *</label>
                                        <input className={INPUT} type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Usage Limit</label>
                                        <input className={INPUT} type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? "bg-[#1d1d1f]" : "bg-[#c7c7cc]"}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-1"}`} />
                                    </button>
                                    <span className="text-sm font-medium text-[#1d1d1f]">Active immediately</span>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-black transition-colors">
                                        {saving ? "Creating..." : "Create Offer"}
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
