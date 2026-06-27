<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { MeasurementType } from '~~/prisma/generated/client/enums'

interface Unit {
	key: string
	label: string // abbreviation shown in the dropdown (e.g. "kg")
	name: string // full name used for the option description
	factor: number // displayValue = modelValue (in base unit) * factor
}

// modelValue is always expressed in the BASE (metric) unit of each type:
// Weight -> kg, Volume -> m^3, Length -> m, Area -> m^2, Energy -> J,
// Time -> h, Units -> pieces.
const UNITS_BY_TYPE: Record<MeasurementType, Unit[]> = {
	[MeasurementType.None]: [],
	[MeasurementType.Units]: [
		{ key: 'pcs', label: 'pcs', name: 'Pieces', factor: 1 },
		{ key: 'dz', label: 'dz', name: 'Dozens', factor: 1 / 12 },
	],
	[MeasurementType.Time]: [
		{ key: 'd', label: 'd', name: 'Days', factor: 1 / 24 },
		{ key: 'h', label: 'h', name: 'Hours', factor: 1 },
		{ key: 'min', label: 'min', name: 'Minutes', factor: 60 },
		{ key: 's', label: 's', name: 'Seconds', factor: 3600 },
	],
	[MeasurementType.Weight]: [
		{ key: 't', label: 't', name: 'Tons', factor: 0.001 },
		{ key: 'kg', label: 'kg', name: 'Kilograms', factor: 1 },
		{ key: 'g', label: 'g', name: 'Grams', factor: 1000 },
	],
	[MeasurementType.Volume]: [
		{ key: 'm3', label: 'm³', name: 'Cubic metres', factor: 1 },
		{ key: 'L', label: 'L', name: 'Litres', factor: 1000 },
		{ key: 'cm3', label: 'cm³', name: 'Cubic centimetres', factor: 1_000_000 },
	],
	[MeasurementType.Area]: [
		{ key: 'km2', label: 'km²', name: 'Square kilometres', factor: 0.000_001 },
		{ key: 'ha', label: 'ha', name: 'Hectares', factor: 0.0001 },
		{ key: 'm2', label: 'm²', name: 'Square metres', factor: 1 },
		{ key: 'cm2', label: 'cm²', name: 'Square centimetres', factor: 10_000 },
	],
	[MeasurementType.Length]: [
		{ key: 'km', label: 'km', name: 'Kilometres', factor: 0.001 },
		{ key: 'm', label: 'm', name: 'Metres', factor: 1 },
		{ key: 'cm', label: 'cm', name: 'Centimetres', factor: 100 },
		{ key: 'mm', label: 'mm', name: 'Millimetres', factor: 1000 },
	],
	[MeasurementType.Energy]: [
		{ key: 'kWh', label: 'kWh', name: 'Kilowatt-hours', factor: 1 / 3_600_000 },
		{ key: 'kJ', label: 'kJ', name: 'Kilojoules', factor: 0.001 },
		{ key: 'J', label: 'J', name: 'Joules', factor: 1 },
	],
}

const props = withDefaults(
	defineProps<{
		modelValue?: number | null
		measurementType: MeasurementType
		disabled?: boolean
		placeholder?: string
	}>(),
	{
		modelValue: null,
		disabled: false,
		placeholder: 'Quantity',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: number | undefined]
}>()

const unitOptions = computed<Unit[]>(
	() => UNITS_BY_TYPE[props.measurementType] ?? [],
)

const selectedUnitKey = ref<string>('')

// Pick the unit whose converted display value falls in a readable range
// ([1, 1000)) for the given base value. Units are tried from largest to
// smallest so the largest unit that still yields a display value >= 1 wins.
function pickUnitKey(base: number | null | undefined, units: Unit[]): string {
	if (!units.length) return ''
	if (base == null || !isFinite(base) || base === 0) {
		return (units.find(u => u.factor === 1) ?? units[0])!.key
	}
	const abs = Math.abs(base)
	const sorted = [...units].sort((a, b) => a.factor - b.factor) // largest unit first
	for (const u of sorted) {
		if (abs * u.factor >= 1) return u.key
	}
	return sorted[sorted.length - 1]!.key // value too small: use the smallest unit
}

function autoSelectUnit(base: number | null | undefined) {
	selectedUnitKey.value = pickUnitKey(base, unitOptions.value)
}

// Guard so auto-selection only reacts to externally-driven value changes,
// not to values the user types into the textbox.
let internalUpdate = false

// Auto-select on load and whenever the measurement type changes.
watch(
	() => props.measurementType,
	() => autoSelectUnit(props.modelValue),
	{ immediate: true },
)

// Re-evaluate the unit when the value changes from the outside (e.g. loading
// an existing request), but ignore updates triggered by our own input.
watch(
	() => props.modelValue,
	val => {
		if (internalUpdate) return
		autoSelectUnit(val)
	},
)

const currentUnit = computed<Unit | undefined>(() =>
	unitOptions.value.find(u => u.key === selectedUnitKey.value),
)

// The textbox holds the value in the selected unit; converting to/from the
// base (metric) unit so the emitted v-model is always metric.
const displayValue = computed<number | null>({
	get() {
		if (props.modelValue == null) return null
		const factor = currentUnit.value?.factor ?? 1
		return round(props.modelValue * factor)
	},
	set(val) {
		internalUpdate = true
		if (val == null) {
			emit('update:modelValue', undefined)
		} else {
			const factor = currentUnit.value?.factor ?? 1
			emit('update:modelValue', val / factor)
		}
		nextTick(() => {
			internalUpdate = false
		})
	},
})

function round(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000
}
</script>

<template>
	<div class="quantity-input">
		<InputGroup class="w-full">
			<InputNumber
				v-model="displayValue"
				:disabled="disabled"
				:placeholder="placeholder"
				class="flex-1 min-w-16 w-full" />
			<Dropdown
				v-if="unitOptions.length > 1"
				v-model="selectedUnitKey"
				:options="unitOptions"
				optionLabel="label"
				optionValue="key"
				:disabled="disabled"
				class="unit-dropdown flex-none" />
		</InputGroup>
	</div>
</template>

<style scoped>
.quantity-input {
	width: 100%;
}

.unit-dropdown {
	width: 6.5rem;
}

.unit-dropdown :deep(.p-dropdown-label) {
	justify-content: center;
}
</style>
