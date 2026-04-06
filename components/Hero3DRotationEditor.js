"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { configureGLTFLoader } from "../lib/configureGLTFLoader.js";

function degToRad(d) {
    const n = typeof d === "number" && !Number.isNaN(d) ? d : 0;
    return (n * Math.PI) / 180;
}

function radToDeg(r) {
    return (r * 180) / Math.PI;
}

function applyDegRotation(group, rot) {
    if (!group) return;
    const x = degToRad(rot?.x ?? 0);
    const y = degToRad(typeof rot?.y === "number" ? rot.y : 90);
    const z = degToRad(rot?.z ?? 0);
    group.rotation.set(x, y, z);
}

/**
 * Drag on the canvas to rotate the model. Same euler degrees as storefront `modelRotation`.
 * Parent is updated on pointer up so values are saved when you click "Save Hero".
 */
export default function Hero3DRotationEditor({
    glbUrl,
    modelScale = 1,
    modelRotation = { x: 0, y: 90, z: 0 },
    cameraPosition = [0, 0.15, 3.6],
    cameraFov = 42,
    onRotationChange,
    width = 420,
    height = 320,
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sceneReady, setSceneReady] = useState(false);

    const instanceRef = useRef({
        renderer: null,
        camera: null,
        modelGroup: null,
        scene: null,
        animationId: null,
    });

    const rotationPropRef = useRef(modelRotation);
    rotationPropRef.current = modelRotation;

    const draggingRef = useRef(false);
    const pointerIdRef = useRef(null);
    const lastRef = useRef({ x: 0, y: 0 });

    const emitRotation = useCallback(
        (group) => {
            if (!group || typeof onRotationChange !== "function") return;
            onRotationChange({
                x: Math.round(radToDeg(group.rotation.x) * 100) / 100,
                y: Math.round(radToDeg(group.rotation.y) * 100) / 100,
                z: Math.round(radToDeg(group.rotation.z) * 100) / 100,
            });
        },
        [onRotationChange]
    );

    useEffect(() => {
        if (!glbUrl || !canvasRef.current || typeof window === "undefined") return;

        const canvas = canvasRef.current;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSceneReady(false);

        const init = async () => {
            const THREE = await import("three");
            const { Scene, Color, PerspectiveCamera, WebGLRenderer, DirectionalLight, AmbientLight, Group, Box3, Vector3 } =
                THREE;
            const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

            const scene = new Scene();
            scene.background = new Color(0xf5f5f7);

            const camPos = Array.isArray(cameraPosition) && cameraPosition.length >= 3 ? cameraPosition : [0, 0.15, 3.6];
            const fov = typeof cameraFov === "number" && cameraFov > 0 ? cameraFov : 42;
            const camera = new PerspectiveCamera(fov, width / height, 0.1, 100);
            camera.position.set(camPos[0], camPos[1], camPos[2]);

            const renderer = new WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            scene.add(new AmbientLight(0xffffff, 0.62));
            const d1 = new DirectionalLight(0xffffff, 1.05);
            d1.position.set(5, 10, 7);
            scene.add(d1);
            const d2 = new DirectionalLight(0xffffff, 0.35);
            d2.position.set(-6, 4, -4);
            scene.add(d2);

            const modelGroup = new Group();
            modelGroup.scale.setScalar(typeof modelScale === "number" && modelScale > 0 ? modelScale : 1);
            applyDegRotation(modelGroup, rotationPropRef.current);
            scene.add(modelGroup);

            instanceRef.current = {
                renderer,
                camera,
                modelGroup,
                scene,
                animationId: null,
            };

            const loader = new GLTFLoader();
            await configureGLTFLoader(loader, renderer);
            loader.load(
                glbUrl,
                (gltf) => {
                    if (cancelled) return;
                    const sceneObj = gltf.scene;
                    const box = new Box3().setFromObject(sceneObj);
                    const center = box.getCenter(new Vector3());
                    sceneObj.position.sub(center);
                    modelGroup.add(sceneObj);
                    applyDegRotation(modelGroup, rotationPropRef.current);
                    setLoading(false);
                    setSceneReady(true);
                },
                undefined,
                (err) => {
                    if (!cancelled) {
                        setError(err?.message || "Failed to load model");
                        setLoading(false);
                    }
                }
            );

            function animate() {
                if (cancelled) return;
                const id = requestAnimationFrame(animate);
                instanceRef.current.animationId = id;
                renderer.render(scene, camera);
            }
            animate();
        };

        init();

        const onResize = () => {
            const inst = instanceRef.current;
            if (!inst.renderer || !inst.camera || !containerRef.current) return;
            const w = Math.max(280, containerRef.current.clientWidth || width);
            const h = height;
            inst.camera.aspect = w / h;
            inst.camera.updateProjectionMatrix();
            inst.renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        return () => {
            cancelled = true;
            window.removeEventListener("resize", onResize);
            const inst = instanceRef.current;
            if (inst.animationId) cancelAnimationFrame(inst.animationId);
            if (inst.renderer) inst.renderer.dispose();
            instanceRef.current = { renderer: null, camera: null, modelGroup: null, scene: null, animationId: null };
            setSceneReady(false);
        };
    }, [glbUrl, width, height, modelScale, cameraPosition, cameraFov]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const group = instanceRef.current.modelGroup;
        if (!sceneReady || !canvas || !group) return;

        const onDown = (e) => {
            if (e.button !== 0) return;
            draggingRef.current = true;
            pointerIdRef.current = e.pointerId;
            lastRef.current = { x: e.clientX, y: e.clientY };
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        };

        const onMove = (e) => {
            if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
            const dx = e.clientX - lastRef.current.x;
            const dy = e.clientY - lastRef.current.y;
            lastRef.current = { x: e.clientX, y: e.clientY };

            const s = 0.01;
            group.rotation.y += dx * s;
            group.rotation.x += dy * s;
            const lim = Math.PI / 2 - 0.01;
            group.rotation.x = Math.max(-lim, Math.min(lim, group.rotation.x));

            const inst = instanceRef.current;
            if (inst.renderer && inst.scene && inst.camera) {
                inst.renderer.render(inst.scene, inst.camera);
            }
        };

        const onUp = (e) => {
            if (e.pointerId !== pointerIdRef.current) return;
            draggingRef.current = false;
            pointerIdRef.current = null;
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
            emitRotation(group);
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
        };
    }, [sceneReady, glbUrl, emitRotation]);

    useEffect(() => {
        const group = instanceRef.current.modelGroup;
        if (!group || !sceneReady || draggingRef.current) return;
        applyDegRotation(group, modelRotation);
        const inst = instanceRef.current;
        if (inst.renderer && inst.scene && inst.camera) {
            inst.renderer.render(inst.scene, inst.camera);
        }
    }, [modelRotation?.x, modelRotation?.y, modelRotation?.z, sceneReady]);

    if (!glbUrl) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-full max-w-[480px] rounded-xl overflow-hidden border border-black/10 bg-[#f5f5f7] shadow-inner"
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="block w-full h-auto max-h-[min(50vh,360px)] cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ minHeight: 200 }}
            />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#6e6e73] bg-[#f5f5f7]/95">
                    Loading 3D model…
                </div>
            )}
            {error && (
                <p className="absolute bottom-2 left-2 right-2 text-xs text-red-600 bg-white/90 rounded px-2 py-1">{error}</p>
            )}
        </div>
    );
}
