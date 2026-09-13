export const format = (value) => Number.isFinite(value) ? (Math.abs(value) < 0.00005 ? '0.000' : value.toFixed(3)) : 'Undefined';
export const activationDashes = ['', '7 3', '2 3', '9 3 2 3', '12 4'];