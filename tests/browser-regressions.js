import {createView,createCanvas,loadResources,enclosedMask,maskAperture,renderView,renderStage,outputSize} from '../src/engine.js';
import catalog from '../src/frame-catalog.json';
const report=document.querySelector('#results'),button=document.querySelector('#run');
const check=(condition,message)=>{if(!condition)throw Error(message);};
const alpha=(c,x,y)=>c.getContext('2d').getImageData(x,y,1,1).data[3];
button.onclick=async()=>{
 button.disabled=true;let passed=0;const failures=[];document.querySelector('#proof').replaceChildren();
 const test=async(name,fn)=>{try{await fn();passed++;}catch(error){failures.push(name+': '+error.message);}report.textContent=`${passed} testes passaram; ${failures.length} falhas\n${failures.join('\n')}`;};
 for(const item of catalog.filter(f=>f.kind==='frame'))await test('Moldura '+item.id,async()=>{
  const v={...createView('/assets/pilot.png'),frame:'custom',frameSrc:'/assets/'+item.file,shape:item.shape};
  const r=await loadResources(v,'/assets/');check(r.frame.width===item.width,'Dimensões originais incorretas');const mask=enclosedMask(r.frame);if(mask){v.mask='auto';v.aperture=maskAperture(mask);}
  const output=renderView(v,r,128);check(output.getContext('2d').getImageData(0,0,128,128).data.some((value,i)=>i%4===3&&value),'Saída vazia');
  const stage=createCanvas(176,176);const layout=renderStage(stage,v,r,outputSize(v,128));check(layout.left===24&&layout.top===24&&layout.scale===1,'Palco cortou a área de saída');
  // Compare only opaque pixels: the stage checkerboard intentionally shows transparency.
  const a=output.getContext('2d').getImageData(0,0,128,128).data,b=stage.getContext('2d').getImageData(24,24,128,128).data;
  let count=0;for(let i=0;i<a.length;i+=4)if(a[i+3]===255){for(let c=0;c<3;c++)check(Math.abs(a[i+c]-b[i+c])<=1,'Palco diverge do PNG na composição da borda');count++;}check(count>0,'Sem pixels opacos para comparar');
 });
 await test('Recorte circular impede arte fora da abertura e preserva borda',async()=>{
  const view=createView('/assets/pilot.png'),resources=await loadResources(view,'/assets/'),out=renderView(view,resources,256);check(alpha(out,0,0)===0,'Canto opaco');check(alpha(out,128,128)===255,'Centro vazio');document.querySelector('#proof').append(out);
 });
 await test('Retrato alto e largo preserva os quatro cantos no formato quadrado',async()=>{
  for(const [w,h]of [[80,400],[400,80]]){const image=createCanvas(w,h),c=image.getContext('2d');c.fillStyle='#ff0000';c.fillRect(0,0,w,h);const view=createView('fixture',false),out=renderView(view,{image,dimensions:{width:w,height:h},frame:null},256);const scale=Math.min(256/w,256/h),left=(256-w*scale)/2,top=(256-h*scale)/2;for(const [x,y]of [[left+1,top+1],[left+w*scale-2,top+1],[left+1,top+h*scale-2],[left+w*scale-2,top+h*scale-2]])check(alpha(out,Math.round(x),Math.round(y))===255,'Canto da origem cortado');}
 });
 await test('Sujeito nativo não ultrapassa círculo central de dois terços',async()=>{
  const image=createCanvas(300,500),c=image.getContext('2d');c.fillStyle='#ff00ff';c.fillRect(0,0,300,500);const view={...createView('fixture'),frame:'none',shape:'rectangle',aperture:1};const out=renderView(view,{image,dimensions:{width:300,height:500},frame:null},300,{nativeRing:true}),data=out.getContext('2d').getImageData(0,0,300,300).data;for(let y=0;y<300;y++)for(let x=0;x<300;x++)if(Math.hypot(x+.5-150,y+.5-150)>101)check(data[(y*300+x)*4+3]===0,'Pixels fora do círculo nativo');document.querySelector('#proof').append(out);
 });
 await test('Reabrir um sujeito nativo pronto não aplica o padding duas vezes',async()=>{
  const image=createCanvas(300,300),c=image.getContext('2d');c.fillStyle='#ffff00';c.fillRect(0,0,300,300);const view={...createView('fixture'),frame:'none',shape:'circle',aperture:1};const first=renderView(view,{image,dimensions:{width:300,height:300},frame:null},300,{nativeRing:true});
  const reopening={...view,src:first.toDataURL(),sourceCrop:'nativeRing',fit:'cover'},r=await loadResources(reopening,'/assets/'),second=renderView(reopening,r,300,{nativeRing:true});
  check(alpha(second,150,55)>200,'Sujeito encolheu ao reabrir');check(alpha(second,150,45)===0,'Padding de anel perdido');
 });
 report.textContent=`CONCLUÍDO: ${passed} testes passaram; ${failures.length} falhas\n${failures.join('\n')}`;button.disabled=false;
};
