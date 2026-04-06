import { BASIS_TRANSCODER_PATH } from "./basisTranscoderPath.js";

/** Single loader instance — THREE warns if multiple KTX2Loader instances stay active. */
let ktx2Loader = null;

/**
 * @param {import("three").WebGLRenderer | null} renderer — pass before loading GLBs so transcoder support matches the GL context.
 * @returns {Promise<import("three/addons/loaders/KTX2Loader.js").KTX2Loader>}
 */
export async function getSharedKTX2Loader(renderer) {
    const { KTX2Loader } = await import("three/addons/loaders/KTX2Loader.js");
    if (!ktx2Loader) {
        ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath(BASIS_TRANSCODER_PATH);
    }
    if (renderer) {
        ktx2Loader.detectSupport(renderer);
    }
    return ktx2Loader;
}
