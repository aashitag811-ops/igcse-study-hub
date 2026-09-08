const https = require("https");
const BASE = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/";
function head(code) {
  return new Promise(resolve => {
    const req = https.request(BASE+code+".pdf",{method:"HEAD",timeout:6000},res=>{
      res.resume(); resolve({code,exists:res.statusCode===200});
    });
    req.on("error",()=>resolve({code,exists:false}));
    req.on("timeout",()=>{req.destroy();resolve({code,exists:false});});
    req.end();
  });
}
const YEARS=[]; for(let y=10;y<=25;y++)YEARS.push(String(y).padStart(2,"0"));
async function probe(codes) {
  const BATCH=30; const found=new Set();
  for(let i=0;i<codes.length;i+=BATCH){
    const results=await Promise.all(codes.slice(i,i+BATCH).map(head));
    results.filter(r=>r.exists).forEach(r=>found.add(r.code));
  }
  return found;
}
function summarise(label, found) {
  console.log("=== "+label+" ("+found.size+") ===");
  const by={};
  for(const id of found){
    const m=id.match(/_([msw])(\d+)_qp_(\d)(\d)/);
    if(m){const k="P"+m[3]+"v"+m[4];if(!by[k])by[k]=[];by[k].push(m[1]+m[2]);}
  }
  for(const [k,v] of Object.entries(by).sort()) console.log("  "+k+": ["+v.join(",")+"]");
}
(async()=>{
  // 0490 Religious Studies
  const a490=[];
  for(const yr of YEARS) for(const s of ["s","w"]) for(const c of [1,2,3,4,5,6]) for(const v of [1,2,3]) a490.push("0490_"+s+yr+"_qp_"+c+v);
  summarise("0490 Religious Studies", await probe(a490));

  // 0510 March sessions
  const eslM=[];
  for(const yr of YEARS) for(const c of [1,2,3,4]) for(const v of [1,2,3]) eslM.push("0510_m"+yr+"_qp_"+c+v);
  summarise("0510 ESL March", await probe(eslM));

  // 0470 and 0460 March sessions
  for(const code of ["0470","0460"]){
    const am=[];
    for(const yr of YEARS) for(const c of [1,2,4]) for(const v of [1,2,3]) am.push(code+"_m"+yr+"_qp_"+c+v);
    summarise(code+" March", await probe(am));
  }
})();
