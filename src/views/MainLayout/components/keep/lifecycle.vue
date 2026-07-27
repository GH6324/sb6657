<template>
    <div class="lifecycle">
        <h2 class="page-title">🧬 梗生命周期看板</h2>
        <p class="page-sub">
            每个烂梗都会经历 <b>新生儿 → 爆发期 → 烂大街 → 已入土</b> 四个阶段。点击任意梗查看 <b>DNA 关联图谱</b>——看哪些梗「共享基因」。
        </p>

        <!-- DNA Hero Prompt -->
        <div class="dna-hero" @click="dnaSearchVisible = true">
            <div class="dna-hero-bg"></div>
            <div class="dna-hero-content">
                <span class="dna-hero-icon">🧬</span>
                <div class="dna-hero-text">
                    <strong>梗 DNA 关联图谱 — 点击这里探索</strong>
                    <span>搜索任意烂梗，查看它的 DNA 关联图谱</span>
                </div>
                <span class="dna-hero-arrow">→</span>
            </div>
        </div>

        <!-- DNA Search Dialog -->
        <el-dialog v-model="dnaSearchVisible" title="🧬 搜索烂梗查看 DNA 关联" width="500px" :close-on-click-modal="true">
            <el-input v-model="dnaSearchKey" placeholder="输入烂梗关键词搜索..." clearable @keyup.enter="dnaDoSearch" @clear="dnaSearchResults = []">
                <template #append>
                    <el-button @click="dnaDoSearch" :loading="dnaSearching">搜索</el-button>
                </template>
            </el-input>
            <div v-if="dnaSearching" class="dna-search-loading">搜索中…</div>
            <ul v-else-if="dnaSearchResults.length" class="dna-search-list">
                <li v-for="r in dnaSearchResults" :key="r.id" class="dna-search-item" @click="openDna(r.id); dnaSearchVisible = false">
                    <span class="dna-search-text">{{ r.barrage }}</span>
                    <span class="dna-search-cnt">复{{ r.cnt }}</span>
                </li>
            </ul>
            <div v-else-if="dnaSearchKey && !dnaSearching" class="dna-search-empty">没有找到相关烂梗</div>
        </el-dialog>

        <div v-if="dashLoading" class="loading"><div class="spinner"></div></div>
        <template v-else>
            <!-- Stage Timeline -->
            <div class="stage-timeline">
                <div v-for="(s, i) in timeline" :key="s.key" class="timeline-node" :class="'node-' + s.key" :style="{ animationDelay: i * 0.12 + 's' }">
                    <div class="node-icon">{{ s.icon }}</div>
                    <div class="node-label">{{ s.name }}</div>
                    <div class="node-count" :class="{ zero: stageCount(s.key) === 0 }">{{ stageCount(s.key) }}</div>
                </div>
            </div>

            <!-- Stage Panels (infinite scroll per panel) -->
            <div class="stage-grid">
                <section v-for="stage in timeline" :key="stage.key" class="stage-panel" :class="'panel-' + stage.key.toLowerCase()">
                    <h3 class="panel-header" :class="'hdr-' + stage.key">
                        <span class="hdr-icon">{{ stage.icon }}</span>
                        <span>{{ stage.name }}</span>
                        <span class="hdr-count">{{ stageCount(stage.key) }}</span>
                    </h3>
                    <div class="panel-scroll" :ref="(el) => setScrollRef(stage.key, el)">
                        <ul class="meme-list">
                            <li v-for="m in panels[stage.key].items" :key="m.barrageId" class="meme-item" @click="openDna(m.barrageId)">
                                <el-popover v-if="m.tags || m.submitTime" placement="top" :width="'auto'" trigger="hover">
                                    <template #default>
                                        <div v-if="m.tags" class="tag-list">
                                            <div v-for="item in getDisplayTags(m.tags, allTags)" :key="item.label">
                                                <el-tag round effect="dark" class="tag-item">
                                                    <div class="tag-icon-wrapper">
                                                        <img v-if="item.iconUrl" :src="item.iconUrl" class="tag-icon" />
                                                        <span class="tag-label">{{ item.label }}</span>
                                                    </div>
                                                </el-tag>
                                            </div>
                                        </div>
                                        <div v-if="m.submitTime" class="submit-time">📅 {{ fmtDate(m.submitTime) }}</div>
                                    </template>
                                    <template #reference>
                                        <span class="meme-text">{{ m.barrage }}</span>
                                    </template>
                                </el-popover>
                                <span v-else class="meme-text">{{ m.barrage }}</span>
                                <div class="meme-meta">
                                    <span>复{{ m.cnt }}</span>
                                    <el-popover placement="bottom" trigger="hover" :width="200" :show-after="200">
                                        <div class="dna-tip">🧬 点击查看烂梗 DNA 关联图谱</div>
                                        <template #reference>
                                            <span class="dna-badge">🔬DNA</span>
                                        </template>
                                    </el-popover>
                                </div>
                            </li>
                        </ul>
                        <div v-if="panels[stage.key].loading" class="panel-loading"><div class="mini-spinner"></div></div>
                        <div v-else-if="panels[stage.key].isLast && panels[stage.key].items.length" class="panel-end">— 到底了 —</div>
                        <div v-else-if="!panels[stage.key].items.length && !panels[stage.key].loading" class="panel-empty">暂无</div>
                        <div :ref="(el) => setSentinelRef(stage.key, el)" class="sentinel"></div>
                    </div>
                </section>
            </div>
        </template>

        <!-- DNA Dialog -->
        <el-dialog v-model="dnaVisible" title="🧬 梗 DNA 关联图谱" width="90%" :close-on-click-modal="true">
            <div v-if="dnaLoading" class="dna-loading">
                <div class="helix">
                    <span v-for="n in 6" :key="n" class="helix-dot" :style="{ animationDelay: n * 0.15 + 's' }"></span>
                </div>
                <div>分析关联中…</div>
            </div>
            <div v-else-if="!dnaList.length" class="empty">暂无关联梗，这个梗还很孤独 🥲</div>
            <div v-else class="dna-graph">
                <div class="dna-scroll">
                    <div class="dna-canvas" :style="{ width: GRAPH_W + 'px', height: GRAPH_H + 'px' }">
                        <svg class="dna-wires" :width="GRAPH_W" :height="GRAPH_H">
                            <!-- 轨道参考圈 -->
                            <ellipse :cx="CX" :cy="CY" rx="320" ry="215" class="orbit" />
                            <ellipse :cx="CX" :cy="CY" rx="560" ry="345" class="orbit" />
                            <!-- 连线：曲线，越相似越粗 -->
                            <path v-for="(n, i) in graphNodes" :key="'e' + i"
                                :d="edgePath(n)" pathLength="1"
                                class="dna-edge" :class="'edge-' + n.rel"
                                :style="{ strokeWidth: 1.5 + n.similarity * 4, opacity: edgeOpacity(n, i), animationDelay: i * 0.04 + 's' }" />
                        </svg>
                        <!-- 中心节点 -->
                        <div class="dna-center-card" :style="{ left: CX + 'px', top: CY + 'px' }">
                            <div class="center-badge">🧬 当前烂梗</div>
                            <div class="center-text">{{ centerFullText }}</div>
                            <div class="center-count">DNA 关联 {{ dnaList.length }} 条</div>
                        </div>
                        <!-- 关联节点卡片：完整显示烂梗内容 -->
                        <div v-for="(n, i) in graphNodes" :key="'n' + i"
                            class="dna-card"
                            :class="['sim-' + n.tier, 'rel-' + n.rel, { dimmed: hoverNode !== -1 && hoverNode !== i }]"
                            :style="{ left: n.x + 'px', top: n.y + 'px', animationDelay: 0.1 + i * 0.05 + 's' }"
                            @mouseenter="hoverNode = i" @mouseleave="hoverNode = -1">
                            <div class="card-head">
                                <span class="card-rel">{{ relLabel[n.rel] }}</span>
                                <span class="card-pct">{{ Math.round(n.similarity * 100) }}%</span>
                            </div>
                            <div class="card-text">{{ n.fullText }}</div>
                        </div>
                    </div>
                </div>
                <div class="dna-legend">
                    <span class="legend-item"><i class="swatch sim-high"></i>高度相似 ≥70%</span>
                    <span class="legend-item"><i class="swatch sim-mid"></i>中度相似 ≥40%</span>
                    <span class="legend-item"><i class="swatch sim-low"></i>弱相似</span>
                    <span class="legend-item"><i class="line-swatch solid"></i>相似关联</span>
                    <span class="legend-item"><i class="line-swatch dashed"></i>衍生关系（按投稿时间推断）</span>
                    <span class="legend-hint">越靠近中心 = 越相似 · 悬停卡片高亮对应连线</span>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { API } from '@/constants/backend';
import { get, post } from '@/apis/httpInstance';
import { useMemeTagsStore } from '@/stores/memeTags';
import { getDisplayTags } from '@/utils/tags';
import type { getMemeTags as memeTag } from '@/types/meme';

const memeTagsStore = useMemeTagsStore();
const allTags = ref<memeTag[]>([]);
memeTagsStore.tagsLoaded.then(() => { allTags.value = memeTagsStore.memeTags; });

interface StageStat { stage: string; cnt: number; }
interface MemeRow { barrageId: number; barrage: string; cnt: number; submitTime?: string; tags?: string; }
interface DnaRow { id: number; barrageId: number; relatedId: number; barrage: string; related: string; relationType: string; similarity: number; }
interface PageResult<T> { list: T[]; total: number; isLastPage: boolean; }
interface PanelState { items: MemeRow[]; pageNum: number; isLast: boolean; loading: boolean; }

const timeline = [
    { key: 'BIRTH', name: '新生儿', icon: '🌱' },
    { key: 'BOOM', name: '爆发期', icon: '🔥' },
    { key: 'STALE', name: '烂大街', icon: '💀' },
    { key: 'DEAD', name: '已入土', icon: '⚰️' },
];
const STAGE_KEYS = timeline.map(t => t.key);

const dashLoading = ref(true);
const stageStats = ref<StageStat[]>([]);
const panels = reactive<Record<string, PanelState>>({});
for (const k of STAGE_KEYS) panels[k] = { items: [], pageNum: 0, isLast: false, loading: false };

const dnaVisible = ref(false);
const dnaLoading = ref(false);
const dnaList = ref<DnaRow[]>([]);

// DNA 搜索
const dnaSearchVisible = ref(false);
const dnaSearchKey = ref('');
const dnaSearching = ref(false);
const dnaSearchResults = ref<{ id: number; barrage: string; cnt: number }[]>([]);
async function dnaDoSearch() {
    const q = dnaSearchKey.value.trim();
    if (!q) return;
    dnaSearching.value = true;
    dnaSearchResults.value = [];
    try {
        const res = await post<any, any>({ url: API.SEARCH_MEME, data: { barrage: q, sort: 0, pageNum: 1, pageSize: 20 } });
        dnaSearching.value = false;
        if (!res._failure && res.flatData) {
            dnaSearchResults.value = (res.flatData.list || []).map((item: any) => ({
                id: item.id,
                barrage: item.barrage || item.content,
                cnt: item.cnt || 0,
            }));
        }
    } catch { dnaSearching.value = false; }
}

const scrollRefs = new Map<string, HTMLElement>();
const sentinelRefs = new Map<string, HTMLElement>();
const observers: IntersectionObserver[] = [];

function setScrollRef(key: string, el: any) { if (el) scrollRefs.set(key, el as HTMLElement); }
function setSentinelRef(key: string, el: any) { if (el) sentinelRefs.set(key, el as HTMLElement); }

function stageCount(key: string) { return stageStats.value.find(s => s.stage === key)?.cnt || 0; }

async function loadDashboard() {
    dashLoading.value = true;
    const res = await get<{ stages: StageStat[] }>(API.LIFECYCLE_DASHBOARD);
    dashLoading.value = false;
    if (!res._failure && res.flatData) stageStats.value = res.flatData.stages || [];
}

async function loadStage(key: string) {
    const p = panels[key];
    if (p.loading || p.isLast) return;
    p.loading = true;
    const res = await get<PageResult<MemeRow>>(`${API.LIFECYCLE_STAGE}/${key}?pageNum=${p.pageNum + 1}&pageSize=20`);
    p.loading = false;
    if (!res._failure && res.flatData) {
        p.items.push(...(res.flatData.list || []));
        p.pageNum++;
        p.isLast = res.flatData.isLastPage;
    }
}

function openDna(barrageId: number) {
    dnaVisible.value = true;
    dnaLoading.value = true;
    dnaList.value = [];
    const res = get(`${API.DNA_RELATIONS}/${barrageId}`);
    res.then(r => { dnaLoading.value = false; if (!r._failure && r.flatData) dnaList.value = (r.flatData as DnaRow[]) || []; });
}

// ==================== DNA 图谱布局 ====================
const GRAPH_W = 1500;
const GRAPH_H = 1080;
const CX = GRAPH_W / 2;
const CY = GRAPH_H / 2;
const CARD_W = 250;

type RelType = 'PARENT' | 'CHILD' | 'SIMILAR';
interface GraphNode {
    x: number; y: number; anchorX: number; anchorY: number;
    similarity: number; tier: 'high' | 'mid' | 'low'; rel: RelType; fullText: string;
}

const hoverNode = ref(-1);

/** 中心梗完整文本 */
const centerFullText = computed(() => dnaList.value[0]?.barrage || '');

const relLabel: Record<RelType, string> = { PARENT: '衍生自', CHILD: '衍生出', SIMILAR: '相似' };

/**
 * 卡片式径向布局：
 *  - 相似度越高 → 离中心越近
 *  - 卡片左右交错排布，anchor 是卡片靠近中心一侧的边缘中点（连线终点）
 *  - x/y 是卡片左上角坐标（用于 CSS 定位）
 */
const graphNodes = computed<GraphNode[]>(() => {
    const list = [...dnaList.value].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const n = list.length;
    const minR = 200, maxR = 620;
    return list.map((r, i) => {
        const sim = r.similarity || 0;
        const rel = (r.relationType as RelType) || 'SIMILAR';
        // 左右交错：偶数在右，奇数在左；垂直方向按序号铺开
        const side = i % 2 === 0 ? 1 : -1;
        const dist = minR + (1 - sim) * (maxR - minR);
        const spread = n > 1 ? (i / (n - 1) - 0.5) * 2 : 0; // -1..1
        const anchorX = CX + side * dist;
        const anchorY = CY + spread * (GRAPH_H / 2 - 120);
        const tier: 'high' | 'mid' | 'low' = sim >= 0.7 ? 'high' : sim >= 0.4 ? 'mid' : 'low';
        // 卡片左上角：anchor 在卡片靠中心一侧的边缘中点
        const x = side === 1 ? anchorX : anchorX - CARD_W;
        const y = anchorY - 30;
        return { x, y, anchorX, anchorY, similarity: sim, tier, rel, fullText: r.related || '' };
    });
});

/** 中心到卡片的贝塞尔曲线 */
function edgePath(n: GraphNode): string {
    const ctrlX = CX + (n.anchorX - CX) * 0.5;
    return `M ${CX} ${CY} Q ${ctrlX} ${n.anchorY} ${n.anchorX} ${n.anchorY}`;
}

/** 连线透明度：悬停时高亮当前、淡化其他 */
function edgeOpacity(n: GraphNode, i: number): number {
    const base = 0.25 + n.similarity * 0.5;
    if (hoverNode.value === -1) return base;
    return hoverNode.value === i ? Math.min(1, base + 0.3) : 0.08;
}
function fmtDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
onMounted(async () => {
    await loadDashboard();
    await nextTick();
    for (const key of STAGE_KEYS) {
        const sentinel = sentinelRefs.get(key);
        if (!sentinel) continue;
        // 首屏加载第一页
        loadStage(key);
        const obs = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadStage(key); },
            { root: scrollRefs.get(key) || null, rootMargin: '120px' }
        );
        obs.observe(sentinel);
        observers.push(obs);
    }
});
onUnmounted(() => observers.forEach(o => o.disconnect()));
</script>

<style scoped lang="scss">
.lifecycle {
    max-width: 95%;
    margin: 0 auto;
    padding: 20px;
    background: #f2f3f5;
}
.page-title {
    font-size: 24px; font-weight: 900;
    background: linear-gradient(90deg, #36cfc9, #409eff, #722ed1);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    margin: 0 0 4px;
}
.page-sub { color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }

/* DNA Hero Prompt */
.dna-hero {
    position: relative;
    margin-bottom: 18px;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
.dna-hero:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(54, 207, 201, 0.2);
}
.dna-hero-bg {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, #e6fffb, #bae7ff, #efdbff, #fff1f0);
    background-size: 300% 300%;
    animation: dna-hero-shift 4s ease infinite;
}
@keyframes dna-hero-shift {
    0%,100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}
.dna-hero-content {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
}
.dna-hero-icon { font-size: 30px; }
.dna-hero-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.dna-hero-text strong { font-size: 16px; color: #333; }
.dna-hero-text span { font-size: 13px; color: #888; }
.dna-hero-arrow { font-size: 24px; color: #409eff; animation: arrow-bounce 1.2s ease infinite; }
@keyframes arrow-bounce { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }

.loading { text-align: center; color: #999; padding: 40px; }
.spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #36cfc9; border-radius: 50%; margin: 0 auto; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Timeline */
.stage-timeline {
    display: flex; margin-bottom: 20px;
    background: linear-gradient(90deg, #e6fffb, #bae7ff, #efdbff, #fff1f0);
    border-radius: 14px; padding: 16px 8px; position: relative;
}
.stage-timeline::before {
    content: ''; position: absolute; top: 50%; left: 10%; right: 10%; height: 3px;
    background: linear-gradient(90deg, #36cfc9, #409eff, #722ed1, #ff4d4f);
    border-radius: 2px; z-index: 0;
}
.timeline-node {
    flex: 1; text-align: center; position: relative; z-index: 1;
    opacity: 0; animation: node-pop 0.4s ease forwards;
}
@keyframes node-pop { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
.node-icon { font-size: 28px; margin-bottom: 4px;}
.node-label { font-size: 13px; font-weight: 700; margin-top: 20px;}
.node-count {
    font-size: 14px; font-weight: 900; margin-top: 2px;
    background: #fff; min-width: 36px; height: 36px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    white-space: nowrap;
}
.node-BIRTH .node-count { color: #36cfc9; border: 2px solid #36cfc9; }
.node-BOOM .node-count { color: #ff6b35; border: 2px solid #ff6b35; }
.node-STALE .node-count { color: #8a6d3b; border: 2px solid #8a6d3b; }
.node-DEAD .node-count { color: #999; border: 2px solid #bbb; }
.node-count.zero { opacity: 0.4; }

/* Stage Grid — PC 多列，窄屏自适应 */
.stage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 14px;
    align-items: start;
}
.stage-panel {
    background: #fff; border-radius: 14px; padding: 14px;
    border: 2px solid #f0f0f0; transition: border-color 0.3s, box-shadow 0.3s;
}
.stage-panel:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.panel-birth { border-color: #b5f5ec; }
.panel-boom { border-color: #ffd8bf; }
.panel-stale { border-color: #e8e8e8; }
.panel-dead { border-color: #f0f0f0; }

.panel-header {
    display: flex; align-items: center; gap: 8px;
    margin: 0 0 10px; font-size: 16px; font-weight: 700;
}
.hdr-icon { font-size: 18px; }
.hdr-count {
    margin-left: auto; font-size: 13px; font-weight: 700;
    background: #f0f0f0; border-radius: 10px; padding: 1px 8px; color: #666;
}
.hdr-BIRTH { color: #36cfc9; }
.hdr-BOOM { color: #ff6b35; }
.hdr-STALE { color: #8a6d3b; }
.hdr-DEAD { color: #999; }

/* Scrollable panel body */
.panel-scroll {
    max-height: 460px;
    overflow-y: auto;
    padding-right: 4px;
}
@media (max-width: 600px) {
    .panel-scroll { max-height: 380px; }
}
.meme-list { list-style: none; margin: 0; padding: 0; }
.meme-item {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 7px 4px; border-bottom: 1px dashed #f0f0f0;
    font-size: 14px; cursor: pointer; transition: background 0.2s;
}
.meme-item:hover { background: #fafafa; }
.meme-meta { color: #999; font-size: 12px; white-space: nowrap; }

.panel-loading { text-align: center; padding: 10px; }
.mini-spinner {
    width: 20px; height: 20px; border: 2px solid #eee; border-top-color: #409eff;
    border-radius: 50%; margin: 0 auto; animation: spin 0.7s linear infinite;
}
.panel-end { text-align: center; color: #ccc; font-size: 12px; padding: 10px; }
.panel-empty { text-align: center; color: #bbb; padding: 20px; }
.sentinel { height: 1px; }

/* DNA */
.dna-loading { text-align: center; padding: 30px; color: #999; }
.helix { display: flex; justify-content: center; gap: 6px; margin-bottom: 10px; }
.helix-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: linear-gradient(135deg, #36cfc9, #409eff);
    animation: helix-bounce 1.2s ease-in-out infinite;
}
@keyframes helix-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
/* DNA Graph */
.dna-graph { position: relative; }
.dna-scroll {
    overflow: auto; border-radius: 14px;
    background:
        radial-gradient(circle at 50% 45%, #eef4ff 0%, #f7f9fc 55%, #f2f3f5 100%);
    max-height: 70vh;
    box-shadow: inset 0 0 40px rgba(64, 158, 255, 0.06);
}
.dna-canvas { position: relative; margin: 0 auto; }
.dna-wires { position: absolute; inset: 0; pointer-events: none; }

/* 轨道参考圈 */
.orbit { fill: none; stroke: #d6e4ff; stroke-width: 1; stroke-dasharray: 4 6; opacity: 0.7; }

/* 连线 */
.dna-edge {
    fill: none; stroke: #409eff; stroke-linecap: round;
    stroke-dasharray: 1; stroke-dashoffset: 1;
    animation: edge-draw 0.6s ease forwards;
    transition: opacity 0.25s;
}
.dna-edge.edge-PARENT, .dna-edge.edge-CHILD { stroke: #722ed1; }
@keyframes edge-draw { to { stroke-dashoffset: 0; } }

/* 中心节点卡片 */
.dna-center-card {
    position: absolute; transform: translate(-50%, -50%);
    width: 280px; padding: 16px 18px; text-align: center;
    background: linear-gradient(135deg, #722ed1, #9254de);
    color: #fff; border-radius: 16px;
    box-shadow: 0 8px 30px rgba(114, 46, 209, 0.35);
    z-index: 5;
}
.center-badge { font-size: 12px; font-weight: 700; opacity: 0.9; margin-bottom: 8px; }
.center-text {
    font-size: 14px; font-weight: 600; line-height: 1.5;
    max-height: 120px; overflow-y: auto; word-break: break-all;
}
.center-count { font-size: 11px; opacity: 0.8; margin-top: 8px; }

/* 关联节点卡片 */
.dna-card {
    position: absolute; width: 250px; padding: 10px 12px;
    background: #fff; border-radius: 12px;
    border-left: 4px solid #409eff;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.08);
    opacity: 0; animation: card-in 0.45s ease forwards;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.25s;
    cursor: default; z-index: 2;
}
@keyframes card-in { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
.dna-card:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); z-index: 6; }
.dna-card.dimmed { opacity: 0.35; }
.dna-card.sim-high { border-left-color: #ff4d4f; }
.dna-card.sim-mid { border-left-color: #fa8c16; }
.dna-card.sim-low { border-left-color: #409eff; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.card-rel { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0f0f0; color: #666; }
.dna-card.rel-PARENT .card-rel { background: #f9f0ff; color: #722ed1; }
.dna-card.rel-CHILD .card-rel { background: #e6fffb; color: #13c2c2; }
.dna-card.rel-SIMILAR .card-rel { background: #e6f7ff; color: #1890ff; }
.card-pct { font-size: 13px; font-weight: 800; color: #333; }
.card-text {
    font-size: 13px; color: #333; line-height: 1.5; word-break: break-all;
    max-height: 150px; overflow-y: auto;
}

/* 图例 */
.dna-legend {
    display: flex; align-items: center; gap: 16px; justify-content: center;
    margin-top: 12px; font-size: 12px; color: #666; flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-item .swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.swatch.sim-high { background: #ff4d4f; }
.swatch.sim-mid { background: #fa8c16; }
.swatch.sim-low { background: #409eff; }
.line-swatch { width: 22px; height: 0; border-top: 3px solid #409eff; display: inline-block; }
.line-swatch.dashed { border-top-style: dashed; border-top-color: #722ed1; }
.legend-hint { color: #aaa; font-size: 11px; }
.empty { color: #bbb; text-align: center; padding: 16px; }
.tag-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
    .tag-item {
        font-size: 13px;
        .tag-icon-wrapper {
            height: 100%;
            width: 100%;
            display: flex;
            align-items: center;
            gap: 4px;
            .tag-icon {
                width: 16px;
                object-fit: cover;
                vertical-align: middle;
            }
            .tag-label { vertical-align: middle; }
        }
    }
}
.submit-time { color: #c0c4cc; font-size: 12px; }

/* Meme Meta */
.meme-meta {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 12px; color: #999;
}
.dna-badge {
    color: #722ed1; cursor: pointer; font-weight: 600;
    transition: color 0.2s;
    &:hover { color: #409eff; }
}
.dna-tip { font-size: 13px; color: #333; }

/* DNA Search Dialog */
.dna-search-loading { text-align: center; color: #999; padding: 20px; }
.dna-search-empty { text-align: center; color: #bbb; padding: 20px; }
.dna-search-list { list-style: none; margin: 12px 0 0; padding: 0; max-height: 360px; overflow-y: auto; }
.dna-search-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer;
    transition: background 0.15s;
    &:hover { background: #f5f5f5; }
}
.dna-search-text { font-size: 14px; flex: 1; margin-right: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dna-search-cnt { font-size: 12px; color: #999; flex-shrink: 0; }
</style>
