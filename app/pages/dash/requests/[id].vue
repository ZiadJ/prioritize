<script setup lang="ts">
import type {
	RequestNode,
	Proposal,
	Request,
} from '~~/prisma/generated/interfaces'
import type {
	TreeTableSelectionKeys,
	TreeTableExpandedKeys,
} from 'primevue/treetable'
import { ref, reactive, onMounted, computed, type Ref } from 'vue'
import { useWindowSize, useStyleTag } from '@vueuse/core'

import Feedback from '@/components/proposal/Feedback.vue'
import ProposalFormDialog from '@/components/proposal/ProposalFormDialog.vue'
import RequestNodeFormDialog from '@/components/requestNode/RequestNodeFormDialog.vue'
import { useTreeDragAndDrop } from '@/composables/useTreeDragAndDrop'
import {
	useProposalColumns,
	type ProposalColumn,
} from '~/composables/request/useProposalColumns'
import {
	useRequestNodes,
	type TreeNodeEx,
} from '~/composables/request/useRequestNodes'

import { json } from '@/methods/console'
import { useRoute } from 'vue-router'
import { utils } from '@/methods/utils'
import { useNuxtApp } from '#app'

definePageMeta({
	layout: 'dashboard',
})

const { data: session } = useAuth()
const route = useRoute()

const searchFilters = ref({ global: '' })
const selectedExpertiseFilter = ref<number | null>(null)

const treeTable = useTemplateRef('treeTable')

const rootNodes = ref<TreeNodeEx[]>([])
const dataLoaded = ref(false)

function filterTreeByExpertise(
	nodes: TreeNodeEx[],
	expertiseId: number | null,
): TreeNodeEx[] {
	if (!expertiseId) return nodes
	return nodes.flatMap(node => {
		const filteredChildren = filterTreeByExpertise(
			node.children ?? [],
			expertiseId,
		)
		const matches = node.data?.expertise?.id === expertiseId
		if (matches || filteredChildren.length) {
			return [
				{
					...node,
					children: filteredChildren.length ? filteredChildren : node.children,
				} as TreeNodeEx,
			]
		}
		return []
	})
}

const usedExpertiseOptions = computed(() => {
	const seen = new Map<number, any>()
	utils.tree.traverseTreeUntil(rootNodes.value, (node: TreeNodeEx) => {
		if (node.data?.expertise?.id && !seen.has(node.data.expertise.id)) {
			seen.set(node.data.expertise.id, node.data.expertise)
		}
	})
	return Array.from(seen.values())
})

const filteredRootNodes = computed(() =>
	filterTreeByExpertise(rootNodes.value, selectedExpertiseFilter.value),
)
const selectedNode = ref<TreeNodeEx>()
const selectedNodes = ref<TreeNodeEx[]>([])

const selectedKeys = ref<TreeTableSelectionKeys>({})
const expandedKeys = ref<TreeTableExpandedKeys>({})

const {
	landingNode,
	landingPosition,
	handleDragStart,
	handleDragOver,
	handleDragLeave,
	handleDrop,
} = useTreeDragAndDrop(rootNodes, expandedKeys)

const { $trpcClient } = useNuxtApp()
const request = await $trpcClient.requests.byId.query({
	id: Number(route.params.id),
})

type ProposalWithOwner = Omit<Proposal, 'owner'> & {
	owner?: { username?: string }
}

const requestProposals: ProposalWithOwner[] = request?.proposals ?? []

const {
	columns,
	visibleColumns,
	formDialogVisible: proposalFormDialogVisible,
	formSaving: proposalFormSaving,
	formData: proposalFormData,
	isEditMode: proposalFormEditMode,
	editingColumn,
	openCreateForm: openCreateProposalForm,
	addProposal,
	renameProposal,
	saveProposalEdit,
	onColumnVisibilityToggle,
	refreshNetBenefits,
} = useProposalColumns(Number(route.params.id), requestProposals)

const isProposalOwner = computed(() => {
	if (!editingColumn.value || !session.value?.user?.id) return false
	return editingColumn.value.ownerId === session.value.user.id
})

const {
	menuRef: nodeMenuRef,
	menuItems: nodeMenuItems,
	toggleMenu: toggleNodeMenu,
	formDialogVisible: nodeFormDialogVisible,
	formSaving: nodeFormSaving,
	formEditMode: nodeFormEditMode,
	formData: nodeFormData,
	openCreateForm,
	saveForm: saveNodeForm,
	deleteNode,
	toggleNode,
} = useRequestNodes(
	rootNodes,
	selectedKeys,
	expandedKeys,
	Number(route.params.id),
	computed(() => session.value?.user.id),
)

function setRequestNodes(request: Request) {
	const treeNodes = utils.tree.buildTree(request.requestNodes ?? [])
	rootNodes.value = treeNodes as TreeNodeEx[]
}

onMounted(async () => {
	if (request) setRequestNodes(request as unknown as Request)
	dataLoaded.value = true
})

// Adjust table height to fit window
const windowHeight = useWindowSize()
const tableHeight = computed<string>(() => {
	const top = (treeTable.value as any)?.$el.getBoundingClientRect().top
	return `${windowHeight.height.value - top - 66}px`
})

function onNodeSelect(node: TreeNodeEx) {
	selectedNode.value = node
	selectedNodes.value.push(node)
}

function onNodeUnselect(node: any) {
	selectedNodes.value = selectedNodes.value.filter(
		({ key }) => key !== node.key,
	)
}

const hoveredProposal = ref<ProposalColumn | undefined>()
const hoveredRequestNode = ref<RequestNode | undefined>()

const highlightColumnAndShowDescription = utils.uiElements.delayedHover(
	(el: HTMLElement) => {
		if (el) {
			const infoEl = el.querySelector('.hover-info')
			if (infoEl) {
				const requestNodeKeyClass = Array.from(infoEl.classList).find(c =>
					c.startsWith('request_node_key_'),
				)

				if (requestNodeKeyClass) {
					const requestNodeKey = requestNodeKeyClass?.split('_').at(-1)
					const findInTree = (nodes: TreeNodeEx[]): any => {
						for (const n of nodes) {
							if (
								n.key === requestNodeKey ||
								String(n.data?.id) === requestNodeKey
							)
								return n.data
							if (n.children?.length) {
								const found = findInTree(n.children as TreeNodeEx[])
								if (found) return found
							}
						}
					}
					hoveredRequestNode.value =
						findInTree(rootNodes.value) ??
						request?.requestNodes?.find(
							node => node.id.toString() === requestNodeKey,
						)
				}

				const proposalKeyClass = Array.from(infoEl.classList).find(c =>
					c.startsWith('proposal_key_'),
				)

				if (proposalKeyClass) {
					const color = document.documentElement.classList.contains('dark')
						? '#ffffff08'
						: '#00000010'
					const styleContent = `
						:is(td, th):has(.${proposalKeyClass}) { background: ${color}; transition: background 250ms; }
					`
					useStyleTag(styleContent, { id: 'proposal-column-highlight' })

					const proposalKey = proposalKeyClass.split('_').at(-1)
					hoveredProposal.value = columns.value.find(
						col => col.columnKey === proposalKey,
					)
				}
			}
		}
	},
	'td, th',
	25,
)
</script>

<template>
	<div>
		<ConfirmDialog></ConfirmDialog>
		<ConfirmDialog group="nodeDelete"></ConfirmDialog>
		<Menu ref="nodeMenuRef" :model="nodeMenuItems" :popup="true" />
		<Toast style="opacity: 0.9" />
		<ProposalFormDialog
			v-model:visible="proposalFormDialogVisible"
			v-model:form="proposalFormData"
			:saving="proposalFormSaving"
			:editMode="proposalFormEditMode"
			:isOwner="isProposalOwner"
			:ownerName="editingColumn?.ownerName"
			@save="proposalFormEditMode ? saveProposalEdit() : addProposal()" />
		<RequestNodeFormDialog
			v-model:visible="nodeFormDialogVisible"
			v-model:form="nodeFormData"
			:saving="nodeFormSaving"
			:editMode="nodeFormEditMode"
			@save="saveNodeForm" />
		<Panel class="rounded-b-none" :header="request?.title" toggleable collapsed>
			{{ request?.description }}
		</Panel>
		<Toolbar class="mt-0 rounded-t-none">
			<template #start>
				<div class="col-8 md:col-8 sm:col-5 xs:col-2" style="float: right">
					<div class="p-inputgroup">
						<InputText
							v-if="rootNodes.length"
							v-model.lazy="searchFilters['global']"
							placeholder="Search request nodes..."
							size="small"
							style="z-index: 1" />
						<Dropdown
							v-if="rootNodes.length"
							v-model="selectedExpertiseFilter"
							:options="usedExpertiseOptions"
							optionLabel="title"
							optionValue="id"
							placeholder="All Expertise"
							:showClear="true"
							:filter="true"
							size="small"
							class="max-w-[180px]" />
						<Button
							v-if="dataLoaded && !rootNodes.length"
							type="button"
							label="Add a request node"
							icon="pi pi-plus"
							severity="info"
							outlined
							@click="openCreateForm()" />
					</div>
				</div>
			</template>

			<template #end>
				<div class="" style="float: right">
					<div v-if="rootNodes.length" class="p-inputgroup">
						<Button
							type="button"
							icon="pi pi-plus"
							class="p-button"
							@click="openCreateProposalForm"
							v-tooltip.left="'Add a new proposal'" />
						<MultiSelect
							class="requests-multiselect p-button"
							:modelValue="visibleColumns"
							@update:modelValue="onColumnVisibilityToggle"
							:options="columns"
							optionLabel="header"
							placeholder="Select Columns"
							v-tooltip="'Show/Hide Columns'"
							style="width: 43px" />
					</div>
				</div>
			</template>
		</Toolbar>

		<div class="flex mt-3">
			<Panel
				v-tooltip.top="'Request node description'"
				class="w-1/2 rounded-b-none rounded-tr-none"
				pt:header:class="p-2"
				pt:content:class="h-[5rem] overflow-y-auto">
				<Transition name="fade" mode="out-in">
					<p :key="hoveredRequestNode?.description">
						{{ hoveredRequestNode?.description }}
					</p>
				</Transition>
			</Panel>
			<Panel
				v-tooltip.top="'Proposal description'"
				class="w-1/2 rounded-b-none rounded-tl-none"
				pt:header:class="p-2"
				pt:content:class="h-[5rem] overflow-y-auto">
				<Transition name="fade" mode="out-in">
					<p :key="hoveredProposal?.description">
						{{ hoveredProposal?.description }}
					</p>
				</Transition>
			</Panel>
		</div>

		<TreeTable
			ref="treeTable"
			@mousemove="highlightColumnAndShowDescription"
			@mouseout="highlightColumnAndShowDescription"
			:value="filteredRootNodes"
			v-model:selectionKeys="selectedKeys"
			:expandedKeys="expandedKeys"
			@nodeSelect="onNodeSelect"
			@nodeUnselect="onNodeUnselect"
			:filters="searchFilters"
			filterMode="lenient"
			selectionMode="single"
			:resizableColumns="true"
			:showGridlines="false"
			columnResizeMode="expand"
			:scrollable="true"
			responsiveLayout="scroll"
			:scrollHeight="tableHeight">
			<Column field="rating" header="Value" class="w-[40px]">
				<template #body="{ node }">
					<div :class="'w-full hover-info request_node_key_' + node.data.id">
						<Feedback
							v-if="!node.children?.length"
							v-model="node.data.feedback"
							:requestNodeId="node.data.id"
							:proposalId="null"
							:requestId="Number(route.params.id)"
							:userId="session?.user.id!"
							:max="3"
							parentSelector="td"
							@change="refreshNetBenefits" />
					</div>
				</template>
			</Column>
			<Column
				class="relative"
				headerClass="w-0 p-0"
				bodyClass="p-0"
				:sortable="false">
				<template #body="{ node }">
					<div
						:class="
							landingNode?.key === node.key
								? 'tree-drag-over-' + landingPosition
								: ''
						"
						class="absolute !inset-0">
						<Button
							:draggable="true"
							@dragstart="e => handleDragStart(e, node)"
							@dragover="e => handleDragOver(e, node)"
							@drop="e => handleDrop(e, node)"
							@dragleave="handleDragLeave"
							type="button"
							icon="pi pi-ellipsis-v"
							class="absolute !w-[14px] h-[46px] inset-0 m-auto"
							@click="e => toggleNodeMenu(e, node)" />
					</div>
				</template>
			</Column>
			<Column
				field="title"
				header="Request Criteria, Benefits & Side-Effects"
				expander
				class="min-w-[45%] z-[1]">
				<template #body="{ node }">
					<div
						:class="
							'hover-info request_node_key_' +
							node.data.id +
							' ' +
							(landingNode?.key === node.key
								? 'tree-drag-over-' + landingPosition
								: '')
						"
						class="show-on-hover-parent relative w-full">
						<div
							v-html="node.data.title"
							class="w-full !whitespace-normal"></div>
						<div class="absolute right-0 top-1/2 -translate-y-1/2 text-[11px]">
							<span
								class="show-on-hover-child absolute right-0 p-[5px] cursor-pointer">
							</span>
							<span
								class="p-[5px]"
								v-if="node.children?.length"
								@click="toggleNode(node)">
								({{ node.children?.length }})
							</span>
						</div>
					</div>
				</template>
			</Column>
			<Column
				field="expertise"
				header="Expertise"
				bodyClass="!p-0"
				headerClass="!p-0">
				<template #body="{ node }">
					<div :class="'hover-info request_node_key_' + node.data.id">
						<span
							v-if="node.data.expertise"
							class="inline-block px-1.5 py-0.5 rounded-full text-[11px] leading-tight bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
							{{ node.data.expertise.title }}
						</span>
					</div>
				</template>
			</Column>

			<Column
				v-for="(col, index) of visibleColumns"
				:key="col.columnKey"
				:field="col.field"
				bodyClass="!p-0"
				headerClass="relative !p-0 group max-w-[100px] font-light text-sm !whitespace-normal"
				:sortable="false"
				:rowEditor="false">
				<template #header>
					<div
						class="w-full cursor-pointer"
						:class="'hover-info proposal_key_' + col.columnKey">
						<div
							class="!whitespace-normal py-2 px-3"
							@click="renameProposal(col)"
							v-tooltip.top="'Click to edit'">
							{{ col.header }}
						</div>
					</div>
					<span
						v-if="col.isLoading"
						class="pi pi-spin pi-spinner text-xs ml-1" />
					<span
						class="absolute top-1 right-1 w-[1.5rem] h-[1.5rem] rounded-full bg-primary-500 text-white text-[0.7rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
						v-tooltip.left="'Net Value: ' + (col.netBenefit ?? 0)">
						{{ col.netBenefit ?? 0 }}
					</span>
				</template>
				<template #body="{ node }">
					<div
						:class="
							'hover-info request_node_key_' +
							node.data.id +
							' proposal_key_' +
							col.columnKey
						"
						class="w-full">
						<Feedback
							v-if="!node.children?.length"
							v-model="node.data.feedback"
							:requestNodeId="node.data.id"
							:proposalId="col.id!"
							:requestId="Number(route.params.id)"
							:userId="session?.user.id!"
							:max="3"
							:expertiseNodeId="node.data.expertise?.id"
							parentSelector="td"
							@change="refreshNetBenefits" />
					</div>
				</template>
			</Column>
			<Column> </Column>
		</TreeTable>
		<br />
		<!-- {{ expandedKeys }} -->
	</div>
</template>

<style scoped>
.show-on-hover-parent .show-on-hover-child {
	display: none;
}
.show-on-hover-parent:hover .show-on-hover-child {
	display: inline;
}

.requests-multiselect {
	line-height: 0;
}

:deep(.p-treetable-toggler) {
	padding: 0px 22px 0px 22px;
	margin-left: 0rem;
	height: 44px !important;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.001s ease;
}

:deep(.tree-drag-item) {
	cursor: move;
	border-radius: 6px;
	transition: background-color 250ms ease-in-out;
}

:deep(.tree-drag-over-before::before),
:deep(.tree-drag-over-after::after) {
	content: '';
	position: absolute;
	left: -25%;
	right: -25%;
	height: 2px;
	background-color: gray;
	border-radius: 6px;
}

:deep(.tree-drag-over-before::before) {
	top: 0;
}

:deep(.tree-drag-over-after::after) {
	bottom: 0;
}

/*.ql-toolbar {
	display: none;
}
.ql-toolbar.ql-snow + .ql-container.ql-snow {
	border: none;
}*/
</style>
