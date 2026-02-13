---- MODULE Comprehensive ----
\* Comprehensive TLA+ spec for Monarch syntax highlighter testing.
\* Consolidates all test cases from: comprehensive.tla, BoxDiamond.tla,
\* ChangRobertsTyped.tla, ERC20_typedefs.tla, typeAnnotationLineComment.tla

EXTENDS Integers, Sequences, FiniteSets, Naturals

CONSTANT N, Proc
CONSTANTS A, B
VARIABLE x
VARIABLES y, z, pc

ASSUME N > 0
ASSUMPTION N \in Nat

\* ==================== Module Structure ====================
\* Module header and footer are tested separately.

\* ==================== Declaration Keywords ====================
\* EXTENDS, CONSTANT, CONSTANTS, VARIABLE, VARIABLES already declared above.

\* ==================== Control Flow ====================
Max(a, b) == IF a >= b THEN a ELSE b

Init ==
    /\ x = 0
    /\ y = <<1, 2, 3>>
    /\ z = [a |-> 1, b |-> "hello\nworld"]
    /\ pc = "start"

ChooseExample == CHOOSE v \in 1..N : v > 0

CaseExample ==
    CASE x = 0 -> "zero"
      [] x > 0 -> "positive"
      [] OTHER -> "negative"

\* ==================== Temporal and Fairness ====================
\* From BoxDiamond.tla - temporal operators [] <>
Spec == Init /\ [][Next]_<<x, y, z>>
Fair == WF_<<x,y>>(Next) /\ SF_<<x,y>>(Next)
Live == []<>(x = 1 /\ y = 0)
Lead == (x = 0) ~> (x = 1)

\* ==================== Primed Variables ====================
\* From BoxDiamond.tla - primed variables
Next ==
    /\ x' = y
    /\ y' = x
    /\ UNCHANGED <<z>>

\* ==================== Quantifiers ====================
\* From ChangRobertsTyped.tla - range operator and quantifiers
AllPos == \A i \in 1..N : x > 0
ExZero == \E i \in 1..N : x = 0

\* ==================== Set Operations ====================
SetOps == S \cup T \cap U \subseteq V
          /\ x \in S
          /\ x \notin T

\* ==================== Numeric Literals ====================
DecNum == 42
BinNum == \b1010
OctNum == \o17
HexNum == \hFF

\* ==================== Strings with Escapes ====================
Str1 == "hello\nworld\t\"quoted\"\\"

\* ==================== Function Operations ====================
FuncDef == [i \in 1..N |-> i * 2]
FuncExcept == [f EXCEPT ![1] = @ + 1]
FuncMerge == f @@ g

\* ==================== Record and Tuple ====================
Rec == [name |-> "Alice", age |-> 30]
RecAssign == [rec EXCEPT !.age = @ + 1]
RecCtor == [name | "Bob", age |-> 25]
Tup == <<1, 2, 3>>
TupleSelect == Tup[1]
TupleCons <<1, <<2, 3>>>>
RangeOp == 1..10

\* ==================== LET/IN ====================
LetEx == LET a == 1
             b == 2
         IN a + b

\* ==================== LAMBDA ====================
LambdaEx == {x \in S : LAMBDA y : y > 0}

\* ==================== DOMAIN, SUBSET, UNION ====================
DomEx == DOMAIN f
SubEx == SUBSET S
UniEx == UNION {S, T}

\* ==================== ENABLED ====================
EnEx == ENABLED Next

\* ==================== LOCAL ====================
LOCAL LocalOp == x + 1

\* ==================== RECURSIVE ====================
RECURSIVE Fact(_)
Fact(n) == IF n = 0 THEN 1 ELSE n * Fact(n - 1)

\* ==================== INSTANCE ====================
\* From ChangRobertsTyped.tla - INSTANCE
Nats == INSTANCE Naturals

\* ==================== Module Reference ====================
ModRef == Nats!Add

\* ==================== Boolean and Set Constants ====================
BoolConst == TRUE /\ FALSE
BoolSet == BOOLEAN
StrSet == STRING
NatSet == Nat
IntSet == Int
RealSet == Real

\* ==================== Logical Operators ====================
LogOps == P /\ Q \/ R => S <=> T

\* ==================== Comparison and Arithmetic ====================
Cmp == x = y /\ x # y /\ x /= y /\ x < y /\ x > y /\ x <= y /\ x >= y
Arith == x + y - z * w / v ^ n

\* ==================== Mapping Operators ====================
MapTo == x |-> y
Arrow == S -> T
GenOp == f :> g
SubT == S <: T
DblColon == a :: expr

\* ==================== Block Comments with Type Annotations ====================
(*
  @type: Set(Int) -> Bool;
  @typeAlias: ENTRY = { key: Str, value: Int };
  @typeAlias: transfer = { id: Int, fail: Bool, sender: ADDR, toAddr: ADDR, value: Int };
  @typeAlias: TX = None(UNIT) | Transfer($transfer) | Approve($approve);
*)

\* ==================== Apalache Type in Line Comment ====================
\* @type: Int;

\* ==================== Apalache Custom Type References ====================
\* From ERC20_typedefs.tla - $ prefix type references
TypeRef == $ENTRY

\* ==================== Apalache Types in Annotations ====================
\* @type: Bool;
\* @type: Str;
\* @type: Set(Int);
\* @type: Seq(Str);
\* @type: Variant;

\* ==================== Uninterpreted Types (Uppercase) ====================
\* @type: Set(RM);
CONSTANT RM

\* ==================== Type Variables (Polymorphic) ====================
\* @type: (a, a) => a;
PolyId(x) == x

\* ==================== THEOREM and Proof ====================
THEOREM Thm == \A x \in Nat : x >= 0
PROOF
  SUFFICES \A x \in Nat : x >= 0
    OBVIOUS
  QED

\* ==================== Special Apalache Operators ====================
\* Note: The following Apalache-specific operators are commented out for standard TLA+ validity
\* AssignEx == x' := x + 1
\* GuessEx == Guess(Nat)
\* VariantEx == Variant("tag1", 42)

\* ==================== Extended Set Operators ====================
SetEnum == {1, 2, 3}
SetComp == {x \in S : x > 0}
SetOfFuncs == [S -> T]
SetOfRecords == [name: S, age: T]
Cartesian == S \X T

\* ==================== Sequence Operators ====================
Seq1 := <<1, 2, 3>>
SeqAppend := Seq1 \o <<4, 5>>
SeqHead := Head(Seq1)
SeqTail := Tail(Seq1)
SeqLen := Len(Seq1)
SeqSub := SubSeq(Seq1, 1, 2)
SeqCons := 0 :> Seq1
SeqFilter := Select(Seq1, LAMBDA x : x > 0)
SeqMap := Map(Seq1, LAMBDA x : x * 2)

\* ==================== Fold Operators ====================
FoldSet == ApaFoldSet(Plus, 0, S)
FoldSeq == ApaFoldSeqLeft(Plus, 0, s)

\* ==================== Function Override and Merge ====================
\* From Test951.tla - function override with @@
FunOverride == myfun @@ [e \in 2..4 |-> 42]
FunUpdate == [f EXCEPT ![key] = newVal]

\* ==================== Misc Operators ====================
Ex1 == DOMAIN [i \in S |-> i]
Ex2 == [i \in S |-> i + 1]
Ex3 == [i \in S \X T |-> i.1 + i.2]
Ex4 == {i.1 + i.2 : i \in S \X T}
Ex5 == {i \in S : \E j \in T : i = j}

\* ==================== Label in Quantifier ====================
QuantLabel == \A i \in S : (i > 0)
QuantLabel2 == \E i \in S : (i = 0)

\* ==================== Multiple Quantifiers ====================
MultiQuant == \A i \in S : \A j \in T : i = j
MultiQuant2 == \E i \in S : \E j \in T : i = j
MixedQuant == \A i \in S : \E j \in T : i = j

\* ==================== Nested IF ====================
NestedIf == IF a THEN IF b THEN c ELSE d ELSE e

\* ==================== Function Domain in Record ====================
RecFun == [x \in S -> T]

\* ==================== Existential Quantifier in Set Comprehension ====================
SetCompExists == {i \in S : \E j \in T : i = j}

\* ====================LET with Multiple Definitions ====================
LetMulti ==
    LET A == 1
        B == 2
        C == A + B
    IN  C * 2

\* ==================== Higher-Order Operators ====================
MapSeq == Map(s, LAMBDA x : x + 1)
SelectSeq == Select(s, LAMBDA x : x > 0)

\* ==================== FiniteSet Bounds ====================
IsFiniteSet == IsFiniteSet(S)
Cardinality == Cardinality(S)

\* ==================== Permutations ====================
Permutations == PermutationsOf(S)

\* ==================== RandomElement ====================
RandomSet == RandomElement(S)

\* ==================== Subsets ====================
SubsetOf == IsSubsetOf(S, T)

\* ==================== Java Permutations ====================
PermutSet == Permutations(S)

\* ==================== Exist Over String ====================
StringExists == \E c \in STRING : c = "a"

====
