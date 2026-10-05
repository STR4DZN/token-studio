import {createView, clone} from './engine.js';

export function replaceArtwork(project, source, {both=true, animated=false}={}) {
  const next=clone(project);
  for (const key of both ? ['portrait','token'] : [next.active]) {
    const previous=next.views[key];
    const view=createView(source,key==='token');
    // Keep the selected token border, but never copy it into the portrait.
    if (key==='token') for (const field of ['frame','frameSrc','color','mask','aperture','shape','frameRatio']) {
      if (previous[field] !== undefined) view[field]=previous[field];
    }
    next.views[key]={...view,animated,displayOnly:false};
  }
  next.updatedAt=Date.now();
  return next;
}
