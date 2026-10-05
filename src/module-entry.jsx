import React from 'react';
import { createRoot } from 'react-dom/client';
import { Suite } from './Suite.jsx';
import './editor.css';
import './sheet.css';
export function mountEditor(element, host) { const root = createRoot(element); root.render(<Suite host={host} />); const unmount=()=>root.unmount();unmount.setMode=mode=>root.render(<Suite host={{...host,mode}}/>);return unmount; }
