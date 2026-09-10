const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const tools = [
  {id:"editor", name:"Markdown Editor", category:"EDITOR", desc:"Write plain text and preview lightweight Markdown."},
  {id:"json", name:"JSON Formatter", category:"DEVELOPMENT", desc:"Validate, format, minify and copy JSON."},
  {id:"diff", name:"Text Diff", category:"DEVELOPMENT", desc:"Compare two pieces of text line by line."},
  {id:"regex", name:"Regex Tester", category:"DEVELOPMENT", desc:"Test JavaScript regular expressions locally."},
  {id:"encode", name:"Encoder", category:"CONVERT", desc:"Base64 and URL encode or decode text."},
  {id:"text", name:"Text Toolkit", category:"TEXT", desc:"Count, inspect and transform text."},
  {id:"snippets", name:"Snippets", category:"WORKFLOW", desc:"Keep reusable pieces of text in local storage."}
];

let active = localStorage.getItem("uf-active") || "editor";
let state = { autosaveTimer:null };

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function markdown(s){
  let x=escapeHTML(s);
  x=x.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>");
  x=x.replace(/```([\s\S]*?)```/g,"<pre>$1</pre>").replace(/`([^`]+)`/g,"<code>$1</code>");
  x=x.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>");
  x=x.replace(/^\- (.*)$/gm,"• $1").replace(/\n{2,}/g,"</p><p>").replace(/\n/g,"<br>");
  return "<p>"+x+"</p>";
}
function setStatus(msg="Saved locally"){
  $("#saveStatus").textContent=msg;
  $("#saveDot").style.background=msg==="Saving…"?"#d28a18":"#36a269";
}
function saveAutosave(){
  if(active!=="editor") return;
  const editor=$("#editor");
  if(editor) localStorage.setItem("uf-document",editor.value);
  setStatus();
}
function scheduleSave(){
  setStatus("Saving…");
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer=setTimeout(saveAutosave,400);
}
function download(name,text){
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function renderNav(filter=""){
  const nav=$("#toolList"); nav.innerHTML="";
  const groups={};
  tools.filter(t=>t.name.toLowerCase().includes(filter.toLowerCase())||t.category.toLowerCase().includes(filter.toLowerCase()))
    .forEach(t=>(groups[t.category]??=[]).push(t));
  Object.entries(groups).forEach(([cat,list])=>{
    const g=document.createElement("div");g.className="nav-group";g.textContent=cat;nav.appendChild(g);
    list.forEach(t=>{
      const b=document.createElement("button");b.className="nav-item"+(t.id===active?" active":"");b.textContent=t.name;
      b.onclick=()=>activate(t.id);nav.appendChild(b);
    });
  });
}

function activate(id){
  active=id;localStorage.setItem("uf-active",id);renderNav($("#toolSearch").value);renderTool();
}

function cloneTemplate(id){
  const tpl=$("#"+id+"Template");
  $("#toolPanel").innerHTML="";$("#toolPanel").appendChild(tpl.content.cloneNode(true));
}

function renderTool(){
  const t=tools.find(x=>x.id===active)||tools[0];
  $("#toolCategory").textContent=t.category;$("#toolTitle").textContent=t.name;$("#toolDescription").textContent=t.desc;
  $("#toolActions").innerHTML="";
  if(active==="editor"){
    cloneTemplate("editorTemplate");
    const ed=$("#editor");ed.value=localStorage.getItem("uf-document")||"# ForgePad\n\nStart writing here.\n\n**Everything stays local.**";
    const prev=$("#markdownPreview");
    const update=()=>{prev.innerHTML=markdown(ed.value);scheduleSave()};
    ed.addEventListener("input",update);update();
  } else if(active==="json"){ cloneTemplate("jsonTemplate"); setupJSON(); }
  else if(active==="diff"){ cloneTemplate("diffTemplate"); setupDiff(); }
  else if(active==="regex"){ cloneTemplate("regexTemplate"); setupRegex(); }
  else if(active==="encode"){ cloneTemplate("encodeTemplate"); setupEncode(); }
  else if(active==="text"){ cloneTemplate("textTemplate"); setupText(); }
  else if(active==="snippets"){ cloneTemplate("snippetsTemplate"); setupSnippets(); }
}

function setupJSON(){
  const input=$("#jsonInput"),out=$("#jsonOutput");
  const run=()=>{
    try{const obj=JSON.parse(input.value);out.textContent=JSON.stringify(obj,null,2)}
    catch(e){out.textContent="Invalid JSON: "+e.message}
  };
  $("#jsonFormat").onclick=run;
  $("#jsonMinify").onclick=()=>{try{out.textContent=JSON.stringify(JSON.parse(input.value))}catch(e){out.textContent="Invalid JSON: "+e.message}};
  $("#jsonCopy").onclick=()=>navigator.clipboard?.writeText(out.textContent);
  input.value='{\n  "name": "ForgePad",\n  "local": true\n}';run();
}

function setupDiff(){
  $("#diffRun").onclick=()=>{
    const a=$("#diffA").value.split("\n"),b=$("#diffB").value.split("\n");
    const n=Math.max(a.length,b.length),out=[];
    for(let i=0;i<n;i++){
      if(a[i]===b[i]) out.push("  "+escapeHTML(a[i]??""));
      else {if(a[i]!==undefined)out.push('<span class="diff-del">- '+escapeHTML(a[i])+"</span>");if(b[i]!==undefined)out.push('<span class="diff-add">+ '+escapeHTML(b[i])+"</span>");}
    }
    $("#diffOutput").innerHTML=out.join("\n")||"No differences.";
  };
}

function setupRegex(){
  $("#regexRun").onclick=()=>{
    const pattern=$("#regexPattern").value,flags=$("#regexFlags").value,text=$("#regexText").value;
    try{
      const matches=[...text.matchAll(new RegExp(pattern,flags.includes("g")?flags:flags+"g"))];
      $("#regexOutput").innerHTML=`<b>${matches.length}</b> match(es)<br><br>`+
        (matches.length?matches.map((m,i)=>`${i+1}. <code>${escapeHTML(m[0])}</code> at index ${m.index}`).join("<br>"):"No matches.");
    }catch(e){$("#regexOutput").textContent="Regex error: "+e.message}
  };
}

function setupEncode(){
  $("#encodeInput").value="ForgePad";
  $$(["[data-encode]"]).forEach(()=>{});
  $$('[data-encode]').forEach(b=>b.onclick=()=>{
    const v=$("#encodeInput").value;
    try{
      const op=b.dataset.encode;
      if(op==="b64e")$("#encodeOutput").value=btoa(unescape(encodeURIComponent(v)));
      if(op==="b64d")$("#encodeOutput").value=decodeURIComponent(escape(atob(v)));
      if(op==="urle")$("#encodeOutput").value=encodeURIComponent(v);
      if(op==="urld")$("#encodeOutput").value=decodeURIComponent(v);
    }catch(e){$("#encodeOutput").value="Error: "+e.message}
  });
}

function setupText(){
  const input=$("#textInput"),stats=$("#textStats");
  input.value="";
  const update=()=>{
    const v=input.value,words=v.trim()?v.trim().split(/\s+/).length:0;
    stats.innerHTML=[
      ["Characters",v.length],["Words",words],["Lines",v? v.split("\n").length:0],["Bytes",new TextEncoder().encode(v).length]
    ].map(x=>`<div class="stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
  };
  input.oninput=update;update();
  $$('[data-case]').forEach(b=>b.onclick=()=>{
    const v=input.value,op=b.dataset.case;
    if(op==="upper")input.value=v.toUpperCase();
    if(op==="lower")input.value=v.toLowerCase();
    if(op==="title")input.value=v.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    if(op==="sentence")input.value=v.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g,c=>c.toUpperCase());
    if(op==="trim")input.value=v.split("\n").map(x=>x.trim()).join("\n");
    update();
  });
}

function setupSnippets(){
  const list=$("#snippetList");
  const refresh=()=>{
    const data=JSON.parse(localStorage.getItem("uf-snippets")||"[]");
    list.innerHTML=data.length?data.map((x,i)=>`<div class="snippet"><div class="snippet-head"><b>${escapeHTML(x.name)}</b><button class="button secondary" data-del="${i}">Delete</button></div><pre>${escapeHTML(x.body)}</pre><button class="button secondary" data-use="${i}">Load into editor</button></div>`).join(""):'<div class="empty">No snippets yet.</div>';
    $$('[data-del]').forEach(b=>b.onclick=()=>{data.splice(+b.dataset.del,1);localStorage.setItem("uf-snippets",JSON.stringify(data));refresh()});
    $$('[data-use]').forEach(b=>b.onclick=()=>{localStorage.setItem("uf-document",data[+b.dataset.use].body);activate("editor")});
  };
  $("#saveSnippet").onclick=()=>{
    const name=$("#snippetName").value.trim()||"Untitled",body=$("#snippetBody").value;
    const data=JSON.parse(localStorage.getItem("uf-snippets")||"[]");data.unshift({name,body});
    localStorage.setItem("uf-snippets",JSON.stringify(data));$("#snippetName").value="";$("#snippetBody").value="";refresh();
  };
  refresh();
}

$("#toolSearch").addEventListener("input",e=>renderNav(e.target.value));
$("#newDoc").onclick=()=>{localStorage.removeItem("uf-document");activate("editor")};
$("#openFile").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{localStorage.setItem("uf-document",r.result);activate("editor")};r.readAsText(f);
};
$("#downloadFile").onclick=()=>{
  if(active==="editor")download("document.md",$("#editor")?.value||"");
  else download(`forgepad-${active}.txt`,$("#toolPanel").innerText);
};
document.addEventListener("keydown",e=>{
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==="s"){e.preventDefault();$("#downloadFile").click()}
  if(mod&&e.key==="Enter"){e.preventDefault();document.querySelector(".tool-actions button")?.click();document.querySelector(".tool-panel .primary")?.click()}
  if(mod&&e.key.toLowerCase()==="k"){e.preventDefault();$("#toolSearch").focus()}
  if(mod&&e.shiftKey&&e.key.toLowerCase()==="s"){
    e.preventDefault();
    if(active==="editor"){activate("snippets");setTimeout(()=>{$("#snippetBody").value=localStorage.getItem("uf-document")||"";$("#snippetName").focus()},50)}
  }
});
renderNav();renderTool();
