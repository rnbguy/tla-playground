import Playground from "../components/Playground.tsx";

const EXAMPLE_TLA = `
---- MODULE playground ----
EXTENDS Integers

\\* Collatz Conjecture

VARIABLES
    \\* state of number
    \\* @type: Int;
    number,
    \\* remaining steps
    \\* @type: Int;
    steps


Init ==
    /\\ number \\in Nat
    \\* first assign is odd
    /\\ number % 2 = 1
    \\* number of exact steps
    /\\ steps = 10

Next ==
    \\* previous number can not be 1
    /\\ number /= 1
    \\* collatz step
    /\\ IF (number % 2 = 0) THEN (number' = number \\div 2) ELSE (number' = number * 3 + 1)
    \\* decrement current number of steps
    /\\ steps' = steps - 1

\\* Property of last state
CounterExampleProperty == number = 1 /\\ steps = 1

\\* Wrapped invariant
Invariant == ~CounterExampleProperty

====

`;

export default function Body() {
  const exampleTla = {
    tla: EXAMPLE_TLA,
    inv: "Invariant",
  };

  return <Playground {...exampleTla} />;
}
