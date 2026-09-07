// Standalone eSpeak worker; upstream engine is GPL-licensed and fetched from
// this pinned upstream release. It is not part of Mira's source distribution.
// Source/license: https://github.com/kripken/speak.js
importScripts('https://cdn.jsdelivr.net/gh/kripken/speak.js@9c6f642f7d78bab51d16b2e8b79cdf205643ec35/speakGenerator.js');
onmessage=({data})=>{try{const wav=new Uint8Array(generateSpeech(data.text,{pitch:62,speed:165,amplitude:90}));postMessage({id:data.id,wav},[wav.buffer]);}catch(e){postMessage({id:data.id,error:e.message});}};
