const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('api',{
 pathOf:f=>webUtils.getPathForFile(f),
 transcribe:(p,lang,model)=>ipcRenderer.invoke('transcribe',p,lang,model),
 exportStart:o=>ipcRenderer.invoke('export:start',o),
 exportFrame:b=>ipcRenderer.invoke('export:frame',b),
 exportFinish:()=>ipcRenderer.invoke('export:finish'),
 onProgress:cb=>ipcRenderer.on('progress',(_,v)=>cb(v))});
