"""Index supplied raster assets; originals are copied byte-for-byte."""
from pathlib import Path
from PIL import Image, ImageOps
from collections import deque, Counter
import hashlib, json, shutil, sys

source = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
dest = root / 'public/assets/frames'
(dest/'thumbs').mkdir(parents=True, exist_ok=True)
items=[]
for file in sorted(source.rglob('*')):
    if not file.is_file() or file.suffix.lower() not in ['.png','.webp']: continue
    original=Image.open(file).convert('RGBA')
    small=original.copy(); small.thumbnail((192,192))
    w,h=small.size; alpha=small.getchannel('A'); seed=(w//2,h//2)
    opening=set(); pending=deque([seed])
    if alpha.getpixel(seed)<40:
        while pending:
            x,y=pending.popleft()
            if (x,y) in opening or not 0<=x<w or not 0<=y<h or alpha.getpixel((x,y))>=250: continue
            opening.add((x,y)); pending.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
    closed=bool(opening) and all(x not in [0,w-1] and y not in [0,h-1] for x,y in opening)
    support = alpha.getpixel(seed)>=40 or 'MASK' in file.name.upper()
    frame_id=hashlib.sha1(file.name.encode()).hexdigest()[:12]
    filename=frame_id+file.suffix.lower(); shutil.copyfile(file,dest/filename)
    thumb=ImageOps.contain(original,(160,160));thumb.save(dest/'thumbs'/f'{frame_id}.webp',quality=85)
    author=file.stem.split('_')[0]
    title=file.stem[len(author)+1:].replace('_',' ').replace('frame-','').replace('token ','')
    items.append(dict(id=frame_id,name=title,author=author,original=file.name,file=f'frames/{filename}',thumb=f'frames/thumbs/{frame_id}.webp',width=original.width,height=original.height,kind='support' if support else 'frame',closed=closed,shape='rectangle' if 'Square' in file.name or 'Rectangle' in file.name else 'circle'))
(root/'src/frame-catalog.json').write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')))
(dest/'credits.json').write_text(json.dumps({'source':'token_frames.rar — fornecido pelo usuário','originals_unchanged':True,'items':items},ensure_ascii=False,indent=2))
print(json.dumps({'total':len(items),'kinds':dict(Counter(x['kind'] for x in items)),'closed':sum(x['closed'] for x in items)},ensure_ascii=False))
