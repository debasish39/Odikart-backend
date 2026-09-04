export const generateTrackingNumber = (orderNumber) => {
  const number = String(orderNumber).replace(/^ODK-/, "");

  return `ODK-TRK-${number}`;
};