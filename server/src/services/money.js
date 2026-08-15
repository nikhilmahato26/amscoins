const rupeesToPaise = (rupees) => Math.round(rupees * 100)

function computeTds(grossPaise, pct) {
  const net = Math.round(grossPaise * (1 - pct / 100))
  return { tds: grossPaise - net, net }
}

module.exports = { rupeesToPaise, computeTds }
