// We connect the signal '1' and an empty signal 
// to the operator '+'.
// This expression has exactly one input 
// and one output, same for an empty signal. 
// Therefore, the two expressions can be 
// mutually recursive:
process = (_ + 1) ~ _; 
//        (  A  ) ~ B
