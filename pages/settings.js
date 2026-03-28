import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import { getStoreSettings, updateStoreSettings } from "@/lib/api";
import { Settings, Truck, Store, Package, CheckCircle2, AlertCircle, Save } from "lucide-react";

function Card({ title, icon: Icon, children }) {
    return (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 flex items-center gap-2">
                {Icon && <Icon size={16} className="text-[#6e6e73]" />}
                <h2 className="font-semibold text-[#1d1d1f] text-sm">{title}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">{children}</div>
        </div>
    );
}

function Field({ label, hint, value, onChange, type = "text", prefix }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{label}</label>
            <div className="flex items-center gap-0">
                {prefix && (
                    <span className="h-10 px-3 flex items-center text-sm font-medium text-[#6e6e73] bg-[#f5f5f7] border border-r-0 border-black/10 rounded-l-xl">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-10 px-3 text-sm font-medium text-[#1d1d1f] border border-black/10 bg-white outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f] transition-colors w-full ${prefix ? "rounded-r-xl" : "rounded-xl"}`}
                />
            </div>
            {hint && <p className="mt-1 text-xs text-[#86868b]">{hint}</p>}
        </div>
    );
}

const GROUPS = [
    {
        key: "charges",
        title: "Shipping Charges",
        icon: Truck,
        description: "Charges shown to customers at checkout based on payment method.",
        fields: [
            { key: "prepaid_shipping_charge", label: "Online / Prepaid Shipping (₹)", hint: "Charge added when customer pays online. Set 0 for free.", prefix: "₹", type: "number" },
            { key: "cod_shipping_charge", label: "Cash on Delivery (COD) Charge (₹)", hint: "Extra charge for COD orders (handling fee).", prefix: "₹", type: "number" },
            { key: "free_shipping_above", label: "Free Shipping Above (₹)", hint: "Order value above which all shipping is free. Set 0 to disable.", prefix: "₹", type: "number" },
        ],
    },
    {
        key: "brand",
        title: "Store Info",
        icon: Store,
        fields: [
            { key: "store_name",  label: "Store Name" },
            { key: "store_email", label: "Store Email" },
            { key: "store_phone", label: "Store Phone" },
        ],
    },
    {
        key: "delhivery",
        title: "Seller / Return Details",
        icon: Package,
        fields: [
            { key: "seller_name",    label: "Seller Name" },
            { key: "seller_address", label: "Seller Address" },
            { key: "seller_city",    label: "Seller City" },
            { key: "seller_state",   label: "Seller State" },
            { key: "seller_pincode", label: "Seller Pincode" },
            { key: "seller_phone",   label: "Seller Phone" },
            { key: "seller_email",   label: "Seller Email" },
        ],
    },
    {
        key: "shipping",
        title: "Package Dimensions",
        icon: Package,
        fields: [
            { key: "default_package_length",  label: "Length (cm)",  hint: "Default box length", type: "number" },
            { key: "default_package_breadth", label: "Breadth (cm)", hint: "Default box breadth", type: "number" },
            { key: "default_package_height",  label: "Height (cm)",  hint: "Default box height",  type: "number" },
            { key: "default_package_weight",  label: "Weight (kg)",  hint: "Default package weight in kg", type: "number" },
        ],
    },
];

export default function SettingsPage() {
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: "success"|"error", msg }

    useEffect(() => {
        setLoading(true);
        getStoreSettings()
            .then((data) => {
                const map = {};
                (data.settings || []).forEach((s) => { map[s.key] = s.value ?? ""; });
                setValues(map);
            })
            .catch((e) => showToast("error", e?.message || "Failed to load settings"))
            .finally(() => setLoading(false));
    }, []);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateStoreSettings(values);
            showToast("success", "Settings saved successfully.");
        } catch (e) {
            showToast("error", e?.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const set = (key) => (val) => setValues((prev) => ({ ...prev, [key]: val }));

    return (
        <>
            <Head><title>Settings — Husle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1d1d1f] flex items-center justify-center">
                                <Settings size={16} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-[#1d1d1f]">Store Settings</h1>
                                <p className="text-xs text-[#6e6e73] mt-0.5">Manage shipping charges, store info and package defaults</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold hover:bg-black disabled:opacity-40 transition-all"
                        >
                            {saving ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : (
                                <Save size={14} />
                            )}
                            {saving ? "Saving…" : "Save all"}
                        </button>
                    </div>

                    {/* Toast */}
                    {toast && (
                        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-medium ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {toast.msg}
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-5">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {GROUPS.map((group) => (
                                <Card key={group.key} title={group.title} icon={group.icon}>
                                    {group.description && (
                                        <p className="text-xs text-[#86868b] -mt-1 mb-3 leading-relaxed">{group.description}</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {group.fields.map((f) => (
                                            <Field
                                                key={f.key}
                                                label={f.label}
                                                hint={f.hint}
                                                prefix={f.prefix}
                                                type={f.type || "text"}
                                                value={values[f.key] ?? ""}
                                                onChange={set(f.key)}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
