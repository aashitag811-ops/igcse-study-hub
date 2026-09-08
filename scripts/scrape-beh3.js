const https = require("https");

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("too many redirects"));
    const req = https.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(get(loc, redirects + 1));
      }
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// Test a subject page and a specific year/session to understand structure
(async () => {
  // Try to access a specific year page
  const testPages = [
    "https://bestexamhelp.com/exam/cambridge-igcse/biology-0610/2019/summer.php",
    "https://bestexamhelp.com/exam/cambridge-igcse/biology-0610/2022/summer.php",
    "https://bestexamhelp.com/exam/cambridge-a-level/biology-9700/2022/summer.php",
    "https://bestexamhelp.com/exam/cambridge-international-a-level/biology-9700/2022/summer.php",
  ];
  for (const url of testPages) {
    try {
      const r = await get(url);
      // Find all PDF links
      const pdfs = [...r.body.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m => m[1]);
      // Find all links
      const allLinks = [...r.body.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(l => !l.match(/^https?:\/\/(www\.|plus\.|twitter|facebook)/));
      console.log("URL: " + url + " status=" + r.status);
      console.log("  PDF links: " + pdfs.length);
      pdfs.slice(0,5).forEach(p => console.log("    " + p));
      if (pdfs.length === 0) {
        console.log("  All links (non-social):");
        allLinks.filter(l => !l.match(/^\/about|^\/contact|^\/exam\/cambridge|style|index/)).slice(0,10).forEach(l => console.log("    " + l));
        // Show body snippet
        const start = r.body.indexOf("crate");
        if (start > 0) console.log("  Content: " + r.body.substring(start, start+500).replace(/\s+/g," "));
      }
    } catch(e) {
      console.log("ERROR " + url + ": " + e.message);
    }
  }
})();
