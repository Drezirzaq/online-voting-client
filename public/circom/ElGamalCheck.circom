pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/escalarmulany.circom";

template ElGamalEncryptionProof() {

    var Gx    = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    var Gy    = 16950150798460657717958625567821834550301663161624707787222815936182638968203;
    var NBITS = 253;

    signal input  C1x;
    signal input  C1y;
    signal input  C2x;
    signal input  C2y;
    signal input  PubX;
    signal input  PubY;

    signal input k;
    signal input m; 

    signal Mx;
    signal My;
    signal output weightHash;

    component weightHashPoseidon = Poseidon(1);
    weightHashPoseidon.inputs[0] <== m;
    weightHash <== weightHashPoseidon.out;

    component kBits = Num2Bits(NBITS);   kBits.in <== k;
    component mBits = Num2Bits(NBITS);   mBits.in <== m;

    component kG = EscalarMulAny(NBITS);
    kG.p[0] <== Gx;  kG.p[1] <== Gy;
    for (var i = 0; i < NBITS; i++)  kG.e[i] <== kBits.out[i];
    C1x === kG.out[0];
    C1y === kG.out[1];


    component mG = EscalarMulAny(NBITS);
    mG.p[0] <== Gx;  mG.p[1] <== Gy;
    for (var i = 0; i < NBITS; i++)  mG.e[i] <== mBits.out[i];

    Mx <== mG.out[0];
    My <== mG.out[1];

    component kPub = EscalarMulAny(NBITS);
    kPub.p[0] <== PubX;  kPub.p[1] <== PubY;
    for (var i = 0; i < NBITS; i++)  kPub.e[i] <== kBits.out[i];

    component sum = BabyAdd();
    sum.x1 <== Mx;     sum.y1 <== My;
    sum.x2 <== kPub.out[0];
    sum.y2 <== kPub.out[1];

    C2x === sum.xout;
    C2y === sum.yout;
}
component main { public[C1x, C1y, C2x, C2y]} = ElGamalEncryptionProof();