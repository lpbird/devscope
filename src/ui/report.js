import { readJsonl, getDefaultOutputPath, getDefaultReportPath } from '../utils/writer.js';
import { detectEnvironment } from '../core/detector.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function generateReport(jsonlPath, outputPath, envData) {
  const src = jsonlPath || getDefaultOutputPath();
  const dest = outputPath || getDefaultReportPath();
  const records = await readJsonl(src);
  if (!records.length) throw new Error('No scan results found. Run devscope scan first.');
  const env = envData || await detectEnvironment();
  const html = buildHtml(records, env);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, html, 'utf-8');
  return { path: dest, projectCount: records.length };
}

function buildHtml(records, env) {
  const d = JSON.stringify(records);
  const e = JSON.stringify(env);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>devscope</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0c10;--s1:#12151e;--s2:#181c28;--s3:#212736;--bd:#2a3045;
  --t1:#e4e8f4;--t2:#8b93b0;--t3:#5c6488;
  --ac:#7c8aff;--tl:#4fd1c5;--gn:#48bb78;--og:#ed8936;
  --rd:#f56565;--yw:#ecc94b;--pp:#b794f4;--bl:#63b3ed;--pk:#f687b3;
  --radius:10px;
}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:var(--bg);color:var(--t1);line-height:1.6;overflow-x:hidden}
.mono{font-family:'SF Mono','Fira Code',Monaco,monospace;font-size:12px}

/* ===== Header ===== */
header{padding:16px 32px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:20px;position:sticky;top:0;background:var(--bg);z-index:100}
.logo{font-size:20px;font-weight:800;letter-spacing:-.5px}
.logo span{color:var(--ac)}
nav{display:flex;gap:4px}
nav button{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;color:var(--t2);border:1px solid transparent;background:none;transition:all .15s}
nav button:hover{color:var(--t1)}
nav button.on{background:var(--ac);color:#fff;border-color:var(--ac)}
.hinfo{margin-left:auto;font-size:12px;color:var(--t3)}

/* ===== Pages ===== */
.page{display:none;max-width:1400px;margin:0 auto;padding:24px 32px 60px}
.page.vis{display:block}

/* ===== Shared ===== */
.card{background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius);padding:18px 22px;transition:border-color .2s}
.card:hover{border-color:var(--ac)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.grid4{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
@media(max-width:900px){.grid2,.grid3{grid-template-columns:1fr}}
.title{font-size:13px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 12px;display:flex;align-items:center;gap:8px}
.title::after{content:'';flex:1;height:1px;background:var(--bd)}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;margin:1px}

/* ===== Environment Page ===== */
.env-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.env-item{display:flex;align-items:center;gap:10px;padding:14px 16px}
.env-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.env-label{font-size:13px;color:var(--t2)}
.env-ver{font-size:14px;font-weight:600;margin-left:auto}
.env-section{margin-bottom:8px}
.install-hint{margin-top:16px;padding:14px 18px;background:var(--s2);border:1px dashed var(--bd);border-radius:var(--radius);font-size:13px;color:var(--t2)}
.install-hint code{background:var(--s3);padding:2px 6px;border-radius:4px;font-family:monospace;color:var(--ac)}

/* ===== Projects Page ===== */
.toolbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.search{background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:9px 14px;color:var(--t1);font-size:13px;width:260px;outline:none;transition:border .2s}
.search:focus{border-color:var(--ac)}
.chip{background:var(--s1);border:1px solid var(--bd);border-radius:7px;padding:5px 12px;color:var(--t2);font-size:12px;cursor:pointer;transition:all .12s;white-space:nowrap}
.chip:hover,.chip.on{background:var(--ac);color:#fff;border-color:var(--ac)}
.tr{margin-left:auto;display:flex;gap:6px;align-items:center}
.sel{background:var(--s1);border:1px solid var(--bd);border-radius:7px;padding:5px 10px;color:var(--t1);font-size:12px;outline:none}
.cb-wrap{display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--t2)}
.cb-wrap input{accent-color:var(--ac)}

/* Project rows */
.proj-list{display:flex;flex-direction:column;gap:2px}
.proj-row{display:grid;grid-template-columns:2fr 1.2fr 1fr .8fr .8fr .6fr;align-items:center;padding:10px 16px;border-radius:8px;cursor:pointer;transition:background .12s;border:1px solid transparent}
.proj-row:hover{background:var(--s1);border-color:var(--bd)}
.proj-row.expanded{background:var(--s1);border-color:var(--ac);border-bottom-left-radius:0;border-bottom-right-radius:0}
.proj-head{display:grid;grid-template-columns:2fr 1.2fr 1fr .8fr .8fr .6fr;padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);font-weight:600;border-bottom:1px solid var(--bd)}
.pn{font-weight:600;font-size:13px}
.pp{font-size:10px;color:var(--t3);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.desc-col{font-size:12px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Detail card */
.detail-card{background:var(--s2);border:1px solid var(--ac);border-top:none;border-radius:0 0 var(--radius) var(--radius);padding:20px 24px;margin-bottom:4px;display:none}
.detail-card.open{display:block}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:800px){.detail-grid{grid-template-columns:1fr}}
.detail-section h4{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:8px}
.detail-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid var(--bd)}
.detail-row .lbl{color:var(--t2)}
.detail-row .val{color:var(--t1);font-weight:500;text-align:right}
.dep-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}

/* Activity & lang tags */
.tag-node{background:rgba(72,187,120,.12);color:var(--gn)}
.tag-python{background:rgba(237,137,54,.12);color:var(--og)}
.tag-golang{background:rgba(99,179,237,.12);color:var(--bl)}
.tag-rust{background:rgba(245,101,101,.12);color:var(--rd)}
.tag-java{background:rgba(183,148,244,.12);color:var(--pp)}
.tag-fw{background:var(--s3);color:var(--t2)}
.act{font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px}
.act-active{background:rgba(72,187,120,.12);color:var(--gn)}
.act-stale{background:rgba(236,201,75,.12);color:var(--yw)}
.act-archived{background:rgba(245,101,101,.12);color:var(--rd)}
.repo-link{color:var(--ac);font-size:12px;text-decoration:none}
.repo-link:hover{text-decoration:underline;color:var(--tl)}
.branch-tag{font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(183,148,244,.12);color:var(--pp);font-weight:500}

/* ===== Insights Page ===== */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.stat{padding:16px 20px}
.stat .sl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:2px}
.stat .sv{font-size:28px;font-weight:700}
.stat .ss{font-size:12px;color:var(--t2);margin-top:2px}
.c1 .sv{color:var(--ac)} .c2 .sv{color:var(--gn)} .c3 .sv{color:var(--og)} .c4 .sv{color:var(--tl)} .c5 .sv{color:var(--pp)}
.bars{display:flex;flex-direction:column;gap:5px}
.br{display:flex;align-items:center;gap:9px;cursor:pointer;padding:2px 0;border-radius:5px;transition:background .12s}
.br:hover{background:rgba(124,138,255,.08)}
.br-l{width:80px;text-align:right;font-size:12px;font-weight:500;flex-shrink:0}
.br-t{flex:1;height:20px;background:var(--s3);border-radius:4px;overflow:hidden}
.br-f{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:10px;font-weight:600;color:#fff;transition:width .4s}
.dw{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.donut{position:relative;width:110px;height:110px;flex-shrink:0}
.donut svg{width:100%;height:100%;transform:rotate(-90deg)}
.dc{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column}
.dc .dv{font-size:20px;font-weight:700}
.dc .dl{font-size:10px;color:var(--t3)}
.leg{display:flex;flex-direction:column;gap:5px}
.li{display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer}
.li:hover{color:var(--ac)}
.ld{width:9px;height:9px;border-radius:3px;flex-shrink:0}
.lc{color:var(--t3);margin-left:3px}

/* Dep Health */
.dptw{border-radius:var(--radius);overflow:hidden}
.dpt{width:100%;border-collapse:collapse}
.dpt thead{background:var(--s2)}
.dpt th{padding:9px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);font-weight:600;border-bottom:1px solid var(--bd)}
.dpt td{padding:8px 14px;font-size:13px;border-bottom:1px solid var(--bd)}
.dpt tr:hover td{background:rgba(124,138,255,.04)}
.dpt tr.clickable{cursor:pointer}
.dn{font-weight:600}
.hl{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap}
.hl-g{background:rgba(72,187,120,.15);color:var(--gn)}
.hl-w{background:rgba(236,201,75,.15);color:var(--yw)}
.hl-b{background:rgba(245,101,101,.15);color:var(--rd)}
.hbar{display:flex;gap:2px;align-items:center}
.hseg{height:14px;border-radius:3px;min-width:4px}
.dx{display:none;background:var(--s2)}
.dx.open{display:table-row}
.dx td{padding:10px 16px}
.vt{display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;margin:2px;background:var(--s3);color:var(--t2)}
.dp{font-size:11px;display:inline-block;padding:2px 7px;background:var(--s3);border-radius:4px;margin:2px;color:var(--t2)}
.dp .dv2{color:var(--tl);margin-left:3px}

.pager{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:14px}
.pager button{background:var(--s1);border:1px solid var(--bd);border-radius:6px;padding:5px 11px;color:var(--t1);font-size:12px;cursor:pointer}
.pager button:hover{border-color:var(--ac)}
.pager button:disabled{opacity:.3;cursor:default}
.pager span{font-size:12px;color:var(--t3)}
.empty{text-align:center;padding:24px;color:var(--t3);font-size:13px}
</style>
</head>
<body>

<header>
  <div class="logo"><span>dev</span>scope</div>
  <nav id="nav">
    <button class="on" onclick="go('env')">Environment</button>
    <button onclick="go('proj')">Projects</button>
    <button onclick="go('insights')">Insights</button>
  </nav>
  <div class="hinfo" id="hinfo"></div>
</header>

<!-- ========== Environment ========== -->
<div class="page vis" id="pageEnv">
  <div class="title">Runtimes</div>
  <div class="env-grid" id="rtGrid"></div>
  <div class="title">Package Managers</div>
  <div class="env-grid" id="pmGrid"></div>
  <div class="title">Version Managers</div>
  <div id="vmSection"></div>
  <div class="install-hint" id="installHint"></div>
</div>

<!-- ========== Projects ========== -->
<div class="page" id="pageProj">
  <div class="toolbar">
    <input class="search" id="q" placeholder="Search projects...">
    <div id="chips"></div>
    <div class="tr">
      <label class="cb-wrap"><input type="checkbox" id="subToggle" onchange="page=1;apply()"><span>Sub-projects</span></label>
      <select class="sel" id="actSel"><option value="all">All activity</option><option value="active">Active</option><option value="stale">Stale</option><option value="archived">Archived</option></select>
      <select class="sel" id="sortSel"><option value="name">Name</option><option value="size">Size</option><option value="activity">Recent</option></select>
    </div>
  </div>
  <div class="proj-head"><span>Project</span><span>Stack</span><span>Repository</span><span>Branch</span><span>Activity</span><span>Size</span></div>
  <div class="proj-list" id="pList"></div>
  <div class="pager" id="pager"></div>
</div>

<!-- ========== Insights ========== -->
<div class="page" id="pageInsights">
  <div class="stat-grid" id="statsRow"></div>
  <div class="title">Tech Stack</div>
  <div class="grid2">
    <div class="card"><h3 style="font-size:13px;color:var(--t2);margin-bottom:12px">Languages</h3><div id="langBars" class="bars"></div></div>
    <div class="card"><h3 style="font-size:13px;color:var(--t2);margin-bottom:12px">Frameworks</h3><div id="fwBars" class="bars"></div></div>
  </div>
  <div class="title">Overview</div>
  <div class="grid3">
    <div class="card"><h3 style="font-size:13px;color:var(--t2);margin-bottom:12px">Package Managers</h3><div class="dw" id="pmDonut"></div></div>
    <div class="card"><h3 style="font-size:13px;color:var(--t2);margin-bottom:12px">Activity</h3><div class="dw" id="actDonut"></div></div>
    <div class="card"><h3 style="font-size:13px;color:var(--t2);margin-bottom:12px">Size</h3><div id="sizeBars" class="bars"></div></div>
  </div>
  <div class="title">Dependency Health</div>
  <div class="card dptw"><table class="dpt"><thead><tr><th>Dependency</th><th>Projects</th><th>Versions</th><th>Health</th><th>Distribution</th></tr></thead><tbody id="depB"></tbody></table></div>
</div>

<script>
const DATA=${d};
const ENV=${e};
const PS=40;
let page=1,filtered=[...DATA],langF='all',searchQ='',sortK='name',actF='all',expanded=null;
const LC={node:'var(--gn)',python:'var(--og)',golang:'var(--bl)',rust:'var(--rd)',java:'var(--pp)'};
const PMC={npm:'var(--rd)',yarn:'var(--bl)',pnpm:'var(--og)',bun:'var(--pk)',cargo:'var(--rd)','go modules':'var(--bl)',none:'var(--t3)'};
const AC={active:'var(--gn)',stale:'var(--yw)',archived:'var(--rd)',unknown:'var(--t3)'};

/* ===== Navigation ===== */
window.go=function(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('vis'));
  document.getElementById('page'+id.charAt(0).toUpperCase()+id.slice(1)).classList.add('vis');
  document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('on',['env','proj','insights'][i]===id));
};

function init(){
  document.getElementById('hinfo').textContent=DATA.length+' projects · '+new Date(DATA[0]?.scannedAt||0).toLocaleDateString();
  renderEnv();
  renderChips();
  apply();
  renderStats();
  renderLangBars();
  renderFwBars();
  renderPmDonut();
  renderActDonut();
  renderSizeBars();
  renderDepHealth();
  document.getElementById('q').addEventListener('input',e=>{searchQ=e.target.value.toLowerCase();page=1;apply()});
  document.getElementById('sortSel').addEventListener('change',e=>{sortK=e.target.value;apply()});
  document.getElementById('actSel').addEventListener('change',e=>{actF=e.target.value;page=1;apply()});
}

/* ===== Environment Page ===== */
function renderEnv(){
  const rtColors={node:'var(--gn)',go:'var(--bl)',python:'var(--og)',rust:'var(--rd)',java:'var(--pp)',ruby:'var(--rd)',php:'var(--pp)',dotnet:'var(--bl)',swift:'var(--og)',dart:'var(--tl)'};
  document.getElementById('rtGrid').innerHTML=(ENV.runtimes||[]).map(r=>{
    const c=r.installed?(rtColors[r.id]||'var(--ac)'):'var(--t3)';
    return '<div class="card env-item"><span class="env-dot" style="background:'+c+'"></span><span class="env-label">'+esc(r.label)+'</span><span class="env-ver">'+(r.installed?esc(r.version):'<span style="color:var(--t3)">—</span>')+'</span></div>';
  }).join('');

  document.getElementById('pmGrid').innerHTML=(ENV.packageManagers||[]).filter(p=>p.installed).map(p=>
    '<div class="card env-item"><span class="env-dot" style="background:var(--ac)"></span><span class="env-label">'+esc(p.label)+'</span><span class="env-ver">'+esc(p.version)+'</span></div>'
  ).join('');

  const vms=ENV.versionManagers||[];
  document.getElementById('vmSection').innerHTML=vms.length
    ?'<div class="env-grid">'+vms.map(v=>'<div class="card env-item"><span class="env-dot" style="background:var(--pp)"></span><span class="env-label">'+esc(v)+'</span></div>').join('')+'</div>'
    :'<div style="color:var(--t3);font-size:13px;padding:8px 0">No version managers detected</div>';

  const missing=(ENV.runtimes||[]).filter(r=>!r.installed);
  if(missing.length){
    document.getElementById('installHint').innerHTML='<strong>'+missing.length+' runtime'+(missing.length>1?'s':'')+' not installed:</strong> '+missing.map(r=>r.label).join(', ')+'<br>Run <code>devscope setup</code> to install them interactively.';
  }else{
    document.getElementById('installHint').innerHTML='All common runtimes are installed. Run <code>devscope setup</code> to install additional tools.';
  }
}

/* ===== Projects Page ===== */
function renderChips(){
  const ls=new Set();DATA.forEach(p=>(p.languages||[]).forEach(l=>ls.add(l)));
  document.getElementById('chips').innerHTML='<button class="chip on" data-l="all" onclick="setL(this)">All</button>'+[...ls].map(l=>'<button class="chip" data-l="'+l+'" onclick="setL(this)">'+l+'</button>').join('');
}
window.setL=function(el){langF=el.dataset.l;document.querySelectorAll('#chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');page=1;apply()};

function apply(){
  const showSub=document.getElementById('subToggle').checked;
  expanded=null;
  filtered=DATA.filter(p=>{
    if(!showSub&&p.isSubProject) return false;
    if(langF!=='all'&&!(p.languages||[]).includes(langF)) return false;
    if(actF!=='all'&&(p.git?.activity||'unknown')!==actF) return false;
    if(searchQ){const h=((p.dirName||'')+' '+(p.name||'')+' '+(p.path||'')+' '+(p.description||'')+' '+(p.frameworks||[]).join(' ')+' '+(p.git?.remote||'')).toLowerCase();if(!h.includes(searchQ)) return false}
    return true;
  });
  filtered.sort((a,b)=>{
    if(sortK==='size') return (b.sizeBytes||0)-(a.sizeBytes||0);
    if(sortK==='activity') return (a.git?.daysSinceCommit??9999)-(b.git?.daysSinceCommit??9999);
    return (a.dirName||a.name||'').localeCompare(b.dirName||b.name||'');
  });
  renderList();renderPager();
}

function renderList(){
  const s=(page-1)*PS;const sl=filtered.slice(s,s+PS);
  const el=document.getElementById('pList');
  el.innerHTML='';
  if(!sl.length){el.innerHTML='<div class="empty">No projects found</div>';return}

  sl.forEach((p,i)=>{
    const idx=s+i;
    const row=document.createElement('div');
    row.className='proj-row'+(expanded===idx?' expanded':'');
    row.onclick=()=>toggle(idx);

    const name=esc(p.dirName||p.name||'—');
    const sub=p.isSubProject?'<span style="font-size:10px;color:var(--t3);margin-left:4px">⊂ '+esc(p.parentName)+'</span>':'';
    const tags=(p.languages||[]).map(l=>'<span class="tag tag-'+l+'">'+l+'</span>').join('')+(p.frameworks||[]).map(f=>'<span class="tag tag-fw">'+f+'</span>').join('');
    const repo=p.git?.remote?'<a href="'+esc(p.git.remote)+'" target="_blank" class="repo-link" onclick="event.stopPropagation()">'+shortRepo(p.git.remote)+'</a>':'<span style="color:var(--t3)">local</span>';
    const branch=p.git?.branch?'<span class="branch-tag">'+esc(p.git.branch)+'</span>':'<span style="color:var(--t3)">—</span>';
    const act=p.git?'<span class="act act-'+p.git.activity+'">'+p.git.activity+'</span>':'<span style="color:var(--t3)">—</span>';

    row.innerHTML='<div><div class="pn">'+name+sub+'</div><div class="pp mono">'+shortP(p.path)+'</div></div><div>'+tags+'</div><div>'+repo+'</div><div>'+branch+'</div><div>'+act+'</div><div style="font-size:12px;color:var(--t2)">'+(p.sizeHuman||'—')+'</div>';
    el.appendChild(row);

    const detail=document.createElement('div');
    detail.className='detail-card'+(expanded===idx?' open':'');
    detail.id='detail-'+idx;
    detail.innerHTML=buildDetail(p);
    el.appendChild(detail);
  });
}

function toggle(idx){
  if(expanded===idx){expanded=null}else{expanded=idx}
  renderList();
}

function buildDetail(p){
  let html='<div class="detail-grid">';
  html+='<div class="detail-section"><h4>General</h4>';
  html+=drow('Path',p.path);
  if(p.description) html+=drow('Description',p.description);
  html+=drow('Languages',(p.languages||[]).join(', '));
  if(p.frameworks) html+=drow('Frameworks',p.frameworks.join(', '));
  html+=drow('Size',p.sizeHuman);
  if(p.packageManager) html+=drow('Pkg Manager',p.packageManager.join(', '));
  html+='</div>';

  html+='<div class="detail-section"><h4>Git</h4>';
  if(p.git){
    html+=drow('Branch',p.git.branch);
    if(p.git.remote) html+=drow('Remote','<a href="'+esc(p.git.remote)+'" target="_blank" class="repo-link">'+esc(p.git.remote)+'</a>');
    html+=drow('Activity',p.git.activity+' ('+p.git.daysSinceCommit+'d ago)');
    html+=drow('Last Commit',p.git.lastCommit?.split('T')[0]||'—');
  }else{
    html+='<div style="color:var(--t3);font-size:13px">No Git info</div>';
  }
  html+='</div>';

  if(p.runtime){
    html+='<div class="detail-section"><h4>Runtime Requirements</h4>';
    for(const [k,v] of Object.entries(p.runtime)) html+=drow(k,v);
    html+='</div>';
  }

  if(p.keyDependencies){
    html+='<div class="detail-section"><h4>Key Dependencies</h4><div class="dep-tags">';
    for(const [dep,ver] of Object.entries(p.keyDependencies)){
      html+='<span class="tag tag-fw">'+esc(dep)+' <span style="color:var(--tl)">'+esc(ver)+'</span></span>';
    }
    html+='</div></div>';
  }

  if(p.versionPinning){
    html+='<div class="detail-section"><h4>Version Pinning</h4>';
    for(const [file,ver] of Object.entries(p.versionPinning)) html+=drow(file,ver);
    html+='</div>';
  }

  html+='</div>';
  return html;
}

function drow(l,v){return '<div class="detail-row"><span class="lbl">'+esc(l)+'</span><span class="val">'+(v||'—')+'</span></div>'}

function renderPager(){
  const t=Math.ceil(filtered.length/PS);const el=document.getElementById('pager');
  if(t<=1){el.innerHTML='<span>'+filtered.length+' project'+(filtered.length!==1?'s':'')+'</span>';return}
  el.innerHTML='<button '+(page<=1?'disabled':'')+' onclick="page--;apply()">‹ Prev</button><span>'+page+' / '+t+' ('+filtered.length+')</span><button '+(page>=t?'disabled':'')+' onclick="page++;apply()">Next ›</button>';
}

/* ===== Insights Page ===== */
function renderStats(){
  const langs=new Set();DATA.forEach(p=>(p.languages||[]).forEach(l=>langs.add(l)));
  const totalSize=DATA.reduce((s,p)=>s+(p.sizeBytes||0),0);
  const active=DATA.filter(p=>p.git?.activity==='active').length;
  const withRt=DATA.filter(p=>p.runtime).length;
  document.getElementById('statsRow').innerHTML=[
    sc('Projects',DATA.length,'','c1'),
    sc('Languages',langs.size,[...langs].join(', '),'c2'),
    sc('Total Size',fmtB(totalSize),'','c3'),
    sc('Active (30d)',active,Math.round(active/DATA.length*100)+'%','c4'),
    sc('With Runtime',withRt,Math.round(withRt/DATA.length*100)+'%','c5'),
  ].join('');
}
function sc(l,v,s,c){return '<div class="card stat '+c+'"><div class="sl">'+l+'</div><div class="sv">'+v+'</div>'+(s?'<div class="ss">'+s+'</div>':'')+'</div>'}

function renderLangBars(){
  const c={};DATA.forEach(p=>(p.languages||[]).forEach(l=>{c[l]=(c[l]||0)+1}));
  const s=Object.entries(c).sort((a,b)=>b[1]-a[1]);const mx=s[0]?.[1]||1;
  document.getElementById('langBars').innerHTML=s.map(([l,n])=>bar(l,n,mx,LC[l]||'var(--ac)')).join('');
}
function renderFwBars(){
  const c={};DATA.forEach(p=>(p.frameworks||[]).forEach(f=>{c[f]=(c[f]||0)+1}));
  const s=Object.entries(c).sort((a,b)=>b[1]-a[1]);const mx=s[0]?.[1]||1;
  document.getElementById('fwBars').innerHTML=s.length?s.map(([f,n])=>bar(f,n,mx,'var(--tl)')).join(''):'<div class="empty">—</div>';
}
function bar(label,n,mx,color){
  return '<div class="br"><span class="br-l">'+label+'</span><div class="br-t"><div class="br-f" style="width:'+Math.max(n/mx*100,3)+'%;background:'+color+'">'+n+'</div></div></div>';
}
function renderSizeBars(){
  const buckets={'< 100 KB':0,'100K–1M':0,'1–10 MB':0,'10–100M':0,'100M–1G':0,'> 1 GB':0};
  DATA.forEach(p=>{const s=p.sizeBytes||0;if(s<102400)buckets['< 100 KB']++;else if(s<1048576)buckets['100K–1M']++;else if(s<10485760)buckets['1–10 MB']++;else if(s<104857600)buckets['10–100M']++;else if(s<1073741824)buckets['100M–1G']++;else buckets['> 1 GB']++});
  const mx=Math.max(...Object.values(buckets),1);
  const cs=['var(--gn)','var(--tl)','var(--bl)','var(--yw)','var(--og)','var(--rd)'];
  let i=0;
  document.getElementById('sizeBars').innerHTML=Object.entries(buckets).map(([l,n])=>'<div class="br"><span class="br-l" style="width:72px">'+l+'</span><div class="br-t"><div class="br-f" style="width:'+Math.max(n/mx*100,3)+'%;background:'+cs[i++]+'">'+n+'</div></div></div>').join('');
}

function renderPmDonut(){
  const c={};DATA.forEach(p=>(p.packageManager||[]).forEach(pm=>{c[pm]=(c[pm]||0)+1}));
  mkDonut('pmDonut',c,PMC);
}
function renderActDonut(){
  const c={active:0,stale:0,archived:0};
  DATA.forEach(p=>{const a=p.git?.activity;if(a&&c[a]!==undefined)c[a]++});
  const unk=DATA.length-c.active-c.stale-c.archived;
  if(unk>0)c.unknown=unk;
  mkDonut('actDonut',c,AC);
}
function mkDonut(id,counts,colors){
  const entries=Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((s,[,v])=>s+v,0);
  if(!total){document.getElementById(id).innerHTML='<div class="empty">—</div>';return}
  const r=48,cx=55,cy=55,circ=2*Math.PI*r;let off=0;
  const arcs=entries.map(([name,count])=>{const pct=count/total;const dash=circ*pct;const gap=circ-dash;const c=colors[name]||'var(--t3)';const a='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="10" stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="-'+off+'"/>';off+=dash;return a});
  const legend=entries.map(([name,count])=>'<div class="li"><span class="ld" style="background:'+(colors[name]||'var(--t3)')+'"></span>'+name+'<span class="lc">'+count+' ('+Math.round(count/total*100)+'%)</span></div>').join('');
  document.getElementById(id).innerHTML='<div class="donut"><svg viewBox="0 0 110 110">'+arcs.join('')+'</svg><div class="dc"><span class="dv">'+total+'</span><span class="dl">total</span></div></div><div class="leg">'+legend+'</div>';
}

function renderDepHealth(){
  const dm={};
  DATA.forEach(r=>{if(!r.keyDependencies)return;for(const[dep,ver]of Object.entries(r.keyDependencies)){if(!dm[dep])dm[dep]={projects:[],versions:{}};dm[dep].projects.push({name:r.dirName||r.name,ver});dm[dep].versions[ver]=(dm[dep].versions[ver]||0)+1}});
  const deps=Object.entries(dm).filter(([,d])=>d.projects.length>=2).sort((a,b)=>b[1].projects.length-a[1].projects.length);
  const body=document.getElementById('depB');body.innerHTML='';
  deps.forEach(([name,d])=>{
    const vc=Object.keys(d.versions).length,pc=d.projects.length;
    const h=vc<=2?'g':vc<=4?'w':'b';
    const ht=vc<=2?'Converged':vc<=4?'Mixed':'Fragmented';
    const vs=Object.entries(d.versions).sort((a,b)=>b[1]-a[1]);
    const mr=document.createElement('tr');mr.className='clickable';
    mr.innerHTML='<td class="dn">'+esc(name)+'</td><td>'+pc+'</td><td>'+vc+'</td><td><span class="hl hl-'+h+'">'+ht+'</span></td><td><div class="hbar">'+vs.map(([v,c])=>'<div class="hseg" style="width:'+Math.max(c/pc*100,6)+'%;background:'+(h==='g'?'var(--gn)':h==='w'?'var(--yw)':'var(--rd)')+'" title="'+esc(v)+': '+c+'"></div>').join('')+'</div></td>';
    const xr=document.createElement('tr');xr.className='dx';
    xr.innerHTML='<td colspan="5"><div style="margin-bottom:6px">'+vs.map(([v,c])=>'<span class="vt">'+esc(v)+' x'+c+'</span>').join('')+'</div><div>'+d.projects.map(p=>'<span class="dp">'+esc(p.name)+'<span class="dv2">'+esc(p.ver)+'</span></span>').join('')+'</div></td>';
    mr.onclick=()=>xr.classList.toggle('open');
    body.appendChild(mr);body.appendChild(xr);
  });
}

/* ===== Helpers ===== */
function shortRepo(url){if(!url)return'';try{const u=url.replace(/^https?:\\/\\//,'');const p=u.split('/');if(p.length>=3)return p.slice(-2).join('/');return u}catch{return url}}
function shortP(p){if(!p)return'';const i=p.indexOf('/Users/');if(i>=0)return'~'+p.slice(p.indexOf('/',i+7));return p}
function fmtB(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';if(b<1073741824)return(b/1048576).toFixed(1)+' MB';return(b/1073741824).toFixed(2)+' GB'}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML}

init();
</script>
</body>
</html>`;
}
