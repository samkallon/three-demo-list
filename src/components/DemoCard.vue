<script setup lang="ts">
import {getAssetsFile} from "../utils.ts";
const props = defineProps({
  title: {
    type: String,
    default: '标题'
  },
  imgUrl:{
    type: String,
    default: ''
  }

})
</script>

<template>
  <div class="card">
    <img :src="getAssetsFile(props.imgUrl || 'imgs/plant.png')" alt="" width="100%">
    <div class="card-title">{{props.title}}</div>
  </div>
</template>

<style scoped lang="scss">
.card{
  font-size: 18px;
  cursor: pointer;
  position: relative;
  margin-bottom: 10px;
  .card-title{
    box-sizing: border-box;
    position: absolute;
    bottom: 4px;
    color: white;
    background: rgba(0, 0, 0, 0.37);
    width: 100%;
    padding:8px
  }
  .todo{
    top: 0px;
  }
}
card::after{
  counter-increment: count;
  content: counter(count);
  width: 2em;
  height: 2em;
  background-color: rgba(0,0,0,0.9);
  color: #ffffff;
  line-height: 2em;
  text-align: center;
  position: absolute;
  font-size: 1em;
  z-index: 2;
  left: 0;
  top: 0;
}
card:hover{
  transform: scale(1.2);
}
</style>
