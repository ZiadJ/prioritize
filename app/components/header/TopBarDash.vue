<template>
    <Toolbar :pt="{
        root: '!bg-surface-50 dark:!bg-surface-900 !border-none flex',
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
            <!-- <div class="md:w-[calc(100%-16rem)]">
                <IconField :pt="{ root: 'flex max-w-sm mx-auto' }">
                    <InputIcon>
                        <i class="pi pi-search" />
                    </InputIcon>
                    <InputText placeholder="Search" size="small" />
                </IconField>
            </div> -->
        </template>

        <template #end>
            <div class="flex justify-center gap-3 mt-[-10px]">
                <Button @click="changeColorMode"
                    v-if="!$colorMode.unknown && !$colorMode.forced"
                    pt:root="!bg-transparent !border-none">
                    <Icon :name="determineIconMode" :class="determineIconColorMode" />
                </Button>
                
                <Button @click="toggle" aria-haspopup="true" aria-controls="overlay_tmenu" 
                    icon="pi pi-user"
                    pt:root="!bg-transparent !border-none"
                    pt:icon="text-gray-800 dark:text-white"
                >
                    <!-- <Avatar image="https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png" shape="circle" /> -->
                </Button>
                <TieredMenu ref="menu" id="overlay_tmenu" :model="profileActions" popup />
            </div>
        </template>
    </Toolbar>
</template>

<script lang="ts" setup>
const { status, signOut } = useAuth();
const colorMode = useColorMode();
const menu = ref();

const changeColorMode = () => {
    colorMode.preference = (colorMode.value === "dark") ? "light" : "dark";
};

const determineIconMode = computed(() => {
    return (colorMode.value === "dark") ? "line-md:moon" : "line-md:sunny-filled-loop";
});

const determineIconColorMode = computed(() => {
    return (colorMode.value === "dark") ? "text-xl text-white transition-transform duration-500" : "text-yellow-800 transition-transform duration-500";
});
const profileActions = computed(() => {
    const common = {
        label: 'Profile',
        icon: 'pi pi-fw pi-credit-card',
        command: () => {
            navigateTo('/dash/profile');
        }
    };
    const authAction =
        status.value === 'authenticated'
            ? {
                  label: 'Logout',
                  icon: 'pi pi-fw pi-power-off',
                  command: async () => {
                      await signOut({ callbackUrl: '/' });
                  }
              }
            : {
                  label: 'Login',
                  icon: 'pi pi-fw pi-sign-in',
                  command: () => {
                      navigateTo('/login');
                  }
              };
    return [common, authAction];
});
const toggle = (event: any) => {
    menu.value.toggle(event);
};
</script>

<style></style>