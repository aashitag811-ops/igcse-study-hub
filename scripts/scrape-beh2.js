const https = require("https");

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("too many redirects"));
    const req = https.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(get(loc, redirects + 1));
      }
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, body: data, finalUrl: url }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout: " + url)); });
  });
}

(async () => {
  const sections = [
    { label: "IGCSE", url: "https://bestexamhelp.com/exam/cambridge-igcse/index.php" },
    { label: "A-Level", url: "https://bestexamhelp.com/exam/cambridge-international-a-level/index.php" },
    { label: "O-Level", url: "https://bestexamhelp.com/exam/cambridge-o-level/index.php" },
  ];

  for (const sec of sections) {
    try {
      const r = await get(sec.url);
      console.log("\n=== " + sec.label + " (status=" + r.status + ", finalUrl=" + r.finalUrl + ") ===");
      
      const matches = [...r.body.matchAll(/href="([^"]*index\.php)"/g)];
      const links = [...new Set(matches.map(m => m[1]))]
        .filter(l => l.match(/\d{4}/) && !l.match(/^\/about|^\/contact|^\/exam\/cambridge|^\/exam\/index|^\/index/));
      
      links.forEach(l => console.log("  " + l));
      console.log("  Total: " + links.length + " subjects");
    } catch(e) {
      console.log("ERROR " + sec.label + ": " + e.message);
    }
  }
})();
