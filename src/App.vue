<script setup lang="ts">
import Header from "./components/Header.vue";
</script>

<template>
  <Header></Header>
  <div style="width: calc(100% - 16px);height: calc(100% - 76px);margin-left: 8px;margin-top: 8px">
    <router-view></router-view>
  </div>
</template>

<style scoped>

</style>
