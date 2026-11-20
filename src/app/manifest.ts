import type { MetadataRoute } from "next";

/** Lets residents add the portal to their home screen (required for push on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Portail des résidents",
    short_name: "Portail CiuP",
    start_url: "/calendar",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
