/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    // Solo para dev: ahí el backend vive en un origen distinto (localhost:3001)
    // y las fotos de tatuadores se sirven desde ahí (ver resolveAssetUrl en
    // lib/api.ts). En producción imageUrl es relativa (mismo origen vía Nginx),
    // así que este remotePattern nunca entra en juego.
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
};

export default nextConfig;
