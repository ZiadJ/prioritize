<template>
  <div class="w-screen menu-guest">
    <Menubar :model="items" class="!border-none !border-b max-w-7xl mx-auto" style="border-radius: 0rem" :pt="{
      root: 'max-w-screen mx-auto !bg-transparent',
      rootList: '!max-w-6xl',
    }">
      <template #start>
        <!-- Logo -->
        <Logo />
      </template>
      <template #item="{ item }">
        <!-- Links -->
        <NuxtLink v-if="item.root" :to="item.to"
          class="flex items-center cursor-pointer px-4 py-2 overflow-hidden relative text-sm uppercase">
          <span>{{ item.label }}</span>
        </NuxtLink>
        <a v-else-if="!item.image" class="flex items-center p-4 cursor-pointer mb-2 gap-3">
          <span class="inline-flex items-center justify-center rounded-full bg-primary text-primary-contrast w-12 h-12">
            <i :class="[item.icon, 'text-lg']"></i>
          </span>
          <span class="inline-flex flex-col gap-1">
            <span class="font-bold text-lg">{{ item.label }}</span>
            <span class="whitespace-nowrap">{{ item.subtext }}</span>
          </span>
        </a>
        <div v-else class="flex flex-col items-start gap-4 p-2">
          <img alt="megamenu-demo" :src="item.image" class="w-full" />
          <span>{{ item.subtext }}</span>
          <Button :label="typeof item.label === 'string' ? item.label : ''" outlined />
        </div>
      </template>
      <template #end>
        <!-- Avatar  or Sign In/Sign Up -->
        <div class="flex items-center gap-4">
          <button @click="changeColorMode" class="flex items-center gap-2 outline-none"
            v-if="!$colorMode.unknown && !$colorMode.forced">
            <Icon :name="determianteIconMode" :class="determianteIconColorMode"></Icon>
          </button>
          <template v-if="status === 'unauthenticated'">
            <Button size="small" label="Sign In" as="router-link" to="/login" />
            <Button size="small" label="Sign Up" as="router-link" to="/register" />
          </template>
          <Button v-else size="small" label="My account" as="router-link" to="/dash" />
        </div>
      </template>
    </Menubar>
  </div>
</template>

<script setup lang="ts">
const { status } = useAuth();
const colorMode = useColorMode();

const changeColorMode = () => {
  colorMode.preference = (colorMode.value === "dark") ? "light" : "dark";
};

const determianteIconMode = computed(() => {
  return (colorMode.value === "dark") ? "line-md:moon" : "line-md:sunny-filled-loop";
});

const determianteIconColorMode = computed(() => {
  return (colorMode.value === "dark") ? "text-xl text-white transition-transform duration-500" : "text-yellow-800 transition-transform duration-500";
});

const items = ref<[{ label: string, to: string, root: boolean }]>([
  {
    label: "Home",
    to: "/",
    root: true,
  },
]);
</script>
