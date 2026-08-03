import { get } from '@/apis/httpInstance';
import { API } from '@/constants/backend';
import type { MemeGraphV6, MemeEvolutionGraphV6 } from '@/types/memeDnaV6';

export function getMemeDnaGraphV6(memeId: number) {
    return get<MemeGraphV6>(`${API.DNA_RELATIONS_V6}/${memeId}`);
}

export function getMemeDnaEvolutionV6(memeId: number) {
    return get<MemeEvolutionGraphV6>(`${API.DNA_RELATIONS_V6}/${memeId}/evolution`);
}
