<template>
  <div class="w-screen min-h-screen">
    <HeaderMenuGuest />
    <ConfirmPopup></ConfirmPopup>
    <Toast />
    <div class="body-content-page">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts"></script>
