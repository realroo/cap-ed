const {app,BrowserWindow,ipcMain,dialog,Menu,shell}=require('electron');
const path=require('path'),{spawn}=require('child_process');
const FF=require('ffmpeg-static').replace('app.asar','app.asar.unpacked');
let win,ff,errTail='',asr,asrId,outFile;
app.whenReady().then(()=>{Menu.setApplicationMenu(null);
 win=new BrowserWindow({width:1500,height:900,backgroundColor:'#0b0b0d',title:'ClipForge',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:false,autoplayPolicy:'no-user-gesture-required'}});
 win.loadFile(path.join(__dirname,'renderer','index.html'))});
app.on('window-all-closed',()=>app.quit());
const run=args=>new Promise((res,rej)=>{const p=spawn(FF,args),o=[],e=[];p.stdout.on('data',d=>o.push(d));p.stderr.on('data',d=>e.push(d));p.on('error',rej);p.on('close',c=>res({code:c,out:Buffer.concat(o),err:Buffer.concat(e).toString()}))});
const hasAudio=async f=>/Audio:/.test((await run(['-hide_banner','-i',f])).err);
/* captions: Whisper running locally */
ipcMain.handle('transcribe',async(_,file,lang,model)=>{
 const r=await run(['-v','error','-i',file,'-vn','-ac','1','-ar','16000','-f','f32le','-']);
 if(r.code)throw new Error('Could not read audio from this file');
 const pcm=new Float32Array(r.out.buffer.slice(r.out.byteOffset,r.out.byteOffset+r.out.length));
 const {pipeline,env}=await import('@xenova/transformers');env.cacheDir=path.join(app.getPath('userData'),'models');
 if(asrId!==model){asr=await pipeline('automatic-speech-recognition',model,{progress_callback:p=>win.webContents.send('progress',p)});asrId=model}
 const o=await asr(pcm,{language:lang,task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:true});
 return (o.chunks||[]).map(c=>({s:c.timestamp[0],e:c.timestamp[1]??c.timestamp[0]+2,t:c.text.trim()}))});
/* export: frames from the editor canvas are piped into ffmpeg, audio is mixed from the clips */
const tempo=s=>{const a=[];while(s<.5){a.push(.5);s/=.5}a.push(+s.toFixed(4));return a.map(x=>'atempo='+x).join(',')};
ipcMain.handle('export:start',async(_,o)=>{
 const r=await dialog.showSaveDialog(win,{defaultPath:'clipforge.mp4',filters:[{name:'MP4 video',extensions:['mp4']}]});if(r.canceled)return{ok:false};
 outFile=r.filePath;const au=[];for(const a of o.au)if(await hasAudio(a.path))au.push(a);
 const args=['-y','-f','rawvideo','-pix_fmt','rgba','-s',o.W+'x'+o.H,'-r',String(o.FPS),'-i','pipe:0'];au.forEach(a=>args.push('-i',a.path));
 const fc=au.map((a,i)=>`[${i+1}:a]atrim=start=${a.off}:end=${a.off+a.dur*a.speed},asetpts=PTS-STARTPTS,${tempo(a.speed)},volume=${a.vol},adelay=${Math.round(a.start*1000)}:all=1[a${i}]`);
 if(au.length){fc.push(au.map((_,i)=>`[a${i}]`).join('')+(au.length>1?`amix=inputs=${au.length}:normalize=0[aout]`:'anull[aout]'));args.push('-filter_complex',fc.join(';'),'-map','0:v','-map','[aout]','-c:a','aac','-b:a','192k')}else args.push('-an');
 args.push('-t',String(o.dur),'-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','18','-movflags','+faststart',outFile);
 errTail='';ff=spawn(FF,args);ff.stderr.on('data',d=>errTail=(errTail+d).slice(-600));ff.stdin.on('error',()=>{});return{ok:true}});
ipcMain.handle('export:frame',async(_,b)=>{const buf=Buffer.from(b.buffer,b.byteOffset,b.byteLength);if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))});
ipcMain.handle('export:finish',async()=>{ff.stdin.end();const c=await new Promise(r=>ff.on('close',r));if(c===0)shell.showItemInFolder(outFile);return{ok:c===0,file:outFile,err:errTail}});
