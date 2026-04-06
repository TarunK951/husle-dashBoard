import { getSharedKTX2Loader } from "./sharedKTX2Loader.js";

/**
 * KTX2 + meshopt before GLTFLoader.load — required for compressed Draco/meshopt GLBs.
 * @param {import("three/addons/loaders/GLTFLoader.js").GLTFLoader} loader
 * @param {import("three").WebGLRenderer} renderer
 */
export async function configureGLTFLoader(loader, renderer) {
    const ktx = await getSharedKTX2Loader(renderer);
    loader.setKTX2Loader(ktx);
    const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
    loader.setMeshoptDecoder(MeshoptDecoder);
}
