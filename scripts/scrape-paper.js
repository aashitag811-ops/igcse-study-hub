const https = require("https");
function get(url, redirects=0) {
  return new Promise((resolve,reject) => {
    if(redirects>5) return reject(new Error("too many redirects"));
    const req = https.get(url,{timeout:15000,headers:{"User-Agent":"Mozilla/5.0"}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
        const loc=res.headers.location.startsWith("http")?res.headers.location:new URL(res.headers.location,url).href;
        res.resume(); return resolve(get(loc,redirects+1));
      }
      let data=""; res.on("data",d=>data+=d); res.on("end",()=>resolve({status:res.statusCode,body:data,finalUrl:url}));
    });
    req.on("error",reject); req.on("timeout",()=>{req.destroy();reject(new Error("timeout"));});
  });
}
(async()=>{
  const r = await get("https://bestexamhelp.com/exam/cambridge-igcse/biology-0610/2022/0610-s22-qp-11.php");
  console.log("Status:", r.status, "FinalURL:", r.finalUrl);
  // Find all PDF and download links
  const pdfs = [...r.body.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]);
  const downloads = [...r.body.matchAll(/href="([^"]*(?:download|drive|papers|docs)[^"]*)"/gi)].map(m=>m[1]);
  const allLinks = [...r.body.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  console.log("PDF links:", pdfs);
  console.log("Download links:", downloads.slice(0,10));
  // Show full content section
  const bodyTxt = r.body.replace(/<[^>]+>/g," ").replace(/\s+/g," ").substring(0,3000);
  console.log("\nText content:\n", bodyTxt);
})();
