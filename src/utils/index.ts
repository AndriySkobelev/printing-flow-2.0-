const KEY_CRM_API_URL = 'https://openapi.keycrm.app/v1'
// const apiKey = !process.env.API_KEY;
const apiKey = 'YTJhMTY2ODI4MGY2MmI2Y2EyNDQwNzVkN2FmYWUzMjdiNGIwYjNlNQ';


export const keyRequest = async (url: string, method: 'get' | 'post' | 'put' | 'delete', params?: any) => {
  const newParams = new URLSearchParams({...params})
  const paramsUrl = params ? `${KEY_CRM_API_URL}${url}?${newParams}` : `${KEY_CRM_API_URL}${url}`
  const req = await fetch(paramsUrl, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  return req;
};