// import { groth16 } from "snarkjs";
// import { fileURLToPath } from "url";
import { Buffer } from "buffer";
// import path from "path";

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
export async function CreateProof() {
  //   const __filename = fileURLToPath(import.meta.url);
  //   const __dirname = path.dirname(__filename);
  //   const CIRCOM_DIR = path.join(__dirname, "circom");
  //   const wasmPath = path.join(
  //     CIRCOM_DIR,
  //     "PoseidonCheck_js",
  //     "PoseidonCheck.wasm"
  //   );
  //   const zkeyPath = path.join(CIRCOM_DIR, "PoseidonCheck.zkey");
  //   const { proof, publicSignals } = await groth16.fullProve(
  //     input,
  //     wasmPath,
  //     zkeyPath
  //   );
  //   return { proof, publicSignals };
}
function shortHex(u8) {
  const hex = Buffer.from(u8).toString("hex");
  return "0x" + hex.slice(0, 4) + "…" + hex.slice(-2);
}
