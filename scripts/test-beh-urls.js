const https = require("https");
function head(url) {
  return new Promise(resolve => {
    const req = https.request(url,{method:"HEAD",timeout:10000,headers:{"User-Agent":"Mozilla/5.0"}},res=>{
      res.resume(); resolve({status:res.statusCode, size:res.headers["content-length"], url});
    });
    req.on("error",()=>resolve({status:"err",url}));
    req.on("timeout",()=>{req.destroy();resolve({status:"timeout",url});});
    req.end();
  });
}
(async()=>{
  // Test IGCSE and A-Level PDF URLs
  const tests = [
    "https://bestexamhelp.com/exam/cambridge-igcse/biology-0610/2022/0610_s22_qp_11.pdf",
    "https://bestexamhelp.com/exam/cambridge-igcse/biology-0610/2019/0610_s19_ms_11.pdf",
    "https://bestexamhelp.com/exam/cambridge-international-a-level/biology-9700/2022/9700_s22_qp_11.pdf",
    "https://bestexamhelp.com/exam/cambridge-igcse/law-9084/2022/9084_s22_qp_11.pdf",
    "https://bestexamhelp.com/exam/cambridge-international-a-level/law-9084/2022/9084_s22_qp_11.pdf",
    // O-level
    "https://bestexamhelp.com/exam/cambridge-o-level/physics-5054/2022/5054_s22_qp_11.pdf",
    "https://bestexamhelp.com/exam/cambridge-o-level/mathematics-d-4024/2022/4024_s22_qp_11.pdf",
  ];
  for (const url of tests) {
    const r = await head(url);
    console.log(r.status + " [" + (r.size||"?") + "b] " + url.split("/").slice(-1)[0] + " (" + url.split("/").slice(4,6).join("/") + ")");
  }
})();
