<template>
    <Toolbar :pt="{
        root: '!bg-transparent !border-none flex',
        start: 'flex items-center',
        center: 'flex items-center justify-center',
        end: 'flex items-center'
    }">
        <template #start>
            <!-- <Button icon="pi pi-plus" class="mr-2" severity="secondary" text />
            <Button icon="pi pi-print" class="mr-2" severity="secondary" text />
            <Button icon="pi pi-upload" severity="secondary" text /> -->
            <div class="flex items-center md:w-64 justify-center">
                <Logo />
            </div>
        </template>

        <template #center>
            <div class="md:w-[calc(100%-16rem)]">
                <IconField :pt="{ root: 'flex max-w-sm mx-auto' }">
                    <InputIcon>
                        <i class="pi pi-search" />
                    </InputIcon>
                    <InputText placeholder="Search" size="small" />
                </IconField>
            </div>
        </template>

        <template #end>
            <div class="card flex justify-center">
                <Button type="button" @click="toggle" aria-haspopup="true" aria-controls="overlay_tmenu" 
                    icon="pi pi-user" :pt="{
                    root: 'rounded-full !bg-transparent !border-none !p-0',
                    icon: '!text-white',
                    iconOnly: '!text-white',
                    iconPos: 'right'
                }">
                    <!-- <Avatar image="https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png" shape="circle" /> -->
                </Button>
                <TieredMenu ref="menu" id="overlay_tmenu" :model="profileActions" popup />
            </div>
        </template>
    </Toolbar>
</template>

<script lang="ts" setup>
const router = useRouter();
const { status, signOut } = useAuth();
const menu = ref();
const profileActions = [
    {
        label: 'Profile',
        icon: 'pi pi-fw pi-credit-card',
        command: () => {
            navigateTo('/dash/profile');
        }
    },
    {
        label: 'Settings',
        icon: 'pi pi-fw pi-cog',
        command: () => {
            router.push('/dash/settings');
        }
    },
    {
        label: 'Logout',
        icon: 'pi pi-fw pi-power-off',
        command: async () => {
            await signOut({ callbackUrl: '/' });
        }
    }
];
const toggle = (event: any) => {
    menu.value.toggle(event);
};
</script>

<style></style>