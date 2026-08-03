export const generateOrderNumber=()=>{
    const random=Math.floor(100000+Math.random()*900000);
    return `ODK-${Date.now()}-${random}`;
}