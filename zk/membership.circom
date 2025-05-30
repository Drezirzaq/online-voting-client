pragma circom 2.0.0;

template Membership() {
    signal input secret;
    signal input pollId;
    signal input weight;
    signal input leaf;
    signal input commit;
    signal input nullifier;
    signal input merklePath[20];
    signal input merkleDirections[20];

    signal output out;
    out <== secret + weight + pollId;
}

component main = Membership();