import treeUtils from './treeutils'

export class mathUtils {
	static getRandomValues(arrayLength: number, maxValue: number): Array<number> {
		return new Array(arrayLength)
			.fill(0)
			.map(() => Math.round(Math.random() * maxValue))
	}

	static getAverage(numArray: number[]) {
		const sum = numArray.reduce((prev, curr) => {
			return prev + +curr // the newly pushed numbers are handled like strings, need to cast curr
		}, 0)

		return Math.round((sum / numArray.length) * 100) / 100
	}

	static hex2rgb = (c: string) =>
		`rgb(${c.match(/\w\w/g)?.map(x => +`0x${x}`)})`
	// static rgb2hex = (c: string) =>
	//   '#' +
	//   c
	//     .match(/\d+/g)
	//     ?.map((x) => (+x).toString(16).padStart(2, 0))
	//     .join(``)
}

export class uiElementUtils {
	static getPosition(el: Element) {
		const rect = el.getBoundingClientRect()
		return {
			left: rect.left + window.scrollX,
			top: rect.top + window.scrollY,
		}
	}

	static row: Element
	static rowDragStart(e: UIEvent) {
		if (e.target) this.row = e.target as Element
	}
	static rowDragOver(e: UIEvent) {
		e.preventDefault()

		const target = e.target as Element
		const parentNode = target.parentNode as Element
		const topParentNode = parentNode.parentNode as Element
		if (topParentNode != null) {
			const children = Array.from(topParentNode.children)
			if (children.indexOf(parentNode) > children.indexOf(this.row))
				parentNode.after(this.row)
			else parentNode.before(this.row)
		}
	}

	/**
	 * Delayed execution after mouse stops moving on an element(uses both 'mousemove' and 'mouseleave/mouseout' events).
	 *
	 * @param  fn          A function to be executed after delay milliseconds debounced.
	 * @param  parentSelector    A selector for the parent element when the child is hovered.
	 * @param  ms          A zero-or-greater delay in milliseconds.
	 *
	 * @return A new delayed hover function.
	 */
	static delayedHover(
		fn: (elem: HTMLElement) => void,
		parentSelector?: string,
		ms?: number,
	): (e: MouseEvent) => void {
		let debounceHighlight: number
		return (e: MouseEvent) => {
			const el = parentSelector?.length
				? ((e.target as Element).closest(parentSelector) as HTMLElement)
				: (e.target as HTMLElement)

			if (el) {
				clearTimeout(debounceHighlight)
				//console.log(e.x)
				if (e.type !== 'mouseleave' && e.type !== 'mouseout') {
					debounceHighlight = window.setTimeout(() => {
						if (el) fn(el)
					}, ms)
				}
			}
		}
	}

	showTooltip(anchorElem: HTMLElement, html: string) {
		let tooltipElem = document.createElement('div')
		tooltipElem.className = 'tooltip'
		tooltipElem.innerHTML = html
		document.body.append(tooltipElem)

		let coords = anchorElem.getBoundingClientRect()

		// position the tooltip over the center of the element
		let left =
			coords.left + (anchorElem.offsetWidth - tooltipElem.offsetWidth) / 2
		if (left < 0) left = 0

		let top = coords.top - tooltipElem.offsetHeight - 5
		if (top < 0) {
			top = coords.top + anchorElem.offsetHeight + 5
		}

		tooltipElem.style.left = left + 'px'
		tooltipElem.style.top = top + 'px'

		return tooltipElem
	}
}

function getSelectedWord() {
	const sel = window.getSelection()
	const str = sel?.anchorNode?.nodeValue
	if (str) {
		const len = str.length
		let a = sel.anchorOffset
		let b = a

		if (a) {
			while (str[a] != ' ' && a--) {}

			if (str[a] == ' ') a++ // start of word

			while (str[b] != ' ' && b++ < len) {} // end of word+1
		}

		console.log(str.substring(a, b))
	}
}

// Callback function to execute when mutations are observed
function observeNode(
	mutationType: string = '',
	callback: (mt: MutationRecord, nd: Node) => boolean | undefined,
	config: MutationObserverInit,
): MutationObserver {
	const observer = new MutationObserver(list => {
		observer.observe(document.head, config)

		for (const mutation of list) {
			if (mutationType === '' || mutation.type === mutationType) {
				for (let i = 0; i < mutation.addedNodes.length; i++) {
					if (callback(mutation, mutation.addedNodes[i]!)) {
						break
					}
				}
			}
		}
	})
	return observer
}

export function formatNumber(
	value: number | null | undefined,
	maximumFractionDigits = 2,
	suffix = '',
): string {
	if (value == null || Number.isNaN(value)) return '-'
	return value.toLocaleString(undefined, { maximumFractionDigits }) + suffix
}

export function formatCurrency(
	value: number | null | undefined,
	maximumFractionDigits = 0,
): string {
	if (value == null || Number.isNaN(value)) return '-'
	return value.toLocaleString(undefined, {
		style: 'currency',
		currency: 'USD',
		currencyDisplay: 'narrowSymbol',
		maximumFractionDigits,
	})
}

export class utils {
	static math = mathUtils
	static uiElements = uiElementUtils
	static tree = treeUtils
}
