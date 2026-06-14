export function useTextOverflow() {
	const spanRefs = ref<Record<string, HTMLElement | null>>({})
	const overflowStates = ref<Record<string, boolean>>({})

	function setRef(id: string, el: HTMLElement | null) {
		spanRefs.value[id] = el
		checkOverflow(id)
	}

	function checkOverflow(id: string) {
		const el = spanRefs.value[id]
		if (el) overflowStates.value[id] = el.scrollWidth > el.offsetWidth
	}

	function isOverflow(id: string) {
		return overflowStates.value[id] ?? false
	}

	return { setRef, checkOverflow, isOverflow }
}
