import  axios  from "axios";
export const PostAPiCall = async(params) => {    
    const response = (await axios.post(`https://wiser-ai.expertvillagemedia.com/api/post-purchase-downsell?params=${params}`)).data;  
    return Promise.resolve(response);
}
