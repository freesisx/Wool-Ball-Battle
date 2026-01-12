# 🧶 毛线球大作战 (Yarn Ball Battle)

一个可爱的像素风格互动网页游戏，用鼠标或手势控制毛线球，吸引猫咪追逐！

![Game Preview](https://img.shields.io/badge/游戏-在线体验-ff6b9d?style=for-the-badge)
在线体验 https://icy-snow-36a8.kingdomcheng.workers.dev/

## ✨ 游戏特色

- 🐱 **可爱的像素猫咪** - 有多种状态动画（悠闲、追逐、兴奋、飞扑、休息）
- 🧶 **毛线球追逐** - 用鼠标或手指控制毛线球
- ✋ **手势控制** - 支持摄像头手势识别（MediaPipe Hands）
- 🎭 **状态演示** - 可以点击按钮预览所有猫咪动作
- 🎵 **音效反馈** - 扑中毛线球时有"喵～"叫声和飘字效果
- 📱 **响应式设计** - 支持桌面和移动设备

## 🎮 游戏玩法

### 控制方式

| 模式 | 操作 |
|------|------|
| 🖱️ 鼠标模式 | 移动鼠标控制毛线球位置 |
| ✋ 手势模式 | 伸出食指，通过摄像头追踪控制毛线球 |

### 猫咪状态

| 状态 | 触发条件 | 动画效果 |
|------|----------|----------|
| 😺 悠闲 | 静止不动时 | 平稳呼吸 |
| 😸 好奇 | 缓慢移动时 | 东张西望 |
| 😻 追逐中 | 正常追赶时 | 小跑动画 |
| 🙀 超兴奋 | 快速追赶时 | 冲刺动画 |
| 🐱 飞扑 | 碰到毛线球时 | 抛物线跳跃 |
| 😴 休息 | 连续飞扑后 | 趴下喘气 |

### 扑中判定

- 当猫咪鼻子与毛线球重合时（距离 < 25px），算作一次"扑中"
- 扑中时会：
  - 🎵 发出"喵～"叫声
  - 💬 飘出"喵～"文字
  - 🐱 播放飞扑动画
  - 📊 扑中次数 +1

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 结构 | HTML5 |
| 样式 | CSS3 (原生) |
| 逻辑 | JavaScript (ES6+) |
| 字体 | Google Fonts (Fredoka, Press Start 2P) |
| 手势 | MediaPipe Hands |
| 音效 | Web Audio API |

## 📁 项目结构

```
cat-yarn-game/
├── index.html      # 主页面
├── style.css       # 样式文件（包含所有动画）
├── game.js         # 游戏逻辑
└── README.md       # 项目说明
```

## 🚀 本地运行

### 方式 1：直接打开
直接在浏览器中打开 `index.html` 文件即可运行（手势功能需要 HTTPS 或 localhost）。

### 方式 2：本地服务器
```bash
# 进入项目目录
cd cat-yarn-game

# 启动本地服务器（任选其一）
python3 -m http.server 3456    # Python
npx serve                       # Node.js
php -S localhost:3456           # PHP

# 访问
open http://localhost:3456
```

## ☁️ 部署到 Cloudflare Pages

### 方式 1：直接上传
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project** → **Direct Upload**
3. 上传整个项目文件夹
4. 点击部署

### 方式 2：连接 Git
1. 将代码推送到 GitHub/GitLab
2. Cloudflare Pages → **Connect to Git**
3. 选择仓库
4. 构建设置：
   - **Build command**: *(留空)*
   - **Build output directory**: `/`
5. 点击部署

### 部署后
- 🌐 自动获得 `xxx.pages.dev` 域名
- 🔒 自动启用 HTTPS
- 🚀 全球 CDN 加速
- 📱 可绑定自定义域名

## 🎨 自定义配置

### 调整游戏参数
在 `game.js` 中修改以下变量：

```javascript
// 飞扑相关
this.pounceDistance = 80;        // 准备飞扑的距离
this.pounceCooldown = 500;       // 飞扑冷却时间 (ms)
this.maxPouncesBeforeRest = 6;   // 休息前最大飞扑次数

// 追逐速度
let baseSpeed = 7;               // 基础速度
return Math.min(baseSpeed, 22);  // 最大速度

// 休息时间
this.restDuration = 3000;        // 休息时长 (ms)
```

### 修改猫咪外观
在 `style.css` 中搜索 `:root` 修改颜色变量：

```css
--cat-orange: #ff9f43;     /* 猫咪身体颜色 */
--yarn-pink: #ff6b9d;      /* 毛线球颜色 */
--pixel-black: #2d3436;    /* 描边颜色 */
```

## 📝 浏览器兼容性

| 浏览器 | 支持 | 备注 |
|--------|------|------|
| Chrome | ✅ | 推荐使用 |
| Firefox | ✅ | 完全支持 |
| Safari | ✅ | 需要 macOS 11+ |
| Edge | ✅ | 完全支持 |
| 移动端 | ✅ | 触屏控制 |

> ⚠️ 手势控制功能需要浏览器授权摄像头访问权限

## 📄 开源协议

MIT License - 可自由使用、修改和分发。

## 🙏 致谢

- [MediaPipe](https://mediapipe.dev/) - 手势识别
- [Google Fonts](https://fonts.google.com/) - 字体支持
- Chrome Dino Game - 游戏灵感

---

**Made with ❤️ and 🐱**
