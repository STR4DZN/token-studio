import {loadResources} from './engine.js';
import {imageURL,probeURLImage} from './image-url.js';

// Existing native actors may have a remote portrait with no Token Studio flags.
// A source that can be displayed but blocks CORS must not become a blank editor.
export async function loadEditorResources(view, assetsBase, {load=loadResources,probe=probeURLImage}={}) {
  try { return await load(view, assetsBase); }
  catch(error) {
    if (error.code !== 'IMAGE_LOAD' || error.source !== view.src || !view.src.startsWith('https:')) throw error;
    const source = imageURL(view.src);
    await probe(source, {editable:false});
    return {image:null,frame:null,dimensions:null,displayOnly:true};
  }
}
