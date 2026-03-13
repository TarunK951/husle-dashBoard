import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getSupportPage, updateSupportPage } from "@/lib/api";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function SupportPageEditor() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        heading: "",
        supportEmail: "",
        supportPhone: "",
        officeAddress: "",
        businessHours: "",
        contactFormEnabled: true,
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getSupportPage();
            setForm({
                heading: d.heading ?? "",
                supportEmail: d.supportEmail ?? "",
                supportPhone: d.supportPhone ?? "",
                officeAddress: d.officeAddress ?? "",
                businessHours: d.businessHours ?? "",
                contactFormEnabled: d.contactFormEnabled !== false,
            });
        } catch (e) {
            setError(e?.message || "Failed to load support page");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateSupportPage({
                heading: form.heading || undefined,
                supportEmail: form.supportEmail || undefined,
                supportPhone: form.supportPhone || undefined,
                officeAddress: form.officeAddress || undefined,
                businessHours: form.businessHours || undefined,
                contactFormEnabled: form.contactFormEnabled,
            });
            alert("Support page saved.");
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
                <Head><title>Support — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Support — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Support/contact page: email, phone, address, hours, and optional contact form.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Heading (optional)</label>
                                <input className={INPUT} value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} placeholder="Contact Us" />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Support email</label>
                                <input type="email" className={INPUT} value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} placeholder="support@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Support phone (optional)</label>
                                <input className={INPUT} value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} placeholder="+91 98765 43210" />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Office address (optional)</label>
                                <textarea className={INPUT} rows={2} value={form.officeAddress} onChange={(e) => setForm({ ...form, officeAddress: e.target.value })} placeholder="123 Street, City, State" />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">Business hours (optional)</label>
                                <input className={INPUT} value={form.businessHours} onChange={(e) => setForm({ ...form, businessHours: e.target.value })} placeholder="Mon–Fri 9AM–6PM" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="contactForm" checked={form.contactFormEnabled} onChange={(e) => setForm({ ...form, contactFormEnabled: e.target.checked })} className="rounded border-black/20" />
                                <label htmlFor="contactForm" className="text-sm text-[#1d1d1f]">Show contact form</label>
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save Support page"}
                        </button>
                    </form>
                    )}
                </div>
            </Layout>
        </>
    );
}
