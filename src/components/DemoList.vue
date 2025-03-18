<script setup lang="ts">
import DemoCard from "./DemoCard.vue";
import demoList from '/public/demoList.json'
import {useRouter} from "vue-router";
const router = useRouter()
function handleClick(url) {
  router.push(url)
}
</script>

<template>
  <div class="list">
    <DemoCard v-for="item in demoList" :title="item.title" :img-url="item.imgUrl" @click="handleClick(item.url)"></DemoCard>
  </div>
</template>

<style scoped>
.list{
}
</style>
