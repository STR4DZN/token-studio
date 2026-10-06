import {createView, createProject, validateProject, clone} from './engine.js';

export function builtinFramePatch(view,frame) {
  return {frame,ringMode:'static',mask:'circle',shape:frame==='none'?view.shape:'circle',
    ...(frame!=='none'&&['none','custom'].includes(view.frame)?{aperture:createView('').aperture}:{})};
}

export function initializeArtwork(host) {
  const next=host.project?clone(validateProject(host.project)):createProject(host.source);
  if (!host.project && host.tokenSource) {
    // A native token texture is already a composed image. Opening it must not
    // wrap it in another silver frame, even when it equals the portrait path.
    next.views.token={...createView(host.tokenSource),frame:'none',shape:'rectangle',aperture:1,fit:'contain'};
  }
  if(host.nativeRing && next.views.token.frame==='none' && (!host.project || next.views.token.ringMode==null || next.views.token.ringMode==='native')) {
    next.views.token.shape='circle';next.views.token.aperture=1;next.views.token.ringMode='native';
    if(!host.project&&host.nativeSubject){next.views.token.sourceCrop='nativeRing';next.views.token.fit='cover';}
  }
  for(const key of ['portrait','token'])next.views[key].animated=/\.gif(?:[?#]|$)/i.test(next.views[key].src);
  if(host.portraitEditable===false){next.views.portrait.displayOnly=true;if(!host.tokenSource)next.views.token.displayOnly=true;}
  return next;
}

export function replaceArtwork(project, source, {both=true, animated=false}={}) {
  const next=clone(project);
  for (const key of both ? ['portrait','token'] : [next.active]) {
    const previous=next.views[key];
    const view=createView(source,key==='token');
    // Keep the selected token border, but never copy it into the portrait.
    if (key==='token') for (const field of ['frame','frameSrc','color','mask','aperture','shape','frameRatio','ringMode']) {
      if (previous[field] !== undefined) view[field]=previous[field];
    }
    next.views[key]={...view,animated,displayOnly:false};
  }
  next.updatedAt=Date.now();
  return next;
}
