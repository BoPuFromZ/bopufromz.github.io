export const BODY_COLORS = [
  { id: 'amber', name: '复古琥珀', hex: '#cd7b44' },
  { id: 'cream', name: '奶油白', hex: '#e8dfc5' },
  { id: 'racing', name: '英伦绿', hex: '#31574a' },
  { id: 'cherry', name: '樱桃红', hex: '#a52e3e' },
  { id: 'blue', name: '海湾蓝', hex: '#5c9db2' },
  { id: 'graphite', name: '石墨灰', hex: '#454c55' },
];
export const WHEELS = [
  { id: 'classic', name: '经典八辐', description: 'CLASSIC / 08', spokes: 8, hex: '#778084' },
  { id: 'sport', name: '运动五辐', description: 'SPORT / 05', spokes: 5, hex: '#c4c9c6' },
  { id: 'disc', name: '复古碟盘', description: 'AERO / DISC', spokes: 0, hex: '#aa8451' },
];
export const LIGHT_COLORS = [
  { id: 'warm', name: '暖白', hex: '#ffefca' },
  { id: 'ice', name: '冰蓝', hex: '#80cfff' },
  { id: 'lime', name: '青柠', hex: '#c2ff81' },
  { id: 'violet', name: '紫罗兰', hex: '#cc9dff' },
];
export const DEFAULT_CONFIG = { body: 'amber', wheels: 'classic', lights: 'warm' };
export const CONFIG_KEY = 'afterhours.car.v1';
export function sanitizeConfig(value = {}) {
  return {
    body: BODY_COLORS.some(c => c.id === value?.body) ? value.body : DEFAULT_CONFIG.body,
    wheels: WHEELS.some(c => c.id === value?.wheels) ? value.wheels : DEFAULT_CONFIG.wheels,
    lights: LIGHT_COLORS.some(c => c.id === value?.lights) ? value.lights : DEFAULT_CONFIG.lights,
  };
}
export function loadCarConfig() { try { return sanitizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY))); } catch { return { ...DEFAULT_CONFIG }; } }
export function saveCarConfig(value) { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(sanitizeConfig(value))); return true; } catch { return false; } }
