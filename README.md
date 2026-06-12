# Cycmap

自行车骑行路线规划工具。在地图上添加途经点，自动计算骑行路线，支持导出骑行手卡。

## 功能

- 点击地图右上角 🚩 进入添加模式，点击地图放置途经点
- 途经点之间自动调用 [OSRM](https://project-osrm.org/) 计算骑行路线
- 拖拽途经点调整位置，点击路线线段插入新途经点
- 为途经点标记服务类型（补水💧、用餐🍚、住宿🛏）
- 支持重命名途经点
- 导出打印版骑行手卡
- CyclOSM 骑行风格地图底图

## 技术栈

- React 18 + TypeScript
- Vite 6
- react-leaflet / Leaflet
- OSRM 路线服务
- CyclOSM 瓦片底图

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查 + 生产构建
npm run build

# 预览生产构建
npm run preview
```

开发服务器默认运行在 `http://localhost:5173`。

## 许可

MIT
