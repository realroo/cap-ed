/* Desktop overrides: local Whisper captions and MP4 export through ffmpeg */
const WHISPER='Xenova/whisper-small',WL={English:'english',Hindi:'hindi',Hinglish:'hindi'};
window.api.onProgress(p=>{if(p&&p.status=='progress')toast('Downloading speech model '+Math.round(p.progress)+'%')});
async function autoCap(){
 const src=clips.filter(c=>c.m&&c.m.path&&(c.type=='video'||c.type=='audio')),pick=cur()&&src.includes(cur())?[cur()]:src;
 if(!pick.length)return toast('Add a video or audio clip first');
 H();capN=0;toast('Transcribing on this computer. The first run downloads the model.');const cache={};
 for(const c of pick){
  try{const segs=cache[c.m.path]||(cache[c.m.path]=await window.api.transcribe(c.m.path,WL[cl],WHISPER));
   for(const g of segs){if(!g.t)continue;const s=c.start+(g.s-c.off)/c.speed,e=c.start+(g.e-c.off)/c.speed;if(e<=c.start||s>=c.start+c.dur)continue;
    const S=Math.max(s,c.start),E=Math.max(S+.8,Math.min(e,c.start+c.dur));addSegs(LANGS[cl][1]?roman(g.t):g.t,S,E)}}
  catch(err){return toast('Captions failed: '+err.message)}}
 refresh();toast(capN+' captions added. Check them in the list.')}
async function exportV(){
 if(!total())return toast('Add something to the timeline first');
 setPlaying(false);const W=cv.width,HH=cv.height,FPS=30,dur=total();
 const au=clips.filter(c=>c.m&&c.m.path&&(c.type=='audio'||c.type=='video')&&!TK[c.track].m).map(c=>({path:c.m.path,start:c.start,dur:c.dur,off:c.off,speed:c.speed,vol:c.vol}));
 const r=await window.api.exportStart({W,H:HH,FPS,dur,au});if(!r.ok)return;
 exporting=true;showOv('<h4>Exporting MP4</h4><p class="mu">Rendering frame by frame. Keep the app open.</p><div class="pg"><i id="pgi"></i></div>');
 const close=`<button onclick="$('ov').classList.remove('on')">Close</button>`;
 try{const n=Math.ceil(dur*FPS);
  for(let i=0;i<n;i++){t=i/FPS;
   for(const c of clips){if(c.type!='video'||t<c.start||t>=c.start+c.dur)continue;c.el.currentTime=c.off+(t-c.start)*c.speed;if(c.el.seeking)await new Promise(q=>c.el.addEventListener('seeked',q,{once:true}))}
   draw();const d=ctx.getImageData(0,0,W,HH).data;await window.api.exportFrame(new Uint8Array(d.buffer))}
  const f=await window.api.exportFinish();exporting=false;
  showOv(f.ok?`<h4>Saved</h4><p class="mu">${esc(f.file)}</p>${close}`:`<h4>Export failed</h4><p class="mu">${esc(f.err)}</p>${close}`)}
 catch(e){exporting=false;showOv(`<h4>Export failed</h4><p class="mu">${esc(e.message)}</p>${close}`)}
 t=0}
