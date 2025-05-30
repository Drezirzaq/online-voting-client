pragma circom 2.0.0;

include "circomlib/sha256.circom";
include "circomlib/bitify.circom";
include "circomlib/merkle.circom";

template Membership(depth) {
    // Inputs
    signal input secret;        // scalar
    signal input pollId;        // scalar
    signal input weight;        // scalar
    signal input address;       // scalar (число, например, 160-битный адрес Ethereum)
    
    signal input leaf[2];       // SHA256: 256 бит = 2 * 128-бит
    signal input commit[2];
    signal input nullifier[2];
    
    signal input merklePath[depth][2];   // каждый сосед по 256 бит (2 * 128)
    signal input merkleDirections[depth]; // 0 = left, 1 = right
    signal input merkleRoot[2];          // публичный root

    // Outputs
    signal output outCommit[2];
    signal output outNullifier[2];
    signal output outRoot[2];

    // --- Step 1: leaf = SHA256(address || secret) ---
    component addrBits = Num2Bits(256);
    addrBits.in <== address;

    component secretBits = Num2Bits(256);
    secretBits.in <== secret;

    signal fullLeafInput[512];
    for (var i = 0; i < 256; i++) {
        fullLeafInput[i] = addrBits.out[i];
        fullLeafInput[256 + i] = secretBits.out[i];
    }

    component leafHash = Sha256();
    leafHash.in <== fullLeafInput;

    // leaf == hash(address || secret)
    for (var i = 0; i < 2; i++) {
        leafHash.out[i] === leaf[i];
    }

    // --- Step 2: commit = SHA256(leaf || weightLE8) ---
    component weightBits = Num2Bits(64);
    weightBits.in <== weight;

    signal paddedWeightBits[256];
    for (var i = 0; i < 256; i++) {
        if (i < 64) {
            paddedWeightBits[i] = weightBits.out[i]; // little endian
        } else {
            paddedWeightBits[i] = 0;
        }
    }

    signal leafBits[256];
    for (var i = 0; i < 2; i++) {
        component lb = Num2Bits(128);
        lb.in <== leaf[i];
        for (var j = 0; j < 128; j++) {
            leafBits[i * 128 + j] = lb.out[j];
        }
    }

    signal fullCommitInput[512];
    for (var i = 0; i < 256; i++) {
        fullCommitInput[i] = leafBits[i];
        fullCommitInput[256 + i] = paddedWeightBits[i];
    }

    component commitHash = Sha256();
    commitHash.in <== fullCommitInput;

    for (var i = 0; i < 2; i++) {
        commitHash.out[i] === commit[i];
        outCommit[i] <== commit[i];
    }

    // --- Step 3: nullifier = SHA256(secret || pollId) ---
    component pollIdBits = Num2Bits(256);
    pollIdBits.in <== pollId;

    signal nullifierInput[512];
    for (var i = 0; i < 256; i++) {
        nullifierInput[i] = secretBits.out[i];
        nullifierInput[256 + i] = pollIdBits.out[i];
    }

    component nullifierHash = Sha256();
    nullifierHash.in <== nullifierInput;

    for (var i = 0; i < 2; i++) {
        nullifierHash.out[i] === nullifier[i];
        outNullifier[i] <== nullifier[i];
    }

    // --- Step 4: Merkle Membership ---
    component tree = MerkleProof(depth);
    for (var i = 0; i < depth; i++) {
        tree.pathElements[i][0] <== merklePath[i][0];
        tree.pathElements[i][1] <== merklePath[i][1];
        tree.pathIndices[i] <== merkleDirections[i];
    }

    tree.leaf[0] <== leaf[0];
    tree.leaf[1] <== leaf[1];

    for (var i = 0; i < 2; i++) {
        tree.root[i] === merkleRoot[i];
        outRoot[i] <== merkleRoot[i];
    }
}

component main = Membership(20);