/**
 * Lucide SVG Icons embedded directly as strings for MV3 zero-CSP overhead and instant rendering.
 */

const svgWrapper = (content, size = 18, className = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon ${className}">${content}</svg>`;

export const ICONS = {
  lock: (size, cls) => svgWrapper('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', size, cls),
  unlock: (size, cls) => svgWrapper('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>', size, cls),
  shield: (size, cls) => svgWrapper('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>', size, cls),
  shieldCheck: (size, cls) => svgWrapper('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', size, cls),
  shieldAlert: (size, cls) => svgWrapper('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>', size, cls),
  check: (size, cls) => svgWrapper('<path d="M20 6 9 17l-5-5"/>', size, cls),
  checkCircle: (size, cls) => svgWrapper('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>', size, cls),
  copy: (size, cls) => svgWrapper('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', size, cls),
  info: (size, cls) => svgWrapper('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', size, cls),
  eye: (size, cls) => svgWrapper('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>', size, cls),
  eyeOff: (size, cls) => svgWrapper('<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><line x1="2" x2="22" y1="2" y2="22"/>', size, cls),
  trash: (size, cls) => svgWrapper('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>', size, cls),
  plus: (size, cls) => svgWrapper('<path d="M5 12h14"/><path d="M12 5v14"/>', size, cls),
  settings: (size, cls) => svgWrapper('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', size, cls),
  externalLink: (size, cls) => svgWrapper('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', size, cls),
  alertTriangle: (size, cls) => svgWrapper('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>', size, cls),
  key: (size, cls) => svgWrapper('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>', size, cls),
  search: (size, cls) => svgWrapper('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', size, cls),
  globe: (size, cls) => svgWrapper('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', size, cls),
  clock: (size, cls) => svgWrapper('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', size, cls),
  power: (size, cls) => svgWrapper('<path d="M12 2v10"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>', size, cls),
  arrowRight: (size, cls) => svgWrapper('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', size, cls),
  close: (size, cls) => svgWrapper('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', size, cls),
  sparkles: (size, cls) => svgWrapper('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>', size, cls),
  refresh: (size, cls) => svgWrapper('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>', size, cls),
  moreVertical: (size, cls) => svgWrapper('<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>', size, cls),
  helpCircle: (size, cls) => svgWrapper('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>', size, cls),
  userCheck: (size, cls) => svgWrapper('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>', size, cls),
  shieldOff: (size, cls) => svgWrapper('<path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"/><path d="M4.73 4.73 4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"/><line x1="2" x2="22" y1="2" y2="22"/>', size, cls),
  chevronDown: (size, cls) => svgWrapper('<path d="m6 9 6 6 6-6"/>', size, cls),
  arrowLeft: (size, cls) => svgWrapper('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', size, cls)
};

export function getIcon(name, size = 18, className = '') {
  const fn = ICONS[name];
  return fn ? fn(size, className) : '';
}
