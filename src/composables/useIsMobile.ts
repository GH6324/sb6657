import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/**
 * 是否是移动端composable。判断基准为屏幕最大宽度是否小于600px
 * @returns {Ref<boolean>} - 是否为移动端的响应式状态
 */
export function useIsMobile(): Ref<boolean> {
    const mobile = ref(false);
    let mediaQuery: MediaQueryList | null = null;

    function update(event: MediaQueryListEvent) {
        mobile.value = event.matches;
    }

    onMounted(() => {
        mediaQuery = window.matchMedia('(max-width: 600px)');
        mobile.value = mediaQuery.matches;
        mediaQuery.addEventListener('change', update);
    });

    onUnmounted(() => {
        mediaQuery?.removeEventListener('change', update);
    });

    return mobile;
}
