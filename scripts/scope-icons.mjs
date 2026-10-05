// Do not replace Foundry's icon styles when our bundled stylesheet is loaded.
export function scopeIcons(){return{postcssPlugin:'token-studio-scope-icons',Rule(rule){if(rule.selector?.includes('.fa'))rule.selectors=rule.selectors.map(s=>s.startsWith('.ts-app')?s:`.ts-app ${s}`);else if(rule.selector?.includes(':root')&&rule.nodes?.some(n=>n.prop?.startsWith('--fa-')))rule.selector='.ts-app';}};}
