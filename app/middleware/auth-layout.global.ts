export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path.startsWith("/dash")) {
    to.meta.layout = "dashboard";
  }
});
