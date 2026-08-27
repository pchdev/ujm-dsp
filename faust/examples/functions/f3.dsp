a = 31;
b = 47;

add(a, b) = a + b;
result = add(1, 2); // result will be 3, not 78!

// On the other hand, if we were to change 
// the name of the arguments of the 'add' function, like so:
add(c, d) = a + b; 
// The result would be 78 this time, 
// because 'a' and 'b' now refer to 
// the 'a = 31' and 'b = 47' expressions.