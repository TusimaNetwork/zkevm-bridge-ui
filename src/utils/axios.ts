import axios from 'axios'


// export const baseURL = isLocalhost ? getEnv('REACT_APP_DEV_REQUEST_URL') : URLs.join('')
export const timeout = 1000
export const contentType = 'application/x-www-form-urlencoded'
axios.defaults.baseURL = '/api'
axios.defaults.timeout = timeout
axios.defaults.headers.post['Content-Type'] =  'application/json'
// axios.defaults.headers.post ={} 
// axios.defaults.headers.get = {}
// axios.defaults.headers.get['Cache-Control'] = 'no-cache'
axios.interceptors.request.use(
  function(config) {
    config.url = '/api' + config.url; // 添加前缀
    return config
  },
  function(error) {
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  function(response) {
    if (response.status !== 200) {
      return Promise.reject(response)
    }
  
    
    return response
  },
  function(error) {
    return Promise.reject(error)
  }
)

const Axios = {
  get(url: string, params: { [key: string]: any } = {},) {
    return axios.get(url, { params })
  },
  post(url: string, data: { [key: string]: any } = {}, ) {
    return axios.post(url, data,)
  }
}

export default axios
