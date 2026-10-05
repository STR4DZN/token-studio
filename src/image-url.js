import {downloadPortrait} from './compcon.js';

export function imageURL(input,depth=0) {
  if(depth>4 || String(input).length>10000)throw new Error('O endereço possui redirecionamentos demais ou é muito longo. Copie o link direto da imagem.');
  let url;
  try {url=new URL(String(input).trim());}catch{throw new Error('Cole um endereço completo HTTPS da imagem.');}
  if(url.protocol!=='https:' || url.username || url.password)throw new Error('Use uma URL HTTPS pública, sem usuário ou senha.');
  if(/^(localhost|.*\.localhost|127\..*|0\.0\.0\.0|\[::1\])$/i.test(url.hostname))throw new Error('Use uma imagem hospedada em um endereço público.');
  if(/(^|\.)google\.[a-z.]+$/i.test(url.hostname)){
    const original=url.searchParams.get('imgurl') || (url.pathname==='/url'?url.searchParams.get('url')||url.searchParams.get('q'):null);
    if(original)return imageURL(original,depth+1);
  }
  url.hash='';return url.href;
}
export function imageURLWarnings(source,now=Date.now()) {
  const url=new URL(source), expiry=url.searchParams.get('ex');
  if(/(^|\.)discord(?:app)?\.(com|net)$/i.test(url.hostname) && expiry && /^[0-9a-f]+$/i.test(expiry)){
    const date=parseInt(expiry,16)*1000;
    if(date<=now)throw new Error('O link de anexo do Discord expirou. Copie um endereço atualizado ou use uma hospedagem permanente.');
    return ['Este anexo do Discord tem um link temporário e pode deixar de carregar após a expiração.'];
  }
  return [];
}
export async function resolveImageURL(input,{fetcher=fetch,parseHTML,now=Date.now()}={}) {
  let source=imageURL(input), warnings=imageURLWarnings(source,now);
  const request=async url=>{
    try{return await fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});}
    catch{throw Object.assign(new Error('O endereço não permite acesso ao editor ou está indisponível. Use o link direto da imagem em uma hospedagem que permita acesso externo.'),{code:'IMAGE_ACCESS',source:url});}
  };
  let response=await request(source);
  if(!response.ok)throw new Error(`A imagem respondeu com erro ${response.status}. Confira o acesso e a validade do link.`);
  if(Number(response.headers.get('content-length'))>30*1024*1024)throw new Error('A imagem excede 30 MB.');
  if((response.headers.get('content-type')||'').includes('text/html')){
    const html=await response.text();
    if(html.length>2*1024*1024)throw new Error('O link abre uma página muito grande. Copie o endereço direto da imagem.');
    const candidate=parseHTML?.(html) || (typeof DOMParser!=='undefined'?new DOMParser().parseFromString(html,'text/html').querySelector('meta[property="og:image"],meta[name="twitter:image"],meta[property="twitter:image"]')?.content:null);
    if(!candidate)throw new Error('O link abre uma página, não uma imagem disponível. Copie o endereço da imagem; links de busca, pins e mensagens podem exigir isso.');
    source=imageURL(new URL(candidate,response.url||source).href);warnings=imageURLWarnings(source,now);
    response=await request(source);
  }
  const blob=await downloadPortrait(source,{fetcher:async()=>response});
  return {url:source,blob,warnings};
}
export async function decodeImage(blob) {
  const source=URL.createObjectURL(blob);
  try{return await new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>image.naturalWidth*image.naturalHeight>64_000_000?reject(new Error('Imagem maior que 64 megapixels. Use uma versão menor.')):resolve({width:image.naturalWidth,height:image.naturalHeight});
    image.onerror=()=>reject(new Error('O endereço retornou uma imagem que não pôde ser decodificada.'));image.src=source;
  });}finally{URL.revokeObjectURL(source);}
}
export async function probeURLImage(source,{editable=true}={}) {
  return new Promise((resolve,reject)=>{
    const image=new Image();if(editable)image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';
    const timer=setTimeout(()=>{image.onload=null;image.onerror=null;image.src='';reject(new Error('A imagem não respondeu. Confira a URL e o acesso externo.'));},20000);
    image.onload=()=>{
      clearTimeout(timer);
      try{
        if(!image.naturalWidth || image.naturalWidth*image.naturalHeight>64_000_000)throw new Error('Imagem vazia ou maior que 64 megapixels. Use uma versão menor.');
        if(editable){const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const context=canvas.getContext('2d');context.drawImage(image,0,0,1,1);context.getImageData(0,0,1,1);}
        resolve({width:image.naturalWidth,height:image.naturalHeight});
      }catch{reject(new Error('A imagem não permite edição/exportação pelo navegador ou excede o limite de tamanho. Use outra hospedagem.'));}
    };
    image.onerror=()=>{clearTimeout(timer);reject(new Error('Não foi possível carregar a imagem para edição. O endereço pode abrir uma página, ter expirado ou bloquear acesso externo.'));};image.src=source;
  });
}
export async function validateImageURL(input,options={}) {
  try{const result=await resolveImageURL(input,options);return {...result,editable:true,...await (options.decode||decodeImage)(result.blob)};}
  catch(error){
    if(error.code!=='IMAGE_ACCESS')throw error;
    // HTMLImageElement still enforces CORS. Reading a pixel verifies export permission.
    const source=imageURL(error.source||input), warnings=imageURLWarnings(source,options.now);
    try{const size=await (options.probe||probeURLImage)(source);return {url:source,blob:null,warnings,editable:true,...size};}
    catch(error){
      if(!options.allowDisplayOnly)throw error;
      const size=await (options.probe||probeURLImage)(source,{editable:false});
      return {url:source,blob:null,editable:false,warnings:[...warnings,'Esta imagem permite visualização na ficha, mas a hospedagem bloqueia edição/exportação e uso como textura do token. A arte atual do token será preservada.'],...size};
    }
  }
}
