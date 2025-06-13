<template>
  <div class="poll-container">
    <h2>Ввод секретного значения и листьев Merkle-дерева</h2>

    <div class="form-group">
      <label for="secret">Секретное значение:</label>
      <input
        type="text"
        id="secret"
        v-model="secretInput"
        placeholder="Введите secret (например: 123456789)"
      />
    </div>

    <hr class="my-4" />

    <h3>Добавление листьев дерева</h3>
    <form @submit.prevent="addLeaf">
      <div class="form-group">
        <label for="leaf">Новый leaf:</label>
        <input
          type="text"
          id="leaf"
          v-model="leafInput"
          placeholder="Введите leaf (например: 987654321)"
        />
      </div>

      <button type="submit">Добавить leaf</button>
    </form>

    <div v-if="leafArray.length" class="poll-preview">
      <h3>Листья дерева:</h3>
      <ul class="leaf-list">
        <li v-for="(leaf, index) in leafArray" :key="index" class="leaf-item">
          <span class="leaf-text">{{ index + 1 }}. {{ leaf }}</span>
          <button @click="removeLeaf(index)" class="remove-btn">✖</button>
        </li>
      </ul>
    </div>

    <button class="create-btn" @click="buildTree">Создать Merkle-дерево</button>
  </div>
</template>

<script>
import {
  buildMerkleTree,
  printMerkleTree,
  getMerkleProof,
  printMerkleProof,
} from "../services/zkSnarksService";
import { buildPoseidon } from "circomlibjs";
export default {
  data() {
    return {
      secretInput: "",
      leafInput: "",
      leafArray: [],
    };
  },
  methods: {
    addLeaf() {
      try {
        if (this.leafInput.trim() === "") return;
        const leaf = window.BigInt(this.leafInput.trim());
        this.leafArray.push(leaf.toString());
        this.leafInput = "";
      } catch (e) {
        alert("Введите корректное целое число для leaf");
      }
    },
    removeLeaf(index) {
      this.leafArray.splice(index, 1);
    },
    async buildTree() {
      const poseidon = await buildPoseidon();
      const F = poseidon.F;

      const secret = window.BigInt(this.secretInput);
      const pollId = 100n;

      const secretHash = F.toString(poseidon([secret]));
      const nullifier = F.toString(poseidon([secretHash, pollId]));
      const rawLeaves = this.leafArray;
      rawLeaves.push(secret);
      const leafHashes = rawLeaves.map((v) => poseidon([v]));
      const levels = buildMerkleTree(leafHashes, poseidon);
      const root = levels.at(-1)[0];

      printMerkleTree(levels);

      const leafIndex = rawLeaves.length - 1;
      const leaf = leafHashes[leafIndex];
      const { siblings, pathIndices } = getMerkleProof(levels, leafIndex);

      console.log("\n🎯  Target leaf:\n", F.toString(leaf));
      printMerkleProof(siblings, pathIndices);

      // ─── Подготовка входов Circom ────────────────────────────────────────────
      const toStr = (x) => F.toString(x);

      const input = {
        root: toStr(root),
        leaf: toStr(leaf),
        pathElements: siblings.map(toStr),
        pathIndices,
        secret: secret.toString(),
        pollId: pollId.toString(),
        nullifier,
      };

      console.log("\n📦  Circom input:\n", JSON.stringify(input, null, 2));
    },
  },
};
</script>

<style scoped>
.poll-container {
  max-width: 500px;
  margin: auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

h2,
h3 {
  text-align: center;
  font-size: 20px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background-color: #0056b3;
}

.create-btn {
  margin-top: 30px;
  background-color: #28a745;
}

.create-btn:hover {
  background-color: #218838;
}

.poll-preview {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 5px;
}

/* ───── Стили для списка листьев ───── */

.leaf-list {
  list-style: none;
  padding: 0;
  margin-top: 10px;
}

.leaf-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 8px;
  background-color: #f0f0f0;
}

.leaf-text {
  flex: 1;
  font-weight: 500;
  word-break: break-word;
  overflow-wrap: break-word;
  padding-right: 12px;
}

.remove-btn {
  background-color: #dc3545;
  border: none;
  color: white;
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
  text-align: center;
  line-height: 1;
  padding: 0;
}

.remove-btn:hover {
  background-color: #c82333;
}
</style>
