import { Buffer } from "buffer";
import { buildBabyjub } from "circomlibjs";

export const babyjub = await buildBabyjub();
const { F, subOrder, Base8: G } = babyjub;
console.log("G", G);

export function buildMerkleTree(leaves, poseidon) {
  const n = 1 << Math.ceil(Math.log2(leaves.length));
  const padded = leaves.concat(Array(n - leaves.length).fill(0n));

  const levels = [padded];
  while (levels.at(-1).length > 1) {
    const prev = levels.at(-1);
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push(poseidon([prev[i], prev[i + 1]]));
    }
    levels.push(next);
  }
  return levels;
}
export function getMerkleProof(levels, leafIdx) {
  const siblings = [];
  const pathIndices = [];

  let idx = leafIdx;
  for (let lvl = 0; lvl < levels.length - 1; lvl++) {
    const isRight = idx & 1;
    const pairIdx = isRight ? idx - 1 : idx + 1;

    siblings.push(levels[lvl][pairIdx]);
    pathIndices.push(isRight);

    idx >>= 1;
  }
  return { siblings, pathIndices };
}

export function printMerkleTree(levels) {
  console.log("\n🌳  Merkle tree (top ➜ leaves):");
  for (let lvl = levels.length - 1; lvl >= 0; lvl--) {
    const nodes = levels[lvl]
      .map((v) => (typeof v === "bigint" ? v.toString() : shortHex(v)))
      .join(" │ ");
    console.log(`L${lvl} (${levels[lvl].length}): ${nodes}`);
  }
}
export function printMerkleProof(siblings, pathIndices) {
  console.log("\n🔎  Merkle-proof:");
  siblings.forEach((sib, i) => {
    const dir = pathIndices[i] === 0 ? "left " : "right";
    const label = `lvl ${i}`;
    const sibStr = typeof sib === "bigint" ? sib.toString() : shortHex(sib);
    console.log(
      `${label.padEnd(6)} | sibling = ${sibStr.padEnd(
        15
      )} | our leaf was ${dir}`
    );
  });
}

export function toBig(v) {
  return typeof v === "bigint" ? v : F.toObject(v);
}
export function add(A, B) {
  return babyjub.addPoint(A, B);
}
export function mul(P, s) {
  return babyjub.mulPointEscalar(P, s);
}
export function encode(m) {
  return mul(G, window.BigInt(m));
}
export function randScalar(limit = subOrder) {
  let k;
  do {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);

    const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");

    k = window.BigInt("0x" + hex);
  } while (k === 0n || k >= limit);
  return k;
}
export function encrypt(pk, weight) {
  const M = encode(weight);
  console.log("pk", pk);

  const k = randScalar();
  return {
    C1: mul(G, k),
    C2: add(M, mul(pk, k)),
    k,
  };
}
function shortHex(u8) {
  const hex = Buffer.from(u8).toString("hex");
  return "0x" + hex.slice(0, 4) + "…" + hex.slice(-2);
}
