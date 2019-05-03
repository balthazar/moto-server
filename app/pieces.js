export default {
  speed: [
    { gt: 0, lte: 5, color: '#FF8328' },
    { gt: 5, lte: 10, color: '#FFB600' },
    { gt: 10, lte: 15, color: '#D5D500' },
    { gt: 15, lte: 25, color: '#7EAA00' },
    { gt: 25, lte: 50, color: '#378000' },
    { gt: 50, color: '#1ac7ff' },
  ],
  alt: [
    { gt: 0, lte: 20, color: '#378000' },
    { gt: 20, lte: 50, color: '#7EAA00' },
    { gt: 50, lte: 70, color: '#D5D500' },
    { gt: 70, lte: 100, color: '#FFB600' },
    { gt: 100, color: '#FF8328' },
  ],
}
