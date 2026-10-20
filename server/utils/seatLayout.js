// Checks one seat block like { rows: ["A","B"], cols: 8 }
// Row names are 1-2 capital letters so seat ids look like A1, B12, AA3
const isValidBlock = (block) =>
  block &&
  Array.isArray(block.rows) &&
  block.rows.length > 0 &&
  block.rows.every((r) => typeof r === "string" && /^[A-Z]{1,2}$/.test(r)) &&
  Number.isInteger(block.cols) &&
  block.cols >= 1 &&
  block.cols <= 30;

// Builds the seat map for a show from a theatre document
// Result: { A1: { class: "balcony", price: 300, status: "available" }, ... }
const buildTickets = (theatre) => {
  const tickets = {};

  const addBlock = (block, seatClass, price) => {
    block.rows.forEach((row) => {
      for (let i = 1; i <= block.cols; i++) {
        tickets[`${row}${i}`] = { class: seatClass, price, status: "available" };
      }
    });
  };

  addBlock(theatre.balconySeats, "balcony", theatre.balconySeatPrice);
  addBlock(theatre.middleSeats, "middle", theatre.middleSeatPrice);
  addBlock(theatre.lowerSeats, "lower", theatre.lowerSeatPrice);

  return tickets;
};

module.exports = { isValidBlock, buildTickets };