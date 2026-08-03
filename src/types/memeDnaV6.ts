export interface DnaSlotV6 {
    type: string;
    value: string;
    startIndex: number;
    endIndex: number;
}

export interface MemeNodeV6 {
    id: number;
    text: string;
    submitTime?: string;
    normalizedText: string;
    fixedParts: string[];
    slots: DnaSlotV6[];
    keywords: string[];
    anchors: string[];
    template: string;
    sentenceSkeleton: string;
    fingerprint: string;
}

export interface DnaBreakdownV6 {
    totalScore: number;
    templateScore: number;
    structureScore: number;
    fixedPartScore: number;
    slotPatternScore: number;
    sharedAnchors: string[];
    slotReplacements: string[];
}

export interface MemeEdgeV6 {
    sourceId: number;
    targetId: number;
    relationType: 'DERIVED_FROM' | 'PARENT_OF' | 'SAME_TEMPLATE' | 'VARIANT_OF' | 'HIGHLY_SIMILAR';
    relationLabel: string;
    score: number;
    breakdown: DnaBreakdownV6;
}

export interface MemeGraphV6 {
    center: MemeNodeV6;
    nodes: MemeNodeV6[];
    edges: MemeEdgeV6[];
}

export interface MemeEvolutionGraphV6 {
    center: MemeNodeV6;
    nodes: MemeNodeV6[];
    edges: MemeEdgeV6[];
    ancestors: MemeNodeV6[];
    descendants: MemeNodeV6[];
    truncated?: boolean;
}
