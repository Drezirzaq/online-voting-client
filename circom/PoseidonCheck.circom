pragma circom 2.1.5;
include "./circomlib/circuits/poseidon.circom";

template PoseidonCheck(depth) {
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input nullifier;
    signal input secret;
    signal input pollId;
    signal input leaf;

    component secretHashPoseidon = Poseidon(1);
    secretHashPoseidon.inputs[0] <== secret;
        
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== leaf;
    poseidon.inputs[1] <== pollId;

    secretHashPoseidon.out === leaf;
    poseidon.out === nullifier;

    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }

    signal hash[depth + 1];
    hash[0] <== leaf;

    signal diff   [depth];
    signal tmp    [depth];
    signal left   [depth];
    signal right  [depth];

    component h[depth];

    for (var i = 0; i < depth; i++) {
        diff[i] <== pathElements[i] - hash[i];

        tmp[i]  <== diff[i] * pathIndices[i];

        // 3) перестановка без «if»
        left[i]  <== hash[i]           + tmp[i];      // если bit=0 → hash
                                                      // если bit=1 → sibling
        right[i] <== pathElements[i]   - tmp[i];      // противоположный

        // 4) Poseidon(parent)
        h[i] = Poseidon(2);
        h[i].inputs[0] <== left[i];
        h[i].inputs[1] <== right[i];

        hash[i + 1] <== h[i].out;      // передаём вверх
    }
    hash[depth] === root;
}
component main { public [ nullifier, pollId ] } = PoseidonCheck(3);