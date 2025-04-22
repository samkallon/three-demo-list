<script setup lang="ts">
import DemoCard from "./DemoCard.vue";
import demoList from '/public/demoList.js'
import {useRouter} from "vue-router";
const router = useRouter()
function handleClick(url) {
  router.push(url)
}
</script>

<template>
  <el-scrollbar>
    <div class="list">
      <DemoCard v-for="item in demoList" :title="item.title" :img-url="item.imgUrl" @click="handleClick(item.url)"></DemoCard>
    </div>
  </el-scrollbar>
</template>

<style scoped>
.list{
  column-count: 5;
  column-gap: 20px;

  counter-reset: count;
  width: calc(100% - 16px);
  height: calc(100% - 16px);

}
</style>
