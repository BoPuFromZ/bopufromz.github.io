# AFTERHOURS / 创作车库

Three.js 构建的原创三维车库，包含游戏开发、音乐制作、动画制作、复古改装车和训练区。HTML / CSS 提供内容面板与手机布局。

主页地址：https://bopufromz.github.io/

源码仓库：https://github.com/BoPuFromZ/bopufromz.github.io

## 本地运行

```sh
npm install
npm run dev
```

## 打包

```sh
npm run build
```

`dist/` 可以部署到静态网站托管服务。GitHub Pages 的自动发布配置见 `.github/workflows/pages.yml`。

GitHub 仓库的 Settings → Pages → Source 必须选择 **GitHub Actions**，避免直接发布源码目录。之后提交到 `main` 会自动构建并更新主页。

## 填写内容

编辑 `src/content.js`。尚未填写的名字、简介、邮箱和作品数组保持为空，不会生成虚假的个人作品。健身数据来自提供的文本。

在对应区域的 `works` 数组里加入作品：

```js
{ title: '作品名称', summary: '介绍', role: '负责部分', year: '2026',
  status: '开发中', image: '/images/example.webp',
  url: 'https://...', linkLabel: '查看作品' }
```

图片放入 `public/images/`。修改后重新构建和发布。

## 交互

点击复古车库或改装车入口，进入完整的三维改装空间。原有复古小车由 `src/vehicle.js` 共用，提供三种轮毂、六种车身配色与四种车灯颜色；配置保存到当前浏览器并随车进入赛道。

点击「启动 · 去跑一圈」进入环形赛道。电脑用方向键加速、刹车/倒车和转向，手机用悬浮按键，可同时按住加速与转向。通过全部 12 个检查点完成一圈，记录本圈用时与本机最快成绩。R 重置车辆，ESC/P 暂停；切换窗口会自动暂停并清除按键。

运行 `node --test src/driving.test.js` 验证驾驶控制、护栏碰撞、顺序检查点与圈速。

- 拖动旋转，滚轮或双指缩放；点击五个工作区物件或导航打开内容。
- 日夜灯光切换、动画暂停、恢复视角、全屏，以及默认关闭的合成环境声音。
- 方向键旋转，Home 恢复视角，Escape 关闭面板。
- 链接支持 `#game`、`#music`、`#animation`、`#car`、`#fitness` 等直接访问。
- 场景不能加载时，HTML 内容导航仍然可用。

场景模型与屏幕图形是本站的设计素材。音乐台和动画屏仅作场景装饰，不代表个人已发布的作品。
