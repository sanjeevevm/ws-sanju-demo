import  axios  from "axios";
export const APiCall = async(shop, pid) => {    
    const response = (await axios.get(`https://wiser-ai.expertvillagemedia.com/api/post-purchase-upsell?shop=${shop}&pid=${pid}`)).data;  
    return Promise.resolve(response);
}
