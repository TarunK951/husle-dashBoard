import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getHomepageContent, updateHomepageContent } from "@/lib/api";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function SectionTitlesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        featuredTitle: "",
        featuredLabel: "",
        designInspirationLabel: "",
        designInspirationTitle: "",
        designInspirationDescription: "",
        designInspirationCtaText: "",
        testimonialsLabel: "",
        testimonialsTitle: "",
        journalLabel: "",
        journalTitle: "",
        faqLabel: "",
        faqTitle: "",
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = await getHomepageContent();
            const di = d.designInspiration || {};
            setForm({
                featuredTitle: d.featuredTitle ?? "",
                featuredLabel: d.featuredLabel ?? "",
                designInspirationLabel: di.label ?? "",
                designInspirationTitle: di.title ?? "",
                designInspirationDescription: di.description ?? "",
                designInspirationCtaText: di.ctaText ?? "",
                testimonialsLabel: d.testimonialsLabel ?? "",
                testimonialsTitle: d.testimonialsTitle ?? "",
                journalLabel: d.journalLabel ?? "",
                journalTitle: d.journalTitle ?? "",
                faqLabel: d.faqLabel ?? "",
                faqTitle: d.faqTitle ?? "",
            });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateHomepageContent({
                featuredTitle: form.featuredTitle || undefined,
                featuredLabel: form.featuredLabel || undefined,
                designInspiration: {
                    label: form.designInspirationLabel || undefined,
                    title: form.designInspirationTitle || undefined,
                    description: form.designInspirationDescription || undefined,
                    ctaText: form.designInspirationCtaText || undefined,
                },
                testimonialsLabel: form.testimonialsLabel || undefined,
                testimonialsTitle: form.testimonialsTitle || undefined,
                journalLabel: form.journalLabel || undefined,
                journalTitle: form.journalTitle || undefined,
                faqLabel: form.faqLabel || undefined,
                faqTitle: form.faqTitle || undefined,
            });
            alert("Section titles saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    if (loading) {
        return (
            <>
                <Head><title>Section titles — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Section titles — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">Labels and titles above homepage sections.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Featured</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Label</label><input className={INPUT} value={form.featuredLabel} onChange={(e) => update("featuredLabel", e.target.value)} placeholder="Selected Range" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Title</label><input className={INPUT} value={form.featuredTitle} onChange={(e) => update("featuredTitle", e.target.value)} placeholder="Featured Collections" /></div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Design Inspiration</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Label</label><input className={INPUT} value={form.designInspirationLabel} onChange={(e) => update("designInspirationLabel", e.target.value)} placeholder="Showcase" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Title</label><input className={INPUT} value={form.designInspirationTitle} onChange={(e) => update("designInspirationTitle", e.target.value)} placeholder="Design Inspiration" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Description</label><textarea className={INPUT} rows={2} value={form.designInspirationDescription} onChange={(e) => update("designInspirationDescription", e.target.value)} placeholder="Short paragraph" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">CTA text</label><input className={INPUT} value={form.designInspirationCtaText} onChange={(e) => update("designInspirationCtaText", e.target.value)} placeholder="Explore Gallery" /></div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Testimonials</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Label</label><input className={INPUT} value={form.testimonialsLabel} onChange={(e) => update("testimonialsLabel", e.target.value)} placeholder="Testimonials" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Title</label><input className={INPUT} value={form.testimonialsTitle} onChange={(e) => update("testimonialsTitle", e.target.value)} placeholder="What People Say" /></div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">Journal</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Label</label><input className={INPUT} value={form.journalLabel} onChange={(e) => update("journalLabel", e.target.value)} placeholder="Manifesto" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Title</label><input className={INPUT} value={form.journalTitle} onChange={(e) => update("journalTitle", e.target.value)} placeholder="The Journal" /></div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">FAQ</h3>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Label</label><input className={INPUT} value={form.faqLabel} onChange={(e) => update("faqLabel", e.target.value)} placeholder="Support" /></div>
                            <div><label className="block text-sm text-[#6e6e73] mb-1">Title</label><input className={INPUT} value={form.faqTitle} onChange={(e) => update("faqTitle", e.target.value)} placeholder="Common Questions" /></div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save section titles"}
                        </button>
                    </form>
                </div>
            </Layout>
        </>
    );
}
