const TAX_RATE = 0.1;
const SHIPPING_FEE = 30000;
const FREE_SHIPPING_FROM = 1000000;

function calculateTotals(subtotalVnd, discountVnd = 0, pointsToRedeem = 0) {
  const taxableSubtotal = Math.max(0, subtotalVnd - discountVnd);
  const taxVnd = Math.round(taxableSubtotal * TAX_RATE);
  const shippingFeeVnd = subtotalVnd === 0 || subtotalVnd >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const beforePointsVnd = taxableSubtotal + taxVnd + shippingFeeVnd;
  const redeemableAmount = Math.floor(beforePointsVnd / 1000) * 1000;
  const loyaltyRedeemedVnd = Math.min(redeemableAmount, Math.max(0, pointsToRedeem) * 1000);
  const totalVnd = beforePointsVnd - loyaltyRedeemedVnd;
  const earnedPoints = Math.floor(totalVnd / 10000);
  return { subtotalVnd, discountVnd, taxVnd, shippingFeeVnd, loyaltyRedeemedVnd, totalVnd, earnedPoints };
}

module.exports = { FREE_SHIPPING_FROM, SHIPPING_FEE, TAX_RATE, calculateTotals };
