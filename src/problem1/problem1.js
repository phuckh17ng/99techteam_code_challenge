var sum_to_n_a = function (n) {
  // your code here

  let sum = 0;

  for (let i = 0; i <= n; i++) {
    sum += i;
  }

  return sum;
};

var sum_to_n_b = function (n) {
  // your code here

  if (n <= 0) {
    return 0;
  }

  return n + sum_to_n_b(n - 1);
};

var sum_to_n_c = function (n) {
  // your code here

  if (n < 0) return 0;

  return (n * (n + 1)) / 2;
};

console.log(sum_to_n_a(5));
console.log(sum_to_n_a(7));

console.log(sum_to_n_b(5));
console.log(sum_to_n_b(7));

console.log(sum_to_n_c(5));
console.log(sum_to_n_c(7));
