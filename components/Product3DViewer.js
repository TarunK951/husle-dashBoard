"use client";

import { useEffect, useRef, useState } from "react";
import { configureGLTFLoader } from "../lib/configureGLTFLoader.js";

function degToRad(d) {
    const n = typeof d === "number" && !Number.isNaN(d) ? d : 0;
    return (n * Math.PI) / 180;
}

/**
 * Product 3D viewer — Canvas + Three.js WebGL.
 * @param {object} [modelRotation] — degrees { x, y, z } applied to the loaded model.
 * @param {number[]} [cameraPosition] — [x, y, z]
 * @param {number} [cameraFov]
 * @param {boolean} [previewLightBg] — light background for admin preview
 */
export default function Product3DViewer({
    glbUrl,
    view360 = true,
    className = "",
    width = 280,
    height = 200,
    modelRotation = { x: 0, y: 90, z: 0 },
    cameraPosition = [0, 0.15, 3.6],
    cameraFov = 42,
    previewLightBg = false,
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const instanceRef = useRef({
        animationId: null,
        renderer: null,
        controls: null,
        camera: null,
        modelGroup: null,
    });

    const modelRotationRef = useRef(modelRotation);
    const cameraPositionRef = useRef(cameraPosition);
    const cameraFovRef = useRef(cameraFov);
    modelRotationRef.current = modelRotation;
    cameraPositionRef.current = cameraPosition;
    cameraFovRef.current = cameraFov;

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
            scene.background = new Color(previewLightBg ? 0xf5f5f7 : 0x202020);

            const mr = modelRotationRef.current || {};
            const camPos =
                Array.isArray(cameraPositionRef.current) && cameraPositionRef.current.length >= 3
                    ? cameraPositionRef.current
                    : [0, 0.15, 3.6];
            const fov =
                typeof cameraFovRef.current === "number" && cameraFovRef.current > 0 ? cameraFovRef.current : 42;
            const camera = new PerspectiveCamera(fov, width / height, 0.1, 100);
            camera.position.set(camPos[0], camPos[1], camPos[2]);

            const coarsePointer = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
            const maxDpr = coarsePointer ? 1.4 : 2;

            const renderer = new WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                context: null,
                powerPreference: "default",
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

            const directionalLight = new DirectionalLight(0xffffff, previewLightBg ? 1.2 : 4);
            directionalLight.position.set(30, -10, 20);
            scene.add(directionalLight);
            scene.add(new AmbientLight(previewLightBg ? 0xffffff : 0x404040, previewLightBg ? 0.85 : 1));

            const modelGroup = new Group();
            const rx = degToRad(mr.x);
            const ry = degToRad(typeof mr.y === "number" ? mr.y : 90);
            const rz = degToRad(mr.z);
            modelGroup.rotation.set(rx, ry, rz);
            scene.add(modelGroup);

            let controls = null;
            if (view360) {
                controls = new OrbitControls(camera, canvas);
                controls.enableZoom = true;
                controls.enablePan = false;
                controls.minPolarAngle = Math.PI / 2;
                controls.maxPolarAngle = Math.PI / 2;
                controls.enableDamping = true;
                controls.dampingFactor = coarsePointer ? 0.085 : 0.05;
            }

            instanceRef.current.renderer = renderer;
            instanceRef.current.controls = controls;
            instanceRef.current.camera = camera;
            instanceRef.current.modelGroup = modelGroup;

            const loader = new GLTFLoader();
            await configureGLTFLoader(loader, renderer);
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
            if (inst.renderer) inst.renderer.dispose();
            instanceRef.current = {
                animationId: null,
                renderer: null,
                controls: null,
                camera: null,
                modelGroup: null,
            };
        };
    }, [glbUrl, view360, width, height, previewLightBg]);

    useEffect(() => {
        const g = instanceRef.current.modelGroup;
        if (!g) return;
        const mr = modelRotation || {};
        const rx = degToRad(mr.x);
        const ry = degToRad(typeof mr.y === "number" ? mr.y : 90);
        const rz = degToRad(mr.z);
        g.rotation.set(rx, ry, rz);
    }, [modelRotation?.x, modelRotation?.y, modelRotation?.z]);

    useEffect(() => {
        const cam = instanceRef.current.camera;
        if (!cam) return;
        const camPos = Array.isArray(cameraPosition) && cameraPosition.length >= 3 ? cameraPosition : [0, 0.15, 3.6];
        cam.position.set(camPos[0], camPos[1], camPos[2]);
        if (typeof cameraFov === "number" && cameraFov > 0) {
            cam.fov = cameraFov;
            cam.updateProjectionMatrix();
        }
    }, [cameraPosition?.[0], cameraPosition?.[1], cameraPosition?.[2], cameraFov]);

    if (!glbUrl) return null;

    const bg = previewLightBg ? "#f5f5f7" : "#202020";

    return (
        <div className={`relative ${className}`}>
            <div
                ref={containerRef}
                style={{ width, height, minHeight: height, background: bg, borderRadius: "12px", overflow: "hidden" }}
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
                    className="absolute inset-0 flex items-center justify-center text-sm rounded-xl"
                    style={{ background: `${bg}ee`, width, height, color: previewLightBg ? "#6e6e73" : "#fff" }}
                >
                    Loading 3D…
                </div>
            )}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
