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

            <!-- 演变流程：根据用户当前查看的梗拉取全部母体 + 衍生梗 -->
            <section class="evolution-card" v-if="evolutionCenterId">
                <header class="evolution-header">
                    <div>
                        <div class="evolution-title">🧬 演变流程 · #{{ evolutionCenterId }}</div>
                        <div class="evolution-sub" v-if="evolutionLoading">正在拉取母体和衍生梗…</div>
                        <div class="evolution-sub" v-else-if="evolutionError">{{ evolutionError }}</div>
                        <div class="evolution-sub" v-else>
                            {{ evolutionGraph?.ancestors?.length || 0 }} 个母体
                            <span class="dot">·</span>
                            {{ evolutionGraph?.descendants?.length || 0 }} 个衍生梗
                            <span class="dot" v-if="evolutionGraph?.truncated">·</span>
                            <span v-if="evolutionGraph?.truncated" class="warn">结果较多，已截断</span>
                        </div>
                    </div>
                    <div class="evolution-actions">
                        <el-button link size="small" @click="refreshEvolution()">刷新</el-button>
                        <el-button link size="small" @click="evolutionCenterId = null">关闭</el-button>
                    </div>
                </header>
                <div v-if="evolutionLoading" class="evolution-loading"><div class="spinner"></div></div>
                <div v-else-if="evolutionGraph" class="evolution-flow">
                    <div class="flow-rail" :class="{ 'rail-empty': evolutionFlowNodes().length === 0 }">
                        <div
                            v-for="(node, i) in evolutionFlowNodes()"
                            :key="node.id + '-' + i"
                            class="flow-node"
                            :class="flowNodeClass(node, i)"
                            @click="onEvolutionNodeClick(node.id)"
                        >
                            <div class="flow-node-tag">{{ flowNodeTag(node, i) }}</div>
                            <div class="flow-node-id">#{{ node.id }}</div>
                            <div class="flow-node-text" :title="node.text">{{ truncateFlowText(node.text) }}</div>
                            <div class="flow-node-time" v-if="node.submitTime">📅 {{ fmtDate(node.submitTime) }}</div>
                        </div>
                    </div>
                    <div v-if="evolutionFlowNodes().length === 0" class="flow-empty">
                        暂无母体或衍生梗；可以再点几个关联梗试试。
                    </div>
                </div>
            </section>

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

        <!-- DNA Dialog: ECharts 力导向图 -->
        <el-dialog  draggable  v-model="dnaVisible" :title="`🧬 梗 DNA 关联图谱 #${dnaCenterId}`" width="95%" top="5vh" :close-on-click-modal="true" @close="dnaChart?.dispose()">
            <div v-if="dnaLoading" class="dna-loading">
                <div class="helix"><span v-for="n in 6" :key="n" class="helix-dot" :style="{ animationDelay: n * 0.15 + 's' }"></span></div>
                <div>分析关联中…</div>
            </div>
            <div v-else-if="!dnaGraphData || !dnaGraphData.edges.length" class="empty">暂无关联梗，这个梗还很孤独 🥲</div>
            <div v-else class="dna-graph-layout">
                <div id="dna-echarts" class="dna-echarts-container"></div>
                <div class="dna-sidebar">
                    <div v-if="selectedNode" class="dna-info-card">
                        <div class="info-header">
                            <span class="info-id">#{{ selectedNode.id }}</span>
                            <el-button link size="small" @click="selectedNode = null">✕</el-button>
                        </div>
                        <div class="info-text">{{ selectedNode.text }}</div>
                        <div class="info-meta" v-if="selectedNode.submitTime">📅 {{ selectedNode.submitTime }}</div>
                        <el-divider style="margin:8px 0" />
                        <div class="info-row"><span class="info-label">关键词</span><span class="info-value">{{ (selectedNode.keywords || []).join('、') || '—' }}</span></div>
                        <div class="info-row"><span class="info-label">固定片段</span><span class="info-value">{{ (selectedNode.fixedParts || []).join(' / ') || '—' }}</span></div>
                        <div class="info-row"><span class="info-label">可变槽位</span><span class="info-value">{{ formatSlots((selectedNode as any).slots) }}</span></div>
                        <div class="info-row"><span class="info-label">结构模板</span><span class="info-value info-pattern">{{ formatTemplate(selectedNode.template) }}</span></div>
                        <div class="info-row"><span class="info-label">语义骨架</span><span class="info-value info-pattern">{{ formatSkeleton(selectedNode.sentenceSkeleton) }}</span></div>
                        <div class="info-row"><span class="info-label">锚点</span><span class="info-value">{{ (selectedNode.anchors || []).join('、') || '—' }}</span></div>
                    </div>
                    <div v-else class="dna-hint">👆 点击节点查看梗详情</div>
                </div>
            </div>
            <div v-if="dnaGraphData && dnaGraphData.edges.length" class="dna-legend">
            <div class="legend-header">关系类型过滤</div>
            <div class="legend-items">
                <label v-for="t in legendTypes" :key="t.value" class="legend-checkbox">
                    <input type="checkbox" v-model="t.checked" @change="applyFilter" />
                    <span class="legend-dot" :style="{ background: t.color }"></span>
                    {{ t.label }}
                </label>
            </div>
            <span class="legend-hint">双击节点以它为中心重新查询</span>
        </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { API } from '@/constants/backend';
import { get, post } from '@/apis/httpInstance';
import { useMemeTagsStore } from '@/stores/memeTags';
import { getDisplayTags } from '@/utils/tags';
import type { getMemeTags as memeTag } from '@/types/meme';
import * as echarts from 'echarts';
import { getMemeDnaGraphV6, getMemeDnaEvolutionV6 } from '@/apis/memeDnaV6';
import type {
    MemeEvolutionGraphV6 as EvolutionResult,
    MemeGraphV6 as GraphResult,
    MemeNodeV6
} from '@/types/memeDnaV6';

const memeTagsStore = useMemeTagsStore();
const allTags = ref<memeTag[]>([]);
memeTagsStore.tagsLoaded.then(() => { allTags.value = memeTagsStore.memeTags; });

interface StageStat { stage: string; cnt: number; }
interface MemeRow { barrageId: number; barrage: string; cnt: number; submitTime?: string; tags?: string; }
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

// 图表的全局字体栈：微软雅黑优先
const CHART_FONT = '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", sans-serif';

const dnaVisible = ref(false);
const dnaLoading = ref(false);
const dnaGraphData = ref<GraphResult | null>(null);
const dnaCenterId = ref(0);
const selectedNode = ref<MemeNodeV6 | null>(null);
let dnaChart: echarts.ECharts | null = null;

// 演变流程：横向时间轴，节点按投稿时间升序
const evolutionCenterId = ref<number | null>(null);
const evolutionGraph = ref<EvolutionResult | null>(null);
const evolutionLoading = ref(false);
const evolutionError = ref<string>('');

const DNA_COLORS: Record<string, string> = {
    DERIVED_FROM: '#fa541c', PARENT_OF: '#13c2c2', SAME_TEMPLATE: '#2f54eb',
    VARIANT_OF: '#faad14', HIGHLY_SIMILAR: '#52c41a'
};

const legendTypes = [
    { value: 'DERIVED_FROM', label: '衍生自', color: '#fa541c', checked: true },
    { value: 'PARENT_OF', label: '父梗', color: '#13c2c2', checked: true },
    { value: 'SAME_TEMPLATE', label: '同模板', color: '#2f54eb', checked: true },
    { value: 'VARIANT_OF', label: '变体', color: '#faad14', checked: true },
    { value: 'HIGHLY_SIMILAR', label: '高度相似', color: '#52c41a', checked: true },
];

// DNA 搜索
const dnaSearchVisible = ref(false);
const dnaSearchKey = ref('');
const dnaSearching = ref(false);
const dnaSearchResults = ref<{ id: number; barrage: string; cnt: number }[]>([]);
function formatSlots(slots: any[] | null | undefined): string {
    if (!slots || slots.length === 0) return '—';
    return slots.map(s => {
        if (typeof s === 'string') return s;
        // DnaSlotV6: { type, value, startIndex, endIndex }
        if (s && typeof s === 'object') return s.value || s.type || '?';
        return String(s);
    }).join('、');
}

/** {PREDICATE}{ENTITY}… → [谓语][实体]… */
function formatTemplate(tpl: string | null | undefined): string {
    if (!tpl) return '—';
    return tpl.replace(/\{(\w+)\}/g, (_, label: string) => `[${SLOT_CN[label] || label}]`);
}

/** PREDICATE-FIXED-ENTITY… → 谓语→固定→实体… */
function formatSkeleton(skel: string | null | undefined): string {
    if (!skel) return '—';
    return skel.split('-').map(s => SLOT_CN[s] || s).join(' → ');
}

const SLOT_CN: Record<string, string> = {
    PREDICATE: '谓语', ENTITY: '实体', QUANTITY: '数量', LOCATION: '地点',
    TIME: '时间', MODIFIER: '修饰', CONTENT: '任意', FIXED: '固定',
    PARTICLE: '助词', PREDICATE_PARTICLE: '谓助',
};

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
    dnaGraphData.value = null;
    dnaCenterId.value = barrageId;
    getMemeDnaGraphV6(barrageId).then((r) => {
        dnaLoading.value = false;
        if (!r._failure && (r as any).flatData) {
            dnaGraphData.value = (r as any).flatData as GraphResult;
            nextTick(() => initDnaChart());
        }
    });
    // 同时拉取演变流程；失败不影响 DNA 弹窗
    loadEvolution(barrageId);
}

const evolutionFlowNodes = () => {
    if (!evolutionGraph.value) return [] as Array<{
        id: number; text: string; submitTime?: string;
        side: 'ancestor' | 'center' | 'descendant'; index: number;
    }>;
    const ancestors = evolutionGraph.value.ancestors || [];
    const descendants = evolutionGraph.value.descendants || [];
    const out: Array<{ id: number; text: string; submitTime?: string;
        side: 'ancestor' | 'center' | 'descendant'; index: number; }> = [];
    ancestors.forEach((n, i) => {
        out.push({ id: n.id, text: n.text, submitTime: n.submitTime, side: 'ancestor', index: i });
    });
    out.push({
        id: evolutionCenterId.value || 0,
        text: evolutionGraph.value.center?.text || '',
        submitTime: evolutionGraph.value.center?.submitTime,
        side: 'center',
        index: ancestors.length
    });
    descendants.forEach((n, i) => {
        out.push({
            id: n.id, text: n.text, submitTime: n.submitTime,
            side: 'descendant', index: ancestors.length + 1 + i
        });
    });
    return out;
};

async function loadEvolution(memeId: number) {
    evolutionCenterId.value = memeId;
    evolutionLoading.value = true;
    evolutionError.value = '';
    try {
        // const r = await getMemeDnaEvolutionV6(memeId);
        // if (r._failure || !(r as any).flatData) {
        //     evolutionError.value = (r as any).msg || '拉取演变流程失败';
        //     evolutionGraph.value = null;
        // } else {
        //     evolutionGraph.value = (r as any).flatData as EvolutionResult;
        // }
    } catch (e: any) {
        evolutionError.value = e?.message || '拉取演变流程失败';
        evolutionGraph.value = null;
    } finally {
        evolutionLoading.value = false;
    }
}

function refreshEvolution() {
    if (evolutionCenterId.value) loadEvolution(evolutionCenterId.value);
}

function onEvolutionNodeClick(id: number) {
    if (id && id !== evolutionCenterId.value) loadEvolution(id);
}

function flowNodeClass(node: { side: string }, _i: number) {
    return `flow-node-${node.side}`;
}

function flowNodeTag(node: { side: string }, _i: number) {
    if (node.side === 'ancestor') return '母体';
    if (node.side === 'descendant') return '衍生';
    return '当前';
}

function truncateFlowText(text: string, max = 22) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
}

// 工具函数：把长文本按每行 maxChars 拆分成多行，返回 { text, lines, height, maxLineChars }
// 中文字宽约为 fontSize 的 0.72 倍，用于宽度估算
function wrapText(text: string, maxChars = 36): { text: string; lineCount: number; height: number; maxLineChars: number } {
    if (!text) return { text: '', lineCount: 0, height: 0, maxLineChars: 0 };
    const lines: string[] = [];
    let current = '';
    for (const ch of text) {
        if (current.length >= maxChars) {
            lines.push(current);
            current = ch;
        } else {
            current += ch;
        }
    }
    if (current) lines.push(current);
    const lineCount = lines.length;
    const lineHeight = 18; // 行高
    const paddingV = 12;   // 上下内边距
    const maxLineChars = Math.max(...lines.map(l => l.length), 0);
    return { text: lines.join('\n'), lineCount, height: lineCount * lineHeight + paddingV * 2, maxLineChars };
}

function initDnaChart() {
    const el = document.getElementById('dna-echarts');
    if (!el || !dnaGraphData.value) return;
    if (dnaChart) dnaChart.dispose();
    const g = dnaGraphData.value;
    dnaChart = echarts.init(el);
    const idSet = new Set<number>();
    const nodes: any[] = [];
    const links: any[] = [];

    // center
    const centerWrap = wrapText(g.center.text || '', 42);
    // 宽度按最大字符数估算，字宽 ~0.72 * fontSize，额外加左右内边距
    const centerFontSize = 13;
    const centerCharWidth = centerFontSize * 0.72;
    const centerWidth = Math.max(centerWrap.maxLineChars * centerCharWidth + 32, 220);
    nodes.push({
        id: g.center.id,
        name: centerWrap.text,
        symbol: 'rect',
        symbolSize: [centerWidth, centerWrap.height],
        symbolKeepAspect: false,
        itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#5b21b6' }
            ]),
            borderRadius: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(114, 46, 209, 0.4)'
        },
        label: {
            show: true,
            fontSize: centerFontSize,
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: CHART_FONT,
            formatter: '{b}',
            align: 'center',
            verticalAlign: 'middle',
            padding: [6, 14],
            lineHeight: 22,
            width: centerWidth - 28,
            overflow: 'break',
        },
        raw: g.center
    });
    idSet.add(g.center.id);
    const nodeColor: Record<number, string> = {};
    for (const e of g.edges) if (!nodeColor[e.targetId]) nodeColor[e.targetId] = DNA_COLORS[e.relationType] || '#8c8c8c';
    for (const n of g.nodes) {
        if (idSet.has(n.id)) continue;
        const text = n.text || '';
        const wrap = wrapText(text, 36);
        const nFontSize = 11;
        const nCharWidth = nFontSize * 0.72;
        const nWidth = Math.max(wrap.maxLineChars * nCharWidth + 32, 140);
        nodes.push({
            id: n.id,
            name: wrap.text,
            symbol: 'rect',
            symbolSize: [nWidth, wrap.height],
            symbolKeepAspect: false,
            itemStyle: {
                color: nodeColor[n.id] || '#8c8c8c',
                borderRadius: 2,
                opacity: 0.95,
                shadowBlur: 4,
                shadowColor: 'rgba(0,0,0,0.1)'
            },
            label: {
                show: true,
                fontSize: nFontSize,
                color: '#222',
                fontFamily: CHART_FONT,
                formatter: '{b}',
                align: 'center',
                padding: [6, 14],
                lineHeight: 18,
                width: nWidth - 28,
                overflow: 'break',
            },
            raw: n
        });
        idSet.add(n.id);
    }
    for (const e of g.edges) {
        if (!legendTypes.find(t => t.value === e.relationType)?.checked) continue;
        links.push({
            source: '' + e.sourceId, target: '' + e.targetId,
            lineStyle: { type: e.relationType === 'DERIVED_FROM' ? 'solid' : (e.score >= 0.7 ? 'solid' : 'dashed'), width: Math.max(0.5, e.score * 3), color: DNA_COLORS[e.relationType] || '#8c8c8c' },
            raw: e
        });
    }
    dnaChart.setOption({
        tooltip: {
            extraCssText: `font-family:${CHART_FONT};font-size:11px;max-width:320px;`,
            formatter: (p: any) => {
                if (p.dataType === 'node') {
                    const n = p.data?.raw;
                    if (!n) return p.name;
                    const time = n.submitTime ? `<br/>📅 ${n.submitTime}` : '';
                    const kw = (n.keywords || []).slice(0, 5).join('、') || '—';
                    const line = [n.id, n.text].filter(Boolean).join(' ') + time;
                    return `<b>#${line}</b><br/>🔑 ${kw}<br/>`;
                }
                if (p.dataType === 'edge') {
                    const e = p.data?.raw;
                    if (!e) return '';
                    const pct = ((e.score || 0) * 100).toFixed(1);
                    const b = e.breakdown || {};
                    const num = (v: any) => `${((v || 0) * 100).toFixed(0)}%`;
                    const shared = (b.sharedAnchors || []).join('、') || '—';
                    const replacements = (b.slotReplacements || []).join('、') || '—';
                    return `<b>${e.relationLabel || e.relationType}</b> 相似度 ${pct}%<br/>`
                        + `模板 ${num(b.templateScore)} · 结构 ${num(b.structureScore)}<br/>`
                        + `固定片段 ${num(b.fixedPartScore)} · 槽位 ${num(b.slotPatternScore)}<br/>`
                        + `共享锚点：${shared}<br/>`
                        + `替换：${replacements}`;
                }
                return '';
            }
        },
        animation: true,
        series: [{
            type: 'graph', layout: 'force', data: nodes, links, roam: true, draggable: true,
            force: { friction: 0.25, repulsion: 800, gravity: 0.05, edgeLength: [200, 550] },
            emphasis: { focus: 'adjacency', lineStyle: { width: 7 } },
            label: { fontSize: 10 }
        }]
    }, true);
    dnaChart.on('click', (params: any) => {
        if (params.dataType === 'node' && params.data?.raw) {
            selectedNode.value = params.data.raw;
        }
    });
    dnaChart.on('dblclick', (params: any) => {
        if (params.dataType === 'node' && params.data?.raw?.id) {
            selectedNode.value = null;
            openDna(params.data.raw.id);
        }
    });
}

function applyFilter() {
    if (dnaChart && dnaGraphData.value) {
        initDnaChart();
    }
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
    background: var(--content-bg);
}
.page-title {
    font-size: 24px; font-weight: 900;
    background: linear-gradient(90deg, #36cfc9, #409eff, #722ed1);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    margin: 0 0 4px;
}
.page-sub { color: var(--body-color); font-size: 14px; line-height: 1.6; margin: 0 0 12px; }

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
.dna-hero-text strong { font-size: 16px; color: var(--body-color); }
.dna-hero-text span { font-size: 13px; color: var(--body-color); opacity: 0.7; }
.dna-hero-arrow { font-size: 24px; color: #409eff; animation: arrow-bounce 1.2s ease infinite; }
@keyframes arrow-bounce { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }

.loading { text-align: center; color: var(--body-color); padding: 40px; }
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
    background: var(--card-bg); min-width: 36px; height: 36px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    white-space: nowrap;
}
.node-BIRTH .node-count { color: #36cfc9; border: 2px solid #36cfc9; }
.node-BOOM .node-count { color: #ff6b35; border: 2px solid #ff6b35; }
.node-STALE .node-count { color: #8a6d3b; border: 2px solid #8a6d3b; }
.node-DEAD .node-count { color: var(--body-color); border: 2px solid #bbb; }
.node-count.zero { opacity: 0.4; }

/* Stage Grid — PC 多列，窄屏自适应 */
.stage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 14px;
    align-items: start;
}
.stage-panel {
    background: var(--card-bg); border-radius: 14px; padding: 14px;
    border: 2px solid var(--el-border-color-lighter, #f0f0f0); transition: border-color 0.3s, box-shadow 0.3s;
}
.stage-panel:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.panel-birth { border-color: var(--el-color-success-light-8, #b5f5ec); }
.panel-boom { border-color: var(--el-color-warning-light-8, #ffd8bf); }
.panel-stale { border-color: var(--el-border-color-lighter, #e8e8e8); }
.panel-dead { border-color: var(--el-border-color-lighter, #f0f0f0); }

.panel-header {
    display: flex; align-items: center; gap: 8px;
    margin: 0 0 10px; font-size: 16px; font-weight: 700;
}
.hdr-icon { font-size: 18px; }
.hdr-count {
    margin-left: auto; font-size: 13px; font-weight: 700;
    background: var(--el-fill-color-light, #f0f0f0); border-radius: 10px; padding: 1px 8px; color: var(--body-color);
    opacity: 0.7;
}
.hdr-BIRTH { color: #36cfc9; }
.hdr-BOOM { color: #ff6b35; }
.hdr-STALE { color: #8a6d3b; }
.hdr-DEAD { color: var(--body-color); }

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
    padding: 7px 4px; border-bottom: 1px dashed var(--el-border-color-lighter, #f0f0f0);
    font-size: 14px; cursor: pointer; transition: background 0.2s;
}
.meme-item:hover { background: var(--el-fill-color-light, #fafafa); }
.meme-meta { color: var(--body-color); font-size: 12px; white-space: nowrap; }

.panel-loading { text-align: center; padding: 10px; }
.mini-spinner {
    width: 20px; height: 20px; border: 2px solid #eee; border-top-color: #409eff;
    border-radius: 50%; margin: 0 auto; animation: spin 0.7s linear infinite;
}
.panel-end { text-align: center; color: var(--body-color); font-size: 12px; padding: 10px; }
.panel-empty { text-align: center; color: var(--body-color); padding: 20px; }
.sentinel { height: 1px; }

/* DNA */
.dna-loading { text-align: center; padding: 30px; color: var(--body-color); }
.helix { display: flex; justify-content: center; gap: 6px; margin-bottom: 10px; }
.helix-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: linear-gradient(135deg, #36cfc9, #409eff);
    animation: helix-bounce 1.2s ease-in-out infinite;
}
@keyframes helix-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
/* DNA Graph */
.dna-graph-layout {
    display: flex; gap: 12px; height: calc(90vh - 200px); min-height: 480px;
}
.dna-echarts-container {
    flex: 1; min-width: 0; height: 100%; border-radius: 12px; background: var(--content-bg);
}
.dna-sidebar {
    width: 260px; flex-shrink: 0; overflow-y: auto; max-height: 100%;
}
.dna-info-card {
    background: var(--card-bg); border: 1px solid var(--el-border-color-lighter, #ebeef5); border-radius: 10px; padding: 12px;
}
.info-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
}
.info-id { font-weight: 700; color: var(--el-color-primary, #722ed1); font-size: 14px; }
.info-text {
    font-size: 14px; color: var(--body-color); line-height: 1.5; word-break: break-all;
    max-height: 100px; overflow-y: auto; margin-bottom: 4px;
}
.info-meta { font-size: 12px; color: var(--body-color); margin-bottom: 4px; }
.info-row { display: flex; gap: 6px; margin-bottom: 4px; font-size: 12px; }
.info-label { min-width: 50px; font-weight: 600; color: var(--body-color); flex-shrink: 0; }
.info-value { color: var(--body-color); word-break: break-all; }
.info-pattern { max-height: 60px; overflow-y: auto; }
.dna-hint { text-align: center; color: var(--body-color); padding: 60px 0; font-size: 14px; }
@media (max-width: 768px) {
    .dna-graph-layout { flex-direction: column; }
    .dna-echarts-container { height: 400px; }
    .dna-sidebar { width: 100%; max-height: 300px; }
}

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
    background: var(--card-bg); border-radius: 12px;
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
.card-rel { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--el-fill-color-light, #f0f0f0); color: var(--body-color); opacity: 0.7; }
.dna-card.rel-PARENT .card-rel { background: var(--el-color-primary-light-8, #f9f0ff); color: var(--el-color-primary, #722ed1); }
.dna-card.rel-CHILD .card-rel { background: var(--el-color-success-light-8, #e6fffb); color: var(--el-color-success, #13c2c2); }
.dna-card.rel-SIMILAR .card-rel { background: var(--el-color-info-light-8, #e6f7ff); color: var(--el-color-info, #1890ff); }
.card-pct { font-size: 13px; font-weight: 800; color: var(--body-color); }
.card-text {
    font-size: 13px; color: var(--body-color); line-height: 1.5; word-break: break-all;
    max-height: 150px; overflow-y: auto;
}

/* 图例 */
.dna-legend {
    display: flex; align-items: center; gap: 16px; justify-content: center;
    margin-top: 12px; font-size: 12px; color: var(--body-color); opacity: 0.7; flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-item .swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.swatch.sim-high { background: #ff4d4f; }
.swatch.sim-mid { background: #fa8c16; }
.swatch.sim-low { background: #409eff; }
.line-swatch { width: 22px; height: 0; border-top: 3px solid #409eff; display: inline-block; }
.line-swatch.dashed { border-top-style: dashed; border-top-color: var(--el-color-primary, #722ed1); }
.legend-hint { color: var(--body-color); opacity: 0.6; font-size: 11px; }
.empty { color: var(--body-color); text-align: center; padding: 16px; }
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
.submit-time { color: var(--body-color); opacity: 0.6; font-size: 12px; }

/* Meme Meta */
.meme-meta {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 12px; color: var(--body-color);
}
.dna-badge {
    color: var(--el-color-primary, #722ed1); cursor: pointer; font-weight: 600;
    transition: color 0.2s;
    &:hover { color: #409eff; }
}
.dna-tip { font-size: 13px; color: var(--body-color); }

/* DNA Search Dialog */
.dna-search-loading { text-align: center; color: var(--body-color); padding: 20px; }
.dna-search-empty { text-align: center; color: var(--body-color); padding: 20px; }
.dna-search-list { list-style: none; margin: 12px 0 0; padding: 0; max-height: 360px; overflow-y: auto; }
.dna-search-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-bottom: 1px solid var(--el-border-color-lighter, #f0f0f0); cursor: pointer;
    transition: background 0.15s;
    &:hover { background: var(--el-fill-color-light, #f5f5f5); }
}
.dna-search-text { font-size: 14px; flex: 1; margin-right: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dna-search-cnt { font-size: 12px; color: var(--body-color); flex-shrink: 0; }

/* DNA Legend 复选框 */
.dna-legend {
    margin-top: 12px; padding: 10px 12px; background: var(--el-fill-color-blank, #fafafa);
    border: 1px solid var(--el-border-color-lighter, #ebeef5); border-radius: 8px; font-size: 12px;
}
.legend-header { font-weight: 700; color: var(--body-color); margin-bottom: 6px; }
.legend-items { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.legend-checkbox {
    display: flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 2px 6px; border-radius: 4px; transition: background 0.15s;
    &:hover { background: #f0f0f0; }
}
.legend-checkbox input { width: 14px; height: 14px; accent-color: #409eff; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-hint { color: var(--body-color); opacity: 0.6; font-size: 11px; }

/* 演变流程：横向时间轴 */
.evolution-card {
    margin: 20px 0 4px;
    padding: 16px 18px;
    background: var(--card-bg);
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: 14px;
}
.evolution-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.evolution-title { font-size: 15px; font-weight: 700; color: var(--body-color); }
.evolution-sub { font-size: 12px; color: var(--body-color); opacity: 0.7; margin-top: 4px; }
.evolution-sub .dot { margin: 0 6px; opacity: 0.5; }
.evolution-sub .warn { color: #fa8c16; }
.evolution-actions { display: flex; gap: 4px; flex-shrink: 0; }
.evolution-loading { display: flex; justify-content: center; padding: 16px; }
.evolution-flow { padding-top: 4px; }
.flow-rail {
    display: flex;
    align-items: stretch;
    gap: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px 4px 14px;
    scrollbar-width: thin;
}
.flow-rail.rail-empty { padding-top: 0; }
.flow-node {
    flex: 0 0 auto;
    min-width: 168px;
    max-width: 220px;
    margin-right: 18px;
    padding: 10px 12px;
    background: var(--content-bg);
    border-radius: 10px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-left: 3px solid #d9d9d9;
    cursor: pointer;
    position: relative;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.flow-node:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
.flow-node-ancestor { border-left-color: #722ed1; }
.flow-node-center {
    border-left-color: #fa8c16;
    background: linear-gradient(135deg, rgba(250,140,22,0.08), rgba(250,140,22,0.02));
    box-shadow: 0 2px 8px rgba(250,140,22,0.18);
}
.flow-node-descendant { border-left-color: #13c2c2; }
.flow-node-tag {
    display: inline-block;
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 10px;
    background: var(--el-fill-color-light, #f0f0f0);
    color: var(--body-color);
    margin-bottom: 4px;
}
.flow-node-ancestor .flow-node-tag { background: #f9f0ff; color: #722ed1; }
.flow-node-center .flow-node-tag { background: #fff7e6; color: #d46b08; }
.flow-node-descendant .flow-node-tag { background: #e6fffb; color: #13c2c2; }
.flow-node-id { font-size: 12px; color: var(--body-color); opacity: 0.6; }
.flow-node-text {
    font-size: 13px; font-weight: 600; color: var(--body-color);
    line-height: 1.4;
    margin-top: 4px;
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.flow-node-time { font-size: 11px; color: var(--body-color); opacity: 0.6; margin-top: 4px; }
.flow-node::after {
    content: '→';
    position: absolute;
    right: -16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--el-color-primary, #409eff);
    font-size: 18px;
    pointer-events: none;
    opacity: 0.7;
}
.flow-node:last-child::after { display: none; }
.flow-empty { text-align: center; color: var(--body-color); opacity: 0.6; padding: 12px 0 6px; }
@media (max-width: 640px) {
    .flow-node { min-width: 140px; max-width: 180px; }
    .evolution-header { flex-direction: column; align-items: stretch; }
    .evolution-actions { justify-content: flex-end; }
}
</style>
