import React,{useEffect,useRef,useState} from 'react';
import {validateImageURL} from './image-url.js';

export function ImageURLForm({onUse,onClose,initial='',portraitOnly=false}) {
  const [input,setInput]=useState(initial),[candidate,setCandidate]=useState(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const request=useRef(0),objectURL=useRef('');
  useEffect(()=>()=>{request.current++;if(objectURL.current)URL.revokeObjectURL(objectURL.current);},[]);
  function clear(){if(objectURL.current)URL.revokeObjectURL(objectURL.current);objectURL.current='';setPreview('');setCandidate(null);setError('');}
  async function test(){
    const id=++request.current;clear();setBusy(true);
    try{
      const result=await validateImageURL(input,{allowDisplayOnly:true});
      if(id!==request.current)return;
      if(result.blob){objectURL.current=URL.createObjectURL(result.blob);setPreview(objectURL.current);}else setPreview(result.url);setCandidate({...result,blob:undefined});
    }catch(error){if(id===request.current)setError(error.message);}
    finally{if(id===request.current)setBusy(false);}
  }
  async function apply(){const id=request.current;setBusy(true);setError('');try{await onUse(candidate.url);}catch(error){if(id===request.current)setError(error.message);}finally{if(id===request.current)setBusy(false);}}
  return <div className="ts-url-form">
    <p>Cole uma URL pública. O original será usado por endereço, sem criar uma cópia no Foundry.</p>
    <label className="ts-sheet-field"><span>URL da imagem</span><input autoFocus aria-label="URL da imagem" type="url" maxLength={10000} value={input} disabled={busy} placeholder="https://…" onChange={e=>{request.current++;clear();setInput(e.target.value);}}/></label>
    <p className="ts-sheet-muted">Links diretos funcionam em qualquer hospedagem que permita acesso externo. Links do Google com imgurl e páginas públicas com imagem de prévia são reconhecidos quando acessíveis. Pins, buscas e mensagens podem exigir o endereço direto da imagem.</p>
    {preview && <div className="ts-url-preview"><img crossOrigin={candidate.editable?'anonymous':undefined} referrerPolicy="no-referrer" src={preview} alt="Prévia da imagem por URL"/><p>{candidate.width} × {candidate.height} px • {candidate.editable?'Disponível para edição':'Somente visualização na ficha'}</p><small>{candidate.url}</small></div>}
    {candidate?.warnings.map(w=><p className="ts-warning" key={w}>{w}</p>)}
    {error && <p className="ts-warning" role="alert">{error}</p>}
    <div className="ts-dialog-actions"><button className="ts-button" disabled={busy} onClick={onClose}>Voltar</button><button className="ts-button" disabled={busy||!input.trim()} onClick={test}>{busy?'Validando…':'Testar URL'}</button><button className="ts-button ts-primary" disabled={busy||!candidate||!portraitOnly&&!candidate.editable} onClick={apply}>Usar esta URL</button></div>
  </div>;
}
