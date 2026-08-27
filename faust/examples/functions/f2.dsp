add(a, b) = a + b;

// If we want to call (execute) that function, 
// we need to replace 'a' & 'b' by the parameters
// we want to pass to the function. 
// Here, we also store the result into a 'variable' called "result".
result = add(1, 2);

// Under the hood, 'a' and 'b' are replaced by '1' and '2':
add(1, 2) = 1 + 2;