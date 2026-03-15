"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Product 3D viewer using Canvas + Three.js WebGL (Codrops-style).
 * Renders into an explicit <canvas> (canvas engine); WebGL draw calls target that canvas.
 * - view360 === true: OrbitControls — user drags to orbit (360° view).
 * - view360 === false: model auto-rotates.
 * Expects GLB/GLTF URL. Renders client-side only.
 * @see https://tympanus.net/codrops/2025/05/31/building-interactive-3d-cards-in-webflow-with-three-js/
 */
export default function Product3DViewer({ glbUrl, view360 = true, className = "", width = 280, height = 200 }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const instanceRef = useRef({ animationId: null, renderer: null, controls: null, camera: null });

    useEffect(() => {
        if (!glbUrl || typeof window === "undefined" || !containerRef.current || !canvasRef.current) return;

        const container = containerRef.current;
        const canvas = canvasRef.current;

        const init = async () => {
            const {
                Scene,
                Color,
                PerspectiveCamera,
                WebGLRenderer,
                DirectionalLight,
                AmbientLight,
                Group,
            } = await import("three");
            const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
            const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

            const scene = new Scene();
            scene.background = new Color(0x202020);

            const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
            camera.position.set(2, 0, 0);

            // Use the canvas engine: render WebGL into the explicit canvas element
            const renderer = new WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                context: null,
                powerPreference: "default",
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const directionalLight = new DirectionalLight(0xffffff, 4);
            directionalLight.position.set(30, -10, 20);
            scene.add(directionalLight);
            scene.add(new AmbientLight(0x404040));

            const modelGroup = new Group();
            scene.add(modelGroup);

            let controls = null;
            if (view360) {
                controls = new OrbitControls(camera, canvas);
                controls.enableZoom = false;
                controls.enablePan = false;
                controls.minPolarAngle = Math.PI / 2;
                controls.maxPolarAngle = Math.PI / 2;
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
            }

            instanceRef.current.renderer = renderer;
            instanceRef.current.controls = controls;
            instanceRef.current.camera = camera;

            const loader = new GLTFLoader();
            loader.load(
                glbUrl,
                (gltf) => {
                    modelGroup.add(gltf.scene);
                    setLoading(false);
                },
                undefined,
                (err) => {
                    setError(err?.message || "Failed to load 3D model");
                    setLoading(false);
                }
            );

            function animate() {
                const id = requestAnimationFrame(animate);
                instanceRef.current.animationId = id;
                if (view360 && controls) controls.update();
                else if (modelGroup.children.length > 0) modelGroup.rotation.y += 0.008;
                renderer.render(scene, camera);
            }
            animate();
        };

        init();

        const onResize = () => {
            const inst = instanceRef.current;
            if (!inst.renderer || !inst.camera || !containerRef.current) return;
            const w = containerRef.current.clientWidth || width;
            const h = containerRef.current.clientHeight || height;
            inst.camera.aspect = w / h;
            inst.camera.updateProjectionMatrix();
            inst.renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            const inst = instanceRef.current;
            if (inst.animationId) cancelAnimationFrame(inst.animationId);
            if (inst.controls && inst.controls.dispose) inst.controls.dispose();
            if (inst.renderer) {
                inst.renderer.dispose();
                // Canvas is owned by React (canvasRef); do not remove it
            }
            instanceRef.current = { animationId: null, renderer: null, controls: null, camera: null };
        };
    }, [glbUrl, view360, width, height]);

    if (!glbUrl) return null;

    return (
        <div className={`relative ${className}`}>
            <div
                ref={containerRef}
                style={{ width, height, minHeight: height, background: "#202020", borderRadius: "12px", overflow: "hidden" }}
            >
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: "block", width: "100%", height: "100%" }}
                    aria-label="3D product model viewer"
                />
            </div>
            {loading && (
                <div
                    className="absolute inset-0 flex items-center justify-center text-white text-sm rounded-xl"
                    style={{ background: "#202020", width, height }}
                >
                    Loading 3D…
                </div>
            )}
            {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
}
