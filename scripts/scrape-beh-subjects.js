const https = require("https");
const http = require("http");

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, body: data, url }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

(async () => {
  const BASE = "https://bestexamhelp.com";
  const pages = [
    "/exam/cambridge-igcse/index.php",
    "/exam/cambridge-international-a-level/index.php",
    "/exam/cambridge-o-level/index.php",
  ];

  for (const page of pages) {
    try {
      const r = await get(BASE + page);
      if (r.status !== 200) { console.log("SKIP " + page + " status=" + r.status); continue; }
      
      // Extract all subject links (relative hrefs ending in index.php that look like subject pages)
      const matches = [...r.body.matchAll(/href="([^"]*\/[^"]*-\d{4}[^"]*index\.php)"/g)];
      const links = [...new Set(matches.map(m => m[1]))];
      
      console.log("\n=== " + page + " ===");
      links.forEach(l => console.log(l));
    } catch(e) {
      console.log("ERROR " + page + ": " + e.message);
    }
  }
})();
