pragma circom 2.1.5;
include "./circomlib/circuits/poseidon.circom";

template PoseidonCheck(depth) {
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input nullifier;
    signal input secret;
    signal input pollId;
    signal input weight;
    signal input weightHash;
    signal input commit;
    signal input optionId;
    signal input optionSecretHash;

    component optionSecretHashPoseidon = Poseidon(2);
    optionSecretHashPoseidon.inputs[0] <== optionId;
    optionSecretHashPoseidon.inputs[1] <== secret;
    optionSecretHash === optionSecretHashPoseidon.out;

    //weight hash check
    component weightHashPoseidon = Poseidon(1);
    weightHashPoseidon.inputs[0] <== weight;
    weightHash === weightHashPoseidon.out;

    //sh
    component secretHashPoseidon = Poseidon(1);
    secretHashPoseidon.inputs[0] <== secret;

    //commit
    component commitHashPoseidon = Poseidon(2);
    commitHashPoseidon.inputs[0] <== secretHashPoseidon.out;
    commitHashPoseidon.inputs[1] <== weight;
    commit === commitHashPoseidon.out;

    //nullifier check
    component nullifierHashPoseidon = Poseidon(2);
    nullifierHashPoseidon.inputs[0] <== commitHashPoseidon.out;
    nullifierHashPoseidon.inputs[1] <== pollId;
    nullifierHashPoseidon.out === nullifier;

    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }

    signal hash[depth + 1];
    hash[0] <== commit;

    signal diff   [depth];
    signal tmp    [depth];
    signal left   [depth];
    signal right  [depth];

    component h[depth];

    for (var i = 0; i < depth; i++) {
        diff[i] <== pathElements[i] - hash[i];

        tmp[i]  <== diff[i] * pathIndices[i];

        left[i]  <== hash[i] + tmp[i];                               
        right[i] <== pathElements[i] - tmp[i]; 
        h[i] = Poseidon(2);
        h[i].inputs[0] <== left[i];
        h[i].inputs[1] <== right[i];
        hash[i + 1] <== h[i].out; 
    }
    hash[depth] === root;
}
component main { public [ nullifier, pollId, weightHash, root, optionId ] } = PoseidonCheck(3);

