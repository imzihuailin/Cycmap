# Cycmap - 骑行路线规划 🚴

基于 React + Leaflet 的纯前端骑行路线规划 Web 应用。

## 功能

- 🗺️ **CycleOSM 骑行地图** — 以自行车为中心的地图渲染，清晰的自行车道标识
- 🚲 **骑行路线规划** — 支持起点、终点和多个途经点，拖拽调整路线
- 🔀 **双引擎** — GraphHopper Directions API（带高程数据）和 OSRM（免费无需 Key）
- 📊 **路线详情** — 距离、时间、高程曲线、分段 turn-by-turn 指引
- 🇨🇳 **中文界面** — 中文地名搜索，中文操作提示
- 🔑 **API Key 管理** — 支持界面配置 GraphHopper API Key，localStorage 持久化

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 地图 | Leaflet + react-leaflet v4 |
| 路由 | Leaflet Routing Machine |
| 引擎 | GraphHopper / OSRM |
| 瓦片 | CycleOSM + OSM fallback |
| 部署 | Vercel (SPA) |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 配置 GraphHopper API Key（可选）

默认使用 OSRM 免费引擎，无需任何配置。如需使用 GraphHopper（支持高程数据）：

1. 在 [graphhopper.com](https://www.graphhopper.com/) 注册免费账户
2. 复制 `.env.example` 为 `.env`，填入 `VITE_GRAPHOPPER_API_KEY`
3. 或在应用界面中直接输入 API Key

## 许可证

MIT
