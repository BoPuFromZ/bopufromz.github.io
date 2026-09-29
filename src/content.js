// 后续只需要填写这个文件。留空的个人信息不会被编造，空作品列表会展示简洁留白。
export const profile = {
  name: '',
  introduction: '',
  location: '',
  email: '',
  github: 'https://github.com/BoPuFromZ',
  links: [],
};

export const sections = {
  game: { number: '01', title: '游戏开发', english: 'BUILD A WORLD', subtitle: '从一个想法，到一个可以进入的世界。', color: '#8bebde', description: '', tools: [], works: [] },
  music: { number: '02', title: '音乐制作', english: 'FIND THE FREQUENCY', subtitle: '让灵感有自己的频率。', color: '#da98d7', description: '', tools: [], works: [] },
  animation: { number: '03', title: '动画制作', english: 'FRAME BY FRAME', subtitle: '一帧一帧，让想象动起来。', color: '#b0a1ff', description: '', tools: [], works: [] },
  car: { number: '04', title: '改装车', english: 'BUILT, NOT BOUGHT', subtitle: '偏爱复古小车，也偏爱亲手改变。', color: '#ffb46e', description: '', tools: ['复古小车'], works: [] },
  fitness: { number: '05', title: '健身', english: 'ONE MORE REP', subtitle: '把每一次训练，变成下一次的底气。', color: '#d4ee8c', description: '', tools: ['力量训练'], works: [], stats: [
    { value: '2024.03', label: '开始训练' },
    { value: '4–5', unit: '练 / 周', label: '训练频率' },
    { value: '195', unit: 'KG', label: '硬拉成功记录' },
    { value: '500', unit: 'KG', label: '三大项总重目标' },
  ], record: { title: '硬拉 · 一步一步接近 200 KG', text: '160 公斤 × 3 次组，硬拉 195 公斤成功。下一站：三大项总重 500 公斤。' } },
};

// 每个 works 的填写格式：
// { title: '作品名称', summary: '作品介绍', role: '负责部分', year: '年份',
//   status: '开发中', image: '/images/example.webp', url: 'https://...', linkLabel: '查看作品' }
// 自己的作品、音频和视频准备好之后再补充，场景里的屏幕是设计演示，不会作为个人作品展示。
