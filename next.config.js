/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // This enables static exports
  images: {
    unoptimized: true, // Required for static export
  },

  // Emit out/<route>/index.html instead of out/<route>.html.
  //
  // Static hosts serve a directory's index.html for /<route> natively, which is
  // what makes extensionless URLs work without any rewrite rules. The previous
  // setup relied on a Render catch-all rewriting /* to /:splat.html, and that
  // rule silently served an empty 200 for every extensionless path — the site
  // only ever worked at / and at explicit .html URLs.
  trailingSlash: true,
};

module.exports = nextConfig;
