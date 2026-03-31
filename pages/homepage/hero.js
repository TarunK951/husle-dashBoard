import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import { getHero, updateHero, uploadImage, upload3DModel } from "@/lib/api";
import { Plus, Trash2, X, Upload, Box } from "lucide-react";
import Head from "next/head";

const Hero3DRotationEditor = dynamic(() => import("@/components/Hero3DRotationEditor"), { ssr: false });

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

// Predefined text color: liquid glass (clear, soft blue-gray)
const LIQUID_GLASS_HEX = "#E5EAEF";

function isGltfAssetUrl(url) {
    if (!url || typeof url !== "string") return false;
    const pathOnly = url.trim().split(/[?#]/)[0].toLowerCase();
    return /\.(glb|gltf)$/.test(pathOnly);
}

/** First variant image URL that points at a GLB/GLTF — same resolution as storefront hero. */
function firstGlbUrlFromColors(colorList) {
    const raw = Array.isArray(colorList) ? colorList : [];
    for (const c of raw) {
        const u = String(c?.img || "").trim();
        if (u && isGltfAssetUrl(u)) return u;
    }
    return "";
}

const DEFAULT_HERO_3D_CONFIG = {
    use3DModel: false,
    modelUrl: "",
    modelScale: 1,
    modelRotation: { x: 0, y: 90, z: 0 },
    camera: { position: [0, 0.15, 3.6], fov: 42 },
    lights: { ambient: 0.62, directionalMain: 1.05, directionalFill: 0.35 },
};

export default function HeroPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [colors, setColors] = useState([]);
    const [ctaHeadline, setCtaHeadline] = useState("");
    const [ctaSubtitle, setCtaSubtitle] = useState("");
    const [ctaButtonText, setCtaButtonText] = useState("");
    const [ctaButtonLink, setCtaButtonLink] = useState("");
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRef = useRef(null);
    const [heroConfig, setHeroConfig] = useState(() => ({ ...DEFAULT_HERO_3D_CONFIG }));

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getHero();
            const raw = (d.colors || []).slice(0, 3);
            setColors(raw.map((x) => ({ ...x, name: x.name ?? "", tooltip: x.tooltip ?? "" })));
            const cta = d.cta && typeof d.cta === "object" ? d.cta : {};
            setCtaHeadline(cta.headline ?? d.ctaHeadline ?? "");
            setCtaSubtitle(cta.subtitle ?? d.ctaSubtitle ?? "");
            setCtaButtonText(cta.buttonText ?? d.ctaButtonText ?? "");
            setCtaButtonLink(cta.buttonLink ?? d.ctaButtonLink ?? "");
            const cfg = d.config && typeof d.config === "object" ? d.config : {};
            setHeroConfig({
                ...DEFAULT_HERO_3D_CONFIG,
                ...cfg,
                modelRotation: { ...DEFAULT_HERO_3D_CONFIG.modelRotation, ...(cfg.modelRotation || {}) },
                camera: { ...DEFAULT_HERO_3D_CONFIG.camera, ...(cfg.camera || {}) },
                lights: { ...DEFAULT_HERO_3D_CONFIG.lights, ...(cfg.lights || {}) },
            });
        } catch (e) {
            setError(e?.message || "Failed to load hero");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleHeroRotationChange = useCallback((deg) => {
        setHeroConfig((c) => ({ ...c, modelRotation: deg }));
    }, []);

    const addColor = () => setColors((c) => (c.length >= 3 ? c : [...c, { id: "", name: "", img: "", hex: "#000000", tooltip: "" }]));
    const removeColor = (i) => setColors((c) => c.filter((_, j) => j !== i));
    const updateColor = (i, field, value) => setColors((c) => c.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

    const triggerUpload = (index) => {
        setUploadingIndex(index);
        fileInputRef.current?.click();
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingIndex == null) return;
        const idx = uploadingIndex;
        e.target.value = "";
        const lower = file.name.toLowerCase();
        const is3d = lower.endsWith(".glb") || lower.endsWith(".gltf");
        try {
            const data = is3d ? await upload3DModel(file) : await uploadImage(file);
            updateColor(idx, "img", data.url || data.secure_url || data.fileUrl || "");
        } catch (err) {
            alert(err.message || "Upload failed");
        } finally {
            setUploadingIndex(null);
        }
    };

    const heroGlbUrl = useMemo(() => firstGlbUrlFromColors(colors), [colors]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateHero({
                colors: colors.slice(0, 3).map((x) => ({ id: x.id || undefined, name: x.name, img: x.img, hex: x.hex, tooltip: x.tooltip || undefined })),
                cta: {
                    headline: ctaHeadline || undefined,
                    subtitle: ctaSubtitle || undefined,
                    buttonText: ctaButtonText || undefined,
                    buttonLink: ctaButtonLink || undefined,
                },
                config: {
                    ...heroConfig,
                    use3DModel: false,
                    modelUrl: "",
                    modelScale:
                        typeof heroConfig.modelScale === "number" && !Number.isNaN(heroConfig.modelScale)
                            ? heroConfig.modelScale
                            : 1,
                    modelRotation: {
                        x: (() => {
                            const v = parseFloat(heroConfig.modelRotation?.x);
                            return Number.isFinite(v) ? v : 0;
                        })(),
                        y: (() => {
                            const v = parseFloat(heroConfig.modelRotation?.y);
                            return Number.isFinite(v) ? v : 90;
                        })(),
                        z: (() => {
                            const v = parseFloat(heroConfig.modelRotation?.z);
                            return Number.isFinite(v) ? v : 0;
                        })(),
                    },
                    camera: {
                        position: Array.isArray(heroConfig.camera?.position)
                            ? heroConfig.camera.position.map((n) => {
                                  const v = parseFloat(n);
                                  return Number.isFinite(v) ? v : 0;
                              })
                            : [...DEFAULT_HERO_3D_CONFIG.camera.position],
                        fov:
                            typeof heroConfig.camera?.fov === "number" && !Number.isNaN(heroConfig.camera.fov)
                                ? heroConfig.camera.fov
                                : 42,
                    },
                    lights: {
                        ambient: (() => {
                            const v = parseFloat(heroConfig.lights?.ambient);
                            return Number.isFinite(v) ? v : DEFAULT_HERO_3D_CONFIG.lights.ambient;
                        })(),
                        directionalMain: (() => {
                            const v = parseFloat(heroConfig.lights?.directionalMain);
                            return Number.isFinite(v) ? v : DEFAULT_HERO_3D_CONFIG.lights.directionalMain;
                        })(),
                        directionalFill: (() => {
                            const v = parseFloat(heroConfig.lights?.directionalFill);
                            return Number.isFinite(v) ? v : DEFAULT_HERO_3D_CONFIG.lights.directionalFill;
                        })(),
                    },
                },
            });
            alert("Hero saved.");
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <>
                <Head><title>Hero — Hustle Admin</title></Head>
                <Layout>
                    <div className="space-y-4"><div className="skeleton h-64 rounded-2xl" /></div>
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Hero — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-2xl">
                    <p className="text-sm text-[#6e6e73]">
                        Up to 3 variants: use a <strong>normal image</strong> for the 2D hero, or paste / upload a <strong>.glb / .gltf</strong> URL in the image field to show that 3D model on the homepage. Rotation and camera below apply to that model.
                    </p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[#1d1d1f]">Color variants (max 3)</label>
                                <button type="button" onClick={addColor} disabled={colors.length >= 3} className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline disabled:opacity-50 disabled:pointer-events-none">
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.glb,.gltf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="space-y-3">
                                {colors.map((c, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-black/10 bg-white space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-[#6e6e73]">Variant {i + 1}</span>
                                            <button type="button" onClick={() => removeColor(i)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={16} /></button>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#6e6e73] mb-1">Name</label>
                                            <input className={INPUT} placeholder="e.g. Midnight Black, Ocean Blue" value={c.name ?? ""} onChange={(e) => updateColor(i, "name", e.target.value)} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {c.img ? (
                                                <div className="relative shrink-0">
                                                    {isGltfAssetUrl(c.img) ? (
                                                        <div className="w-16 h-16 rounded-xl border border-black/10 bg-[#f0f0f2] flex flex-col items-center justify-center gap-0.5">
                                                            <Box size={20} className="text-[#6e6e73]" />
                                                            <span className="text-[9px] font-bold text-[#6e6e73]">GLB</span>
                                                        </div>
                                                    ) : (
                                                        <img src={c.img} alt="" className="w-16 h-16 object-cover rounded-xl border border-black/10" />
                                                    )}
                                                    <button type="button" onClick={() => updateColor(i, "img", "")} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><X size={12} /></button>
                                                </div>
                                            ) : null}
                                            <input className={`${INPUT} flex-1 min-w-[160px]`} placeholder="Image or .glb / .gltf URL" value={c.img} onChange={(e) => updateColor(i, "img", e.target.value)} />
                                            <button type="button" onClick={() => triggerUpload(i)} disabled={uploadingIndex !== null} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium text-[#1d1d1f] hover:bg-black/5 disabled:opacity-50 shrink-0">
                                                {uploadingIndex === i ? (
                                                    <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /> Uploading...</span>
                                                ) : (
                                                    <><Upload size={16} /> Upload</>
                                                )}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-[#6e6e73] block">Text color:</label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="color" className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer shrink-0" value={c.hex || "#000000"} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                                <input className={`${INPUT} flex-1 min-w-[100px]`} placeholder="#2C2C2C" value={c.hex} onChange={(e) => updateColor(i, "hex", e.target.value)} />
                                                <button
                                                    type="button"
                                                    onClick={() => updateColor(i, "hex", LIQUID_GLASS_HEX)}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/60 bg-[#E8ECF0] text-[#4a5568] text-sm font-medium hover:bg-[#DCE2E8] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] shrink-0 shadow-sm"
                                                    title="Liquid glass – clear, soft blue-gray"
                                                >
                                                    <span className="w-5 h-5 rounded-full border border-white/70 shrink-0 shadow-inner" style={{ background: "linear-gradient(145deg, #EEF2F6 0%, #E0E6EC 50%, #D4DAE2 100%)" }} />
                                                    Liquid glass
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">3D view (matches storefront)</h3>
                            <p className="text-xs text-[#6e6e73] leading-relaxed">
                                Uses the <strong>first color variant</strong> whose image URL is a <strong>.glb / .gltf</strong> (same as the live site). <strong>Click and drag</strong> to aim the model, release to lock, then <strong>Save Hero</strong>. Advanced numbers are optional.
                            </p>
                            {heroGlbUrl ? (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="text-xs font-medium text-[#6e6e73]">Model scale</label>
                                        <input
                                            type="number"
                                            step={0.05}
                                            min={0.1}
                                            max={10}
                                            className={`${INPUT} w-24 py-1.5 text-sm`}
                                            value={heroConfig.modelScale ?? 1}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value, 10);
                                                setHeroConfig((c) => ({ ...c, modelScale: Number.isFinite(v) ? v : 1 }));
                                            }}
                                        />
                                    </div>
                                    <Hero3DRotationEditor
                                        key={heroGlbUrl}
                                        glbUrl={heroGlbUrl}
                                        modelScale={heroConfig.modelScale ?? 1}
                                        modelRotation={{
                                            ...DEFAULT_HERO_3D_CONFIG.modelRotation,
                                            ...heroConfig.modelRotation,
                                        }}
                                        cameraPosition={heroConfig.camera?.position || DEFAULT_HERO_3D_CONFIG.camera.position}
                                        cameraFov={heroConfig.camera?.fov ?? DEFAULT_HERO_3D_CONFIG.camera.fov}
                                        onRotationChange={handleHeroRotationChange}
                                        width={420}
                                        height={320}
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-xs font-medium px-3 py-2 rounded-lg border border-black/10 bg-white text-[#1d1d1f] hover:bg-black/[0.03]"
                                            onClick={() =>
                                                setHeroConfig((c) => ({
                                                    ...c,
                                                    modelRotation: { ...DEFAULT_HERO_3D_CONFIG.modelRotation },
                                                }))
                                            }
                                        >
                                            Reset rotation to default
                                        </button>
                                        <button
                                            type="button"
                                            className="text-xs font-medium text-[#1d1d1f] underline underline-offset-2"
                                            onClick={() => {
                                                const snippet = JSON.stringify(
                                                    {
                                                        modelRotation: heroConfig.modelRotation,
                                                        camera: heroConfig.camera,
                                                        lights: heroConfig.lights,
                                                    },
                                                    null,
                                                    2
                                                );
                                                navigator.clipboard?.writeText(snippet).then(
                                                    () => alert("Copied view settings JSON to clipboard."),
                                                    () => alert(snippet)
                                                );
                                            }}
                                        >
                                            Copy view settings (JSON)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-[#86868b]">
                                    Add a <strong>.glb / .gltf</strong> URL (or file) to one of the color variants above to preview and save rotation here.
                                </p>
                            )}

                            <details className="text-xs text-[#6e6e73] rounded-xl border border-black/10 bg-white px-4 py-3 mt-2">
                                <summary className="cursor-pointer font-semibold text-[#1d1d1f]">
                                    Advanced: camera, manual rotation &amp; lights
                                </summary>
                                <p className="mt-2 mb-3 text-[#86868b]">
                                    Optional. The interactive preview above is enough for most cases. Reload the page after changing camera while testing.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#6e6e73] mb-1">Camera FOV</label>
                                        <input
                                            type="number"
                                            step={1}
                                            min={20}
                                            max={90}
                                            className={INPUT}
                                            value={heroConfig.camera?.fov ?? 42}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                setHeroConfig((c) => ({
                                                    ...c,
                                                    camera: {
                                                        ...DEFAULT_HERO_3D_CONFIG.camera,
                                                        ...c.camera,
                                                        fov: Number.isFinite(v) ? v : 42,
                                                    },
                                                }));
                                            }}
                                        />
                                    </div>
                                    {[
                                        { i: 0, label: "Cam X" },
                                        { i: 1, label: "Cam Y" },
                                        { i: 2, label: "Cam Z" },
                                    ].map(({ i, label }) => (
                                        <div key={label}>
                                            <label className="block text-[11px] font-medium text-[#6e6e73] mb-1">{label}</label>
                                            <input
                                                type="number"
                                                step={0.1}
                                                className={INPUT}
                                                value={(heroConfig.camera?.position || DEFAULT_HERO_3D_CONFIG.camera.position)[i]}
                                                onChange={(e) => {
                                                    const nv = parseFloat(e.target.value);
                                                    setHeroConfig((c) => {
                                                        const pos = [
                                                            ...(c.camera?.position || DEFAULT_HERO_3D_CONFIG.camera.position),
                                                        ];
                                                        pos[i] = Number.isFinite(nv) ? nv : 0;
                                                        return {
                                                            ...c,
                                                            camera: { ...DEFAULT_HERO_3D_CONFIG.camera, ...c.camera, position: pos },
                                                        };
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] font-medium text-[#6e6e73] mb-2">Manual rotation (degrees)</p>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {["x", "y", "z"].map((axis) => (
                                        <div key={axis}>
                                            <label className="block text-[10px] text-[#6e6e73] mb-0.5">{axis.toUpperCase()}°</label>
                                            <input
                                                type="number"
                                                className={INPUT}
                                                value={
                                                    heroConfig.modelRotation?.[axis] ??
                                                    (axis === "y" ? 90 : 0)
                                                }
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    if (Number.isNaN(v)) return;
                                                    setHeroConfig((c) => ({
                                                        ...c,
                                                        modelRotation: {
                                                            ...DEFAULT_HERO_3D_CONFIG.modelRotation,
                                                            ...c.modelRotation,
                                                            [axis]: Math.max(-180, Math.min(180, v)),
                                                        },
                                                    }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] font-medium text-[#6e6e73] mb-2">Lights</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {["ambient", "directionalMain", "directionalFill"].map((k) => (
                                        <div key={k}>
                                            <label className="block text-[10px] uppercase mb-0.5">{k}</label>
                                            <input
                                                type="number"
                                                step={0.05}
                                                className={INPUT}
                                                value={heroConfig.lights?.[k] ?? DEFAULT_HERO_3D_CONFIG.lights[k]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setHeroConfig((c) => ({
                                                        ...c,
                                                        lights: {
                                                            ...DEFAULT_HERO_3D_CONFIG.lights,
                                                            ...c.lights,
                                                            [k]: Number.isFinite(v) ? v : 0,
                                                        },
                                                    }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-black/5">
                            <h3 className="text-sm font-semibold text-[#1d1d1f]">CTA panel (scroll-reveal)</h3>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">CTA headline</label>
                                <input className={INPUT} placeholder="Pro Level Protection." value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm text-[#6e6e73] mb-1">CTA subtitle</label>
                                <input className={INPUT} placeholder="Aerospace grade materials engineered for the modern husle." value={ctaSubtitle} onChange={(e) => setCtaSubtitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#6e6e73] mb-1">Button text</label>
                                    <input className={INPUT} placeholder="Buy Now" value={ctaButtonText} onChange={(e) => setCtaButtonText(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#6e6e73] mb-1">Button link</label>
                                    <input className={INPUT} placeholder="/products" value={ctaButtonLink} onChange={(e) => setCtaButtonLink(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
                            {saving ? "Saving..." : "Save Hero"}
                        </button>
                    </form>
                    )}
                </div>
            </Layout>
        </>
    );
}
