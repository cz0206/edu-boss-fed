<template>
  <div class="container">
    <el-card>
      <div slot="header">
        <div>课程：XXX</div>
        <div>阶段：XXX</div>
        <div>课时：XXX</div>
      </div>
      <el-form label-width="40px">
        <el-form-item label="视频">
          <input ref="video-file" type="file">
        </el-form-item>
        <el-form-item label="封面">
          <input ref="image-file" type="file" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleUpload">开始上传</el-button>
          <el-button>返回</el-button>
        </el-form-item>
        <el-form-item>
          <p>视频上传中: {{uoloadPercent}} %</p>
          <p  v-if="isUploadSuccess">视频转码中： {{isTransCodeSuccess ?  '完成' : '正在处理请稍后'}}</p>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script>
/* eslint-disable */
  import axios from 'axios'
  import  {
    aliyunImagUploadAddressAdnAuth,
    aliyunVideoUploadAddressAdnAuth,
    transCodeVideo,
    getAliyunTransCodePercent
  } from '@/services/aliyun-oss.ts'
  export default {
    name: 'CourseVideo',
    data() {
      return {
        uploader: null,
        imageURL: '',
        videoId: '',
        uoloadPercent: 0,
        isUploadSuccess: false,
        isTransCodeSuccess: false,
        tranflag: false
      }
    },
    created() {
      this.initUploader()
    },
    computed: {
      video () {
        return this.$refs['video-file']
      },
      image () {
        return this.$refs['image-file']
      }
    },
    methods: {
      initUploader() {
        this.uploader = new AliyunUpload.Vod({
          //阿里账号ID，必须有值
          userId: "1618139964448548",
          //上传到视频点播的地域，默认值为'cn-shanghai'，//eu-central-1，ap-southeast-1
          region: "",
          //分片大小默认1 MB，不能小于100 KB
          partSize: 1048576,
          //并行上传分片个数，默认5
          parallel: 5,
          //网络原因失败时，重新上传次数，默认为3
          retryCount: 3,
          //网络原因失败时，重新上传间隔时间，默认为2秒
          retryDuration: 2,
          //开始上传
          'onUploadstarted': async (uploadInfo) => {
            console.log('onUploadstarted', uploadInfo)
            // 1 通过我们的后端获取文件上传凭证
            let uploadAddressAndAuth
            if (uploadInfo.isImage) {
              // 获取图片上传凭证
              const { data } = await aliyunImagUploadAddressAdnAuth()
              this.imageURL = data.data.imageURL
              uploadAddressAndAuth = data.data
            } else {
              // 获取视频上传凭证
              const { data } = await aliyunVideoUploadAddressAdnAuth({
                fileName: uploadInfo.file.name,
                imageURL: this.imageURL
              })
              uploadAddressAndAuth = data.data
              this.videoId = uploadAddressAndAuth.videoId
            }

            // 2 调用 uploader.setUploadAuthAndAddress 设置上传凭证
            this.uploader.setUploadAuthAndAddress(
              uploadInfo,
              uploadAddressAndAuth.uploadAuth,
              uploadAddressAndAuth.uploadAddress,
              uploadAddressAndAuth.imageId || uploadAddressAndAuth.videoId
            )
            // 3 设置好的上传凭证确认没有问题上传进度开始
          },
          //文件上传成功
          'onUploadSucceed': function (uploadInfo) {
          },
          //文件上传失败
          'onUploadFailed': function (uploadInfo, code, message) {
          },
          //文件上传进度，单位：字节
          'onUploadProgress':  (uploadInfo, totalSize, loadedPercent) => {
            if( !uploadInfo.isImage) {
              this.uoloadPercent = Math.floor(loadedPercent * 100)
            }
          },
          //上传凭证或STS token超时
          'onUploadTokenExpired': function (uploadInfo) {
          },
          //全部文件上传结束
          'onUploadEnd': async (uploadInfo) => {
            this.isUploadSuccess = true
            const { data } = transCodeVideo({
              lessonId: this.$route.query.lessonId,
              coverImageUrl: this.imageURL,
              fileName: this.video.files[0].name,
              fileId : this.videoId
            })
            console.log('转码', data)
            const timer = setInterval(async()=>{
              const {data} = await getAliyunTransCodePercent(this.$route.query.lessonId)
              if(data.data === 100) {
                this.isTransCodeSuccess = true
                window.clearInterval(timer)
                console.log('转码成功')
              }
            },3000)

          }
        });
      },
      handleUpload () {
        // 初始化状态
        this.isTransCodeSuccess = false
        this.isUploadSuccess =false
        this.uoloadPercent = 0
        this.tranflag = false
        // 获取上传的文件
        // console.log(this.video.files);
        const videoFile = this.video.files[0]
        const imageFile = this.image.files[0]
        // 将用户所选的文件添加到上传列表中
        this.uploader.addFile(imageFile, null, null, null, '{"Vod":{}}')
        this.uploader.addFile(videoFile, null, null, null, '{"Vod":{}}')
        // 开始上传
        this.uploader.startUpload();
        this.tranflag = true
      }
    }
  }
</script>
