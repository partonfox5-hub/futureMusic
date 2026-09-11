import('./js/app.js').catch(error=>{
  console.error(error);
  const status=document.getElementById('status');
  status.textContent=/WebGL|context/i.test(error.message)?'3D graphics could not start. Enable hardware acceleration, then reload in Chrome or Quest Browser.':'The game could not load. Upload all included files and reload. '+error.message;
  for(const id of ['enter-vr','play-desktop'])document.getElementById(id).disabled=true;
});
