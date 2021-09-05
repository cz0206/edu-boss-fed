<template>
  <div id="app">
    <!-- 根路由的出口 -->
    <router-view/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import request from '@/utils/request'
// request({
//   method: 'GET',
//   url: '/boos/v2/api-docs?group=edu-boss-boot'
// }).then(res => {
//   console.log(res)
// })
export default Vue.extend({
  name: 'App'
})
</script>
<style lang="scss" scoped>
.text {
  color: $success-color;
}
</style>
