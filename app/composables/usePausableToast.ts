// composables/usePausableToast.js
import { nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { ToastMessageOptions } from 'primevue/toast';

export function usePausableToast() {
	const toast = useToast();

	function add(
		severityOrMessage: 'success' | 'info' | 'warn' | 'error' | ToastMessageOptions,
		summary?: string,
		detail?: string,
		life?: number,
	) {
		let message: ToastMessageOptions;

		if (typeof severityOrMessage === 'object') {
			message = severityOrMessage;
		} else {
			message = { severity: severityOrMessage, summary: summary!, detail, life };
		}

		if (!message.life) {
			// No life set — add normally (sticky)
			toast.add(message);
			return;
		}

		const lifeTime = message.life;
		// Spread so we keep a stable reference; strip `life` so PrimeVue never
		// auto-removes it — we manage the timer ourselves.
		const managed = { ...message, life: undefined };
		toast.add(managed);

		nextTick(() => {
			// PrimeVue appends each new message last in the toast container,
			// so the most recently added element is always the last one.
			const all = document.querySelectorAll('.p-toast-message');
			const el = all[all.length - 1];
			if (!el) return;

			let remaining = lifeTime;
			let startTime = Date.now();
			let timer: ReturnType<typeof setTimeout> | null = null;

			function start(ms: number) {
				startTime = Date.now();
				timer = setTimeout(() => {
					cleanup();
					toast.remove(managed);
				}, ms);
			}

			function onEnter() {
				if (timer) clearTimeout(timer);
				// Capture how much time has elapsed since the timer last started
				remaining = Math.max(0, remaining - (Date.now() - startTime));
			}

			function onLeave() {
				if (remaining > 0) start(remaining);
			}

			function cleanup() {
				el!.removeEventListener('mouseenter', onEnter);
				el!.removeEventListener('mouseleave', onLeave);
			}

			el!.addEventListener('mouseenter', onEnter);
			el!.addEventListener('mouseleave', onLeave);
			start(lifeTime);
		});
	}

	function remove(message: ToastMessageOptions) {
		return toast.remove(message);
	}

	function removeGroup(group: string) {
		return toast.removeGroup(group);
	}

	function removeAllGroups() {
		return toast.removeAllGroups();
	}

	return {
		add,
		remove,
		removeGroup,
		removeAllGroups,
	}
}
