const KEY_CRM_API_URL = 'https://openapi.keycrm.app/v1'
// const apiKey = !process.env.API_KEY;
const apiKey = 'YTJhMTY2ODI4MGY2MmI2Y2EyNDQwNzVkN2FmYWUzMjdiNGIwYjNlNQ';

const storageUrl = (
  entityType: 'order'| 'pipelines', entityId: number
) => `/storage/attachment/${entityType}/${entityId}`;

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

export async function getAttaches(entityId: number) {
  try {
    const res = await keyRequest(storageUrl('order', entityId), 'get');
    const getData = await res.json();
    return getData;
  } catch (error) {
    console.log('ERROR-getAttaches', error) 
    return [];
  }
};