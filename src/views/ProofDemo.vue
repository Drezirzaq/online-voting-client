<template>
  <div class="proof-demo">
    <section class="data-column">
      <h2>Общие данные</h2>
      <div class="text-lines">
        <div v-for="(value, key) in generalData" :key="key">
          <strong>{{ key }}:</strong> {{ value }}
        </div>
      </div>
    </section>

    <div class="data-bar">
      <section class="data-column">
        <h2>Закрытые данные</h2>
        <div class="text-lines">
          <div v-for="(value, key) in clientData" :key="key">
            <strong>{{ key }}:</strong> {{ value }}
          </div>
        </div>
      </section>

      <section class="data-column">
        <h2>Не анонимные данные</h2>
        <div class="text-lines">
          <div v-for="(value, key) in serverData" :key="key">
            <strong>{{ key }}:</strong> {{ value }}
          </div>
        </div>
      </section>

      <section class="data-column">
        <h2>Анонимные данные</h2>
        <div class="text-lines">
          <div v-for="(value, key) in dataSendedClosed" :key="key">
            <strong>{{ key }}:</strong> {{ value }}
          </div>
        </div>
      </section>
    </div>

    <!-- ─────────── Карточка ─────────── -->
    <div class="poll-container">
      <h2 class="stage-title">
        {{ stageTitles[currentStage] }}
      </h2>
      <div class="card-content">
        <!-- ▸ Этап 1: список пользователей + secret -->
        <template v-if="currentStage === 1">
          <h3 class="title">Список пользователей</h3>

          <div class="options-block">
            <label>Пользователи</label>

            <div v-for="(user, idx) in users" :key="idx" class="row">
              <input :value="user.commit" class="wide-input" readonly />
              <input
                type="number"
                min="1"
                max="4"
                v-model="user.optionId"
                class="narrow-input"
                readonly
              />
              <input
                type="number"
                min="1"
                max="500"
                v-model="user.weight"
                class="narrow-input"
                readonly
              />

              <button
                type="button"
                class="icon-btn danger small"
                @click="removeUser(idx)"
                title="Удалить пользователя"
              >
                ✖
              </button>
            </div>

            <button type="button" class="btn success w100" @click="addUser">
              + Добавить пользователя
            </button>
          </div>

          <!-- ───────── Блок secret / commit ───────── -->
          <div class="options-block" style="margin-top: 24px">
            <label>Мой пользователь</label>
            <div class="row">
              <span class="row-label">weight</span>
              <input
                type="number"
                min="1"
                v-model="weightString"
                @input="clearSecretAndCommit"
                class="narrow-input"
              />
            </div>
            <div class="row">
              <span class="row-label">secret</span>
              <input :value="secretString" readonly class="narrow-input" />
            </div>
            <div class="row">
              <span class="row-label">commit</span>
              <input :value="commit" readonly class="narrow-input" />
            </div>
            <button
              type="button"
              class="btn primary w100"
              @click="generateSecret"
            >
              Сгенерировать секрет
            </button>
          </div>
        </template>

        <!-- ▸ Этап 2: дерево Merkle + ключи -->
        <template v-else-if="currentStage === 2">
          <!-- SVG-визуализация дерева -->
          <MerkleTree
            :levels="merkleLevels"
            :proof="merklePath"
            :leaf-idx="leafIndex"
          />

          <!-- Ключи BabyJubJub -->
          <div class="options-block" style="margin-top: 24px">
            <label>Ключи подписи (BabyJubJub)</label>

            <div class="row">
              <span class="row-label">sk</span>
              <input :value="skString" readonly />
            </div>

            <div class="row">
              <span class="row-label">pk.x</span>
              <input :value="pkXString" readonly />
            </div>

            <div class="row">
              <span class="row-label">pk.y</span>
              <input :value="pkYString" readonly />
            </div>

            <button
              type="button"
              class="btn primary w100"
              :disabled="keyPending"
              @click="generateKeys"
            >
              {{ keyPending ? "⏳ Генерируется…" : "Перегенерировать ключи" }}
            </button>
          </div>
        </template>

        <!-- ▸ Этап 3: ввод pollId/weight + входы для доказательств -->
        <template v-else-if="currentStage === 3">
          <h3 class="title">Параметры голоса</h3>

          <div class="options-block">
            <label>Параметры</label>
            <div class="row">
              <span class="row-label">pollId</span>
              <input type="number" min="0" v-model="pollIdString" />
            </div>
            <div class="row">
              <span class="row-label">optionId</span>
              <input type="number" min="0" v-model="optionIdString" />
            </div>
          </div>

          <button
            type="button"
            class="btn primary w100"
            :disabled="proofPending"
            @click="prepareProofInputs"
          >
            {{ proofPending ? "⏳ Формируется…" : "Сформировать входы" }}
          </button>

          <div
            v-if="membershipInputStr"
            class="options-block"
            style="margin-top: 16px"
          >
            <label>membershipInput</label>
            <textarea
              readonly
              rows="8"
              :value="membershipInputStr"
              style="width: 100%; resize: vertical"
            />
          </div>

          <div
            v-if="voteInputStr"
            class="options-block"
            style="margin-top: 16px"
          >
            <label>voteInput</label>
            <textarea
              readonly
              rows="8"
              :value="voteInputStr"
              style="width: 100%; resize: vertical"
            />
          </div>
        </template>

        <template v-if="currentStage === 4">
          <button
            class="btn primary w100"
            :disabled="proofPending"
            @click="generateProofs"
          >
            {{ proofPending ? "⏳ Генерация…" : "Создать доказательства" }}
          </button>

          <div class="options-block" style="margin-top: 24px">
            <label>
              Membership Signals
              <span v-if="proofStatus.membership === true">✔️</span>
              <span v-else-if="proofStatus.membership === false">❌</span>
            </label>
            <div
              v-for="(sig, i) in membershipSignals"
              :key="'msig-' + i"
              class="row"
            >
              <input v-model="membershipSignals[i]" />
            </div>
          </div>

          <div class="options-block" style="margin-top: 24px">
            <label>
              Vote Signals
              <span v-if="proofStatus.vote === true">✔️</span>
              <span v-else-if="proofStatus.vote === false">❌</span>
            </label>
            <div v-for="(sig, i) in voteSignals" :key="'vsig-' + i" class="row">
              <input v-model="voteSignals[i]" />
            </div>
          </div>
        </template>

        <template v-if="currentStage === 5">
          <h3 class="title">Проверка подтверждения доказательств</h3>

          <button
            class="btn primary w100"
            :disabled="!canVerify"
            @click="verifyEditedProofs"
          >
            Проверить доказательства
          </button>

          <div class="options-block" style="margin-top: 24px">
            <label>
              Membership Signals проверка:
              <span v-if="proofStatus.membership === true">✔️ Успешно</span>
              <span v-else-if="proofStatus.membership === false"
                >❌ Не подтверждено</span
              >
            </label>
          </div>

          <div class="options-block">
            <label>
              Vote Signals проверка:
              <span v-if="proofStatus.vote === true">✔️ Успешно</span>
              <span v-else-if="proofStatus.vote === false"
                >❌ Не подтверждено</span
              >
            </label>
          </div>
        </template>

        <template v-if="currentStage === 6">
          <button
            class="btn primary w100"
            @click="calculateVotes"
            :disabled="isCalculating"
          >
            {{ isCalculating ? "⏳ Подсчёт голосов…" : "Подсчитать голоса" }}
          </button>

          <div
            v-if="voteResults"
            class="options-block"
            style="margin-top: 24px"
          >
            <label>Результаты голосования:</label>
            <div v-for="(value, key) in voteResults" :key="key" class="row">
              <span class="row-label">{{ key }}:</span>
              <span>{{ value }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- точки + «Далее» -->
      <div class="stage-controls">
        <div class="stage-dots">
          <span
            v-for="n in STAGE_MAX"
            :key="n"
            :class="[
              'dot',
              { active: n === currentStage, done: n < currentStage },
            ]"
          />
        </div>

        <button
          class="btn primary next-btn"
          :disabled="!canGoNext"
          @click="nextStage"
        >
          Далее ▶
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { buildPoseidon, buildBabyjub } from "circomlibjs";
import { buildMerkleTree, getMerkleProof } from "@/services/zkSnarksService";
import MerkleTree from "@/components/MerkleTree.vue";
import { groth16 } from "snarkjs";
import { toRaw } from "vue";
/* -------------------- этапы -------------------- */
const STAGE_MAX = 6;
const currentStage = ref(1);
const stageTitles = [
  "",
  "Этап 1: Пользователи и секрет",
  "Этап 2: Merkle-дерево и ключи",
  "Этап 3: Входы для доказательств",
  "Этап 4: Генерация доказательств",
  "Этап 5: Проверка доказательств",
  "Этап 6: Подсчет голосов",
];

const clientData = reactive({});
const serverData = reactive({});
const generalData = reactive({});
const dataSendedClosed = reactive({});
/* ---------------- Stage 1 ---------------- */
const users = ref([]); // коммиты пользователей
const secret = ref(0n); // BigInt-секрет
const secretString = ref(""); // строка секрета
const commit = ref("");

/* ---------------- Merkle ---------------- */
const merkleLevels = ref([]); // уровни дерева
const merklePath = ref(null); // путь доказательства
const leafIndex = ref(-1);

/* ---------------- Keys (Stage 2) -------- */
const babyjub = ref(null); // модуль babyjub
const subOrder = ref(0n); // под-порядок
const sk = ref(null); // секретный ключ
const pk = ref([0n, 0n]); // публичный ключ
const keyPending = ref(false);

const skString = computed(() => sk.value?.toString() || "");
const pkXString = computed(() => pk.value?.[0]?.toString() || "");
const pkYString = computed(() => pk.value?.[1]?.toString() || "");
const membershipInput = ref(null);
const voteInput = ref(null);
const membershipSignals = ref([]);
const voteSignals = ref([]);
const C1sypher = ref([]);
const C2sypher = ref([]);
const proofStatus = ref({ membership: null, vote: null });
const membershipProof = ref(null);
const voteProof = ref(null);
const optionId = ref("0");
const voteResults = ref(null);
const isCalculating = ref(false);

/* ---------------- Stage 3 ---------------- */
const pollId = ref(0n);
const weight = ref(1n);
const optionIdString = computed({
  get: () => optionId.value,
  set: (v) => {
    optionId.value = v;
    dataSendedClosed.optionId = optionId.value;
    clearProofInputs();
  },
});
const pollIdString = computed({
  get: () => pollId.value.toString(),
  set: (v) => {
    pollId.value = window.BigInt(v || 0);
    dataSendedClosed.pollId = pollId.value;
    clearProofInputs();
  },
});
const weightString = computed({
  get: () => weight.value.toString(),
  set: (v) => {
    weight.value = window.BigInt(v || 1);
  },
});
const canGoNext = computed(() => {
  if (currentStage.value === STAGE_MAX) return false;

  if (currentStage.value === 1) {
    return !!secretString.value && !!commit.value;
  }

  if (currentStage.value === 3) {
    return !!membershipInput.value && !!voteInput.value;
  }

  if (currentStage.value === 4) {
    return (
      membershipSignals.value.length > 0 &&
      voteSignals.value.length > 0 &&
      membershipProof.value &&
      voteProof.value
    );
  }

  if (currentStage.value === 5) {
    return (
      proofStatus.value.membership === true && proofStatus.value.vote === true
    );
  }

  return true;
});

const membershipInputStr = ref("");
const voteInputStr = ref("");
const proofPending = ref(false);

/* ---------------- JSON-панели ------------ */
const serverState = reactive({});

const canVerify = computed(
  () =>
    !proofPending.value &&
    membershipProof.value != null &&
    voteProof.value != null
);

/* ---------------- Poseidon ---------------- */
const poseidon = ref(null);
const F = ref(null);
const FB = ref(null);
const G = ref(null);
let babyMap = ref(null);
const SQRT_MMAX = 1n << 16n;
/* ------------ инициализация -------------- */
onMounted(async () => {
  try {
    /* Poseidon */
    const p = await buildPoseidon();
    poseidon.value = p;
    F.value = p.F;

    /* BabyJubJub */
    const bj = await buildBabyjub();
    babyjub.value = bj;
    subOrder.value = bj.subOrder;
    FB.value = bj.F;
    G.value = bj.Base8;

    /* если уже на 2-м этапе → сразу ключи */
    if (currentStage.value === 2) generateKeys();
  } catch (err) {
    console.error("Init failed:", err);
  }
});

/* ---------------- helpers ---------------- */
function randomBigInt(bits = 256) {
  const bytes = bits / 8;
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  buf[0] |= 0b10000000; // неотрицательность
  return window.BigInt(
    "0x" + [...buf].map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

function addUser() {
  if (!poseidon.value) return;
  const commit = F.value.toString(poseidon.value([randomBigInt()]));
  const optionId = Math.floor(Math.random() * 4) + 1;
  const weight = Math.floor(Math.random() * 500) + 1;

  const user = { commit, optionId, weight };
  users.value.push(user);

  // добавим в generalData строку формата: user0: commit: ..., optionId: ..., weight: ...
  const idx = users.value.length - 1;
  const shortCommit = commit.slice(0, 6) + ".." + commit.slice(-2); // сокращение commit
  generalData[
    "user" + idx
  ] = `commit: ${shortCommit}, optionId: ${optionId}, weight: ${weight}`;
}

function removeUser(i) {
  users.value.splice(i, 1);

  // Удаляем строку user{i} из generalData
  delete generalData["user" + i];

  // Обновляем индексы всех следующих пользователей
  for (let j = i; j < users.value.length; j++) {
    const user = users.value[j];
    const shortCommit = user.commit.slice(0, 6) + ".." + user.commit.slice(-2);
    generalData[
      "user" + j
    ] = `commit: ${shortCommit}, optionId: ${user.optionId}, weight: ${user.weight}`;
  }

  // Удаляем "висящий" последний ключ (если раньше был userN, а теперь пользователей меньше)
  delete generalData["user" + users.value.length];
}

function generateSecret() {
  if (!poseidon.value) return;

  // 1. Генерация секрета
  secret.value = randomBigInt();
  secretString.value = secret.value.toString();

  // 2. Хэш секрета
  const sh = F.value.toString(poseidon.value([secret.value]));

  // 3. Коммит
  commit.value = F.value.toString(
    poseidon.value([sh, weight.value.toString()])
  );

  // ⬇ Обновляем clientData
  clientData.secret = secretString.value;

  // ⬇ Обновляем serverData
  serverData.weight = weightString.value;
  serverData.commit = commit.value;
  serverData.sh = sh;
}

function mul(P, s) {
  return babyjub.value.mulPointEscalar(P, s);
}
function addPoints(A, B) {
  return babyjub.value.addPoint(A, B);
}

function encode(m) {
  return mul(G.value, window.BigInt(m));
}
function clearSecretAndCommit() {
  secret.value = 0n;
  secretString.value = "";
  commit.value = "";

  // Удаляем из clientData
  delete clientData.secret;

  // Удаляем из serverData
  delete serverData.weight;
  delete serverData.commit;
  delete serverData.sh;
}
function clearProofInputs() {
  membershipInput.value = null;
  voteInput.value = null;
  membershipInputStr.value = "";
  voteInputStr.value = "";
  membershipProof.value = null;
  voteProof.value = null;
  delete dataSendedClosed.nullifier;
  delete dataSendedClosed.weightHash;
  delete dataSendedClosed.optionSecretHash;
  delete dataSendedClosed.C1X;
  delete dataSendedClosed.C1Y;
  delete dataSendedClosed.C2X;
  delete dataSendedClosed.C2Y;
}

function encrypt(pk, weight) {
  const M = encode(weight);
  console.log("pk", pk);
  const k = randScalar();
  return {
    C1: mul(G.value, k),
    C2: addPoints(M, mul(pk, k)),
    k,
  };
}

function randScalar(limit = subOrder.value) {
  let k;
  do {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf); // вместо Node-функции randomBytes

    // превращаем байты в шестнадцатеричную строку той же формы, что и раньше
    const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");

    // получаем BigInt
    k = window.BigInt("0x" + hex); // формат идентичен Node-версии
  } while (k === 0n || k >= limit);
  return k;
}

function keyGen() {
  const sk = randScalar();
  const pk = mul(G.value, sk);
  return { sk, pk };
}

function generateKeys() {
  if (!babyjub.value) return;
  keyPending.value = true;
  try {
    const { sk: s, pk: p } = keyGen();
    sk.value = s;
    pk.value = p; // p — массив [x, y]
    generalData.SK = s.toString();
    generalData.pkX = F.value.toString(p[0]);
    generalData.pkY = F.value.toString(p[1]);
  } catch (err) {
    console.error("Key generation failed:", err);
    alert("Ошибка генерации ключей (см. консоль).");
  } finally {
    keyPending.value = false;
  }
}

/* ---------- переход между этапами -------- */
function nextStage() {
  if (currentStage.value >= STAGE_MAX) return;
  currentStage.value += 1;

  /* при входе на Этап 2 */
  if (currentStage.value === 2 && poseidon.value) {
    buildTreeAndProof();
    generateKeys();
  }
  if (currentStage.value === 3) {
    pollId.value = 1;
    optionId.value = 1;
    dataSendedClosed.pollId = 1;
    dataSendedClosed.optionId = 1;
  }
  if (currentStage.value === 4) serverState.stage = currentStage.value;
  serverState.timestamp = Date.now();
}

function buildTreeAndProof() {
  /* 1. коммиты → BigInt[] */
  const userLeaves = users.value.map((x) => F.value.e(x.commit));

  /* 2. случайный индекс вставки commit */
  const shIdx = Math.floor(Math.random() * (userLeaves.length + 1));

  /* 3. leaves с вставленным commit */
  const leaves = [...userLeaves];
  leaves.splice(shIdx, 0, F.value.e(commit.value || 0n));

  /* 4. дополняем нулями Poseidon до 8 листьев */
  const zeroHash = poseidon.value([0n]);
  while (leaves.length < 8) leaves.push(zeroHash);

  leafIndex.value = shIdx;
  merkleLevels.value = buildMerkleTree(leaves, poseidon.value);
  merkleLevels.value = merkleLevels.value.map((x) => x.map((y) => toStr(y)));
  merklePath.value = getMerkleProof(merkleLevels.value, shIdx);
}

/* ----------- Stage-3 logic --------------- */
function toStr(x) {
  return F.value.toString(x);
}
function toBig(v) {
  return typeof v === "bigint" ? v : FB.value.toObject(v);
}

async function prepareProofInputs() {
  if (!poseidon.value || !merklePath.value) {
    alert("Не хватает данных для формирования входов.");
    return;
  }

  proofPending.value = true;
  try {
    const lsecret = secret.value.toString();
    const lweight = weight.value.toString();

    const lsh = F.value.toString(poseidon.value([lsecret]));
    const commit = F.value.toString(poseidon.value([lsh, lweight]));
    const lpollId = pollId.value;
    const weightHash = F.value.toString(poseidon.value([lweight]));
    const nullifier = F.value.toString(poseidon.value([commit, lpollId]));
    const optionSecretHash = F.value.toString(
      poseidon.value([optionId.value.toString(), lsecret])
    );
    const root = merkleLevels.value.at(-1)[0];

    dataSendedClosed.nullifier = nullifier;
    dataSendedClosed.weightHash = weightHash;
    dataSendedClosed.optionSecretHash = optionSecretHash;

    const { C1, C2, k } = encrypt(pk.value, weight.value);
    dataSendedClosed.C1X = toStr(C1[0]);
    dataSendedClosed.C1Y = toStr(C1[1]);
    dataSendedClosed.C2X = toStr(C2[0]);
    dataSendedClosed.C2Y = toStr(C2[1]);
    C1sypher.value = C1;
    C2sypher.value = C2;
    const siblings = merklePath.value.siblings;
    const pathIndices = [...toRaw(merklePath.value.pathIndices)];

    membershipInput.value = {
      root,
      pathElements: siblings,
      pathIndices,
      nullifier,
      secret: lsecret.toString(),
      pollId: lpollId.toString(),
      weight: lweight,
      weightHash,
      commit,
      optionId: optionId.value.toString(),
      optionSecretHash,
    };
    voteInput.value = {
      C1x: toBig(C1[0]).toString(),
      C1y: toBig(C1[1]).toString(),
      C2x: toBig(C2[0]).toString(),
      C2y: toBig(C2[1]).toString(),
      PubX: toBig(pk.value[0]).toString(),
      PubY: toBig(pk.value[1]).toString(),
      k: k.toString(),
      m: weight.value.toString(),
    };
    console.log(voteInput);

    membershipInputStr.value = JSON.stringify(membershipInput.value, null, 2);
    voteInputStr.value = JSON.stringify(voteInput.value, null, 2);
  } catch (err) {
    console.error("prepareProofInputs failed:", err);
    alert("Ошибка формирования входных данных (см. консоль).");
  } finally {
    proofPending.value = false;
  }
}
async function generateProofs() {
  if (!membershipInput.value || !voteInput.value) {
    alert("Сначала сформируйте входные данные на этапе 3.");
    return;
  }

  proofPending.value = true;
  try {
    let mSignals, vSignals, mp, vp;

    try {
      const membershipWasm = "/circom/PoseidonCheck_js/PoseidonCheck.wasm";
      const membershipZkey = "/circom/PoseidonCheck.zkey";

      const result = await groth16.fullProve(
        membershipInput.value,
        membershipWasm,
        membershipZkey
      );
      mSignals = result.publicSignals;
      mp = result.proof;
    } catch (err) {
      console.error("Ошибка генерации membershipProof:", err);
      throw new Error("Membership proof generation failed.");
    }

    try {
      const voteWasm = "/circom/ElGamalCheck_js/ElGamalCheck.wasm";
      const voteZkey = "/circom/ElGamalCheck.zkey";

      const result = await groth16.fullProve(
        voteInput.value,
        voteWasm,
        voteZkey
      );
      vSignals = result.publicSignals;
      vp = result.proof;
    } catch (err) {
      console.error("Ошибка генерации voteProof:", err);
      throw new Error("Vote proof generation failed.");
    }

    membershipSignals.value = mSignals.map((x) => x.toString());
    voteSignals.value = vSignals.map((x) => x.toString());
    membershipProof.value = mp;
    voteProof.value = vp;
  } catch (err) {
    console.error("generateProofs failed:", err);
    alert("Ошибка генерации доказательств (см. консоль)");
  } finally {
    proofPending.value = false;
  }
}
async function verifyEditedProofs() {
  proofPending.value = true;
  try {
    const membershipVkey = await fetch("/circom/PoseidonCheck.vkey.json").then(
      (r) => r.json()
    );
    const voteVkey = await fetch("/circom/ElGamalCheck.vkey.json").then((r) =>
      r.json()
    );

    const mOk = await groth16.verify(
      membershipVkey,
      [...membershipSignals.value],
      membershipProof.value
    );
    const vOk = await groth16.verify(
      voteVkey,
      [...voteSignals.value],
      voteProof.value
    );

    proofStatus.value.membership = mOk;
    proofStatus.value.vote = vOk;
  } catch (err) {
    console.error("verifyEditedProofs failed:", err);
    alert("Ошибка при проверке сигналов (см. консоль)");
  } finally {
    proofPending.value = false;
  }
}
async function calculateVotes() {
  isCalculating.value = true;

  const transformed = {};

  for (const key in users.value) {
    const user = users.value[key];
    const { C1, C2 } = encrypt(pk.value, user.weight);

    // Инициализируем массив, если его ещё нет
    if (!transformed[user.optionId]) {
      transformed[user.optionId] = [];
    }

    transformed[user.optionId].push({ C1, C2 });
  }

  if (!transformed[optionId.value]) {
    transformed[optionId.value] = [];
  }

  transformed[optionId.value].push({ C1: C1sypher.value, C2: C2sypher.value });
  const secretKey = window.BigInt(sk.value);
  const result = {};
  for (const key in transformed) {
    const agg = aggregateCiphertexts(transformed[key]);
    const total = decrypt(secretKey, agg.C1, agg.C2);
    console.log(total);
    result[key] = total.toString();
  }
  voteResults.value = result;
  isCalculating.value = false;
}
function aggregateCiphertexts(ciphertexts) {
  return ciphertexts.reduce(
    (agg, { C1, C2 }) => ({
      C1: addPoints(agg.C1, C1), // суммируем C1
      C2: addPoints(agg.C2, C2), // суммируем C2
    }),
    { C1: encode(0n), C2: encode(0n) } // нейтральная точка
  );
}
function decrypt(sk, C1, C2) {
  const M = addPoints(C2, neg(mul(C1, sk))); // M = C2 − sk·C1 = m·G
  return bsgs(M);
}
function neg([x, y]) {
  return [FB.value.neg(x), y];
}
function bsgs(point) {
  buildBabyTable();
  const m = SQRT_MMAX;
  const step = neg(encode(m)); // −m·G
  let gamma = point;
  for (let i = 0n; i < m; i++) {
    const key = gamma[0].toString() + "," + gamma[1].toString();
    const j = babyMap.value.get(key);
    if (j !== undefined) return i * m + j; // вес найден
    gamma = addPoints(gamma, step);
  }
  throw new Error("BSGS: логарифм не найден — возможно, вес > 2^32−1");
}
function buildBabyTable() {
  if (babyMap.value) return; // уже построена
  console.time("[BSGS] baby‑steps");
  babyMap.value = new Map();
  let P = encode(0n);
  for (let j = 0n; j < SQRT_MMAX; j++) {
    babyMap.value.set(P[0].toString() + "," + P[1].toString(), j);
    P = addPoints(P, G.value); // P ← P + G (дешевле, чем 65k.mul)
  }
  console.timeEnd("[BSGS] baby‑steps");
}
</script>

<style scoped>
/* (CSS точно такой же, как в предыдущей версии) */

.proof-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* данные клиента/сервера */
.data-bar {
  display: flex;
  gap: 16px;
}
.data-column {
  flex: 1;
  background: #f3f3f3;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  min-width: 0;
}
.data-column pre {
  margin: 0;
  max-height: 180px;
  overflow: auto;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;

  /* новые свойства */
  white-space: nowrap; /* не переносить строки */
  overflow: hidden; /* скрыть выходящее */
  text-overflow: ellipsis; /* добавить троеточие */
}

/* карточка */
.poll-container {
  width: 480px;
  max-width: 95%;
  margin: 0 auto;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.card-content {
  min-height: 120px;
}

/* точки + кнопка */
.stage-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.stage-dots {
  display: flex;
  gap: 10px;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #c5c5c5;
}
.dot.active {
  background: #007bff;
}
.dot.done {
  background: #28a745;
}
.next-btn {
  width: 160px;
}

/* кнопки / ряды / стили */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  color: #fff;
  transition: 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.primary {
  background: #007bff;
}
.primary:hover:not(:disabled) {
  background: #0056b3;
}
.success {
  background: #28a745;
}
.success:hover:not(:disabled) {
  background: #218838;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.row input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: #fff;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.icon-btn.danger {
  background: #dc3545;
  border-radius: 6px;
}
.icon-btn.danger:hover {
  background: #c82333;
}
.small {
  width: 32px;
  height: 32px;
  font-size: 18px;
}

.options-block label {
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
  text-align: left;
}
.title {
  text-align: center;
  margin-bottom: 16px;
  font-size: 22px;
  color: #333;
}
.row-label {
  width: 60px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
}
.stage-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-top: -8px;
  margin-bottom: 8px;
  color: #333;
}
.text-lines div {
  display: flex;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.text-lines strong {
  flex-shrink: 0;
}
.text-lines div > *:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
}
.wide-input {
  flex: 1;
  padding: 8px;
  font-family: monospace;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;

  /* Добавь вот это ↓ */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.narrow-input {
  width: 60px; /* было 20px — очень мало */
  padding: 6px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: #fff;

  /* Чтобы был обрезанный текст, если вдруг длинный */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
