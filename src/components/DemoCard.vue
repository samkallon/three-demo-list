<script setup lang="ts">
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
    <img src="" alt="">
    <div class="card-title">{{props.title}}</div>
  </div>
</template>

<style scoped lang="scss">
.card{
  width: 350px;
  height: 210px;
  background-color: #007ecc;
  position: relative;
  cursor: pointer;
  &-title{
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 50px;
    background-color: rgba(0, 0, 0, 0.2);
    color: white;
    font-size: 20px;
    line-height: 50px;
    padding-left: 10px;
    box-sizing: border-box;

  }

}
</style>
