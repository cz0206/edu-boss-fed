import axios from 'axios'
import store from '@/store'
import { Message } from 'element-ui'
import router from '@/router'
import qs from 'qs'

const request = axios.create({

})

function redirectLogin () {
  router.push({
    name: 'login',
    query: {
      redirect: router.currentRoute.fullPath
    }
  })
}

function refreshToken () {
  return axios.create()({
    method: 'POST',
    url: '/front/user/refresh_token',
    data: qs.stringify({
      refreshtoken: store.state.user.refresh_token
    })
  })
}

// 添加请求拦截器
request.interceptors.request.use(function (config) {
  // 在发送请求之前做些什么
  // 我们在这里通过改写 config 配置信息来实现业务功能的统一处理
  const { user } = store.state
  if (user && user.access_token) {
    config.headers.Authorization = user.access_token
  }
  return config
}, function (error) {
  // 对请求错误做些什么
  return Promise.reject(error)
})

// 添加响应拦截器
let isRefreshing = false // 控制刷新token
let requests: any[] = [] // 存储刷新token期间过来的 401 请求
request.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  // 状态2XX
  // 如果是自定义错误状态码 错误处理就写在这里
  return response
}, async function (error) {
  // 对响应错误做点什么
  // 非状态2xx
  // 如果是使用http状态码 错误处理就写到这里
  if (error.response) {
    // 请求发出去收到响应了 但是状态码超出了2xx范围
    // console.log(error.response.data)
    // console.log(error.response.status)
    // console.log(error.response.headers)
    const { status } = error.response
    if (status === 400) {
      Message.error('请求参数错误')
    } else if (status === 401) {
      // token 无效 没有token 或者无效
      // 如果有 refresh_token 则尝试使用 refresh_token 或许新的 access_token
      if (!store.state.user) {
        redirectLogin()
        return Promise.reject(error)
      }
      if (!isRefreshing) {
        isRefreshing = true
        // 刷新token
        return refreshToken().then(res => {
          if (!res.data.success) {
            throw new Error('刷新 Token 失败')
          }
          // 把requests队列中的请求重新发出去
          requests.forEach(x => x())
          requests = []
          store.commit('setUser', res.data.content)
          // 把失败的请求 再重新发出去
          return request(error.config)
        }).catch(err => {
          console.log(err)
          store.commit('setUser', null)
          redirectLogin()
          return Promise.reject(error)
        }).finally(() => {
          isRefreshing = false
        })
      }
      // 刷新状态下 把请求挂起放到 requests 数组中
      return new Promise(resolve => {
        requests.push(() => {
          resolve(request(error.config))
        })
      })
      // try {
      //   // 成功了 把本次失败的请求重新发出去
      //   const { data } = await axios.create()({
      //     method: 'POST',
      //     url: '/front/user/refresh_token',
      //     data: qs.stringify({
      //       refreshtoken: store.state.user.refresh_token
      //     })
      //   })
      //   console.log(data)
      //   // 把刷新成功拿到的新的 access_token 更新到容器和本地存储中
      //   store.commit('setUser', data.content)
      //   // 把失败的请求 再重新发出去
      //   return request(error.config)
      // } catch (err) {
      //   // 失败了 跳转到登录重新登录获取新的token
      //   store.commit('setUser', null)
      //   redirectLogin()
      //   return Promise.reject(error)
      // }
      // 如果没有 则直接跳到登录页
    } else if (status === 403) {
      Message.error('没有权限，请联系管理员')
    } else if (status === 404) {
      Message.error('请求资源不存在')
    } else if (status >= 500) {
      Message.error('服务端错误，请联系管理员')
    }
    // 400 401
    // 401 未授权
    // 403 没权限
    // 404 找不到
  } else if (error.request) {
    // 请求发出去了 没有收到响应 请求超时 网络断开
    Message.error('请求超时，请刷新重试')
    // console.log(error.request)
  } else {
    // 在设置请求时发生的一些错误 触发一个错误
    Message.error(`请求失败: ${error.message}`)
    // console.log('Error', error.message)
  }
  return Promise.reject(error)
})

export default request
