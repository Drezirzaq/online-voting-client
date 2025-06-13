<template>
  <div class="poll-details">
    <h2>{{ poll ? poll.title : "Голосование не найдено" }}</h2>

    <p v-if="poll && poll.isFinished" class="finished-message">
      Голосование завершено
    </p>
    <p v-else-if="hasVoted" class="voted-message">
      Вы уже приняли участие в этом голосовании
    </p>
    <p v-else-if="!hasPermission" class="no-permission-message">
      Вы не можете принять участие в этом голосовании
    </p>
    <p
      v-if="
        true == false &&
        poll &&
        poll.isPrivate &&
        hasPermission &&
        !poll.isFinished &&
        !hasVoted
      "
      class="tokens-available"
    >
      Вам доступно {{ poll.tokensAvailable }} токенов
    </p>

    <div class="options" v-if="poll">
      <label
        v-for="option in poll.options"
        :key="option.id"
        class="option-label"
      >
        <div class="option-text">
          <input
            type="radio"
            v-model="selectedOptionId"
            :value="option.id"
            :disabled="poll.isFinished || hasVoted || !hasPermission"
          />
          {{ option.option }}
          <span
            class="vote-count"
            v-if="poll.privatePollStatus == 2 || poll.isPrivate == false"
          >
            ({{ poll.votes[option.id] || 0 }} голосов)
          </span>
        </div>

        <input
          v-if="
            poll.isPrivate && hasPermission && !poll.isFinished && !hasVoted
          "
          type="number"
          min="1"
          :max="poll.tokensAvailable"
          class="token-input"
          v-model.number="tokenAmounts[option.id]"
          :disabled="selectedOptionId !== option.id"
          placeholder="Токены"
        />
      </label>
    </div>
    <button
      v-if="
        poll &&
        poll.isPrivate &&
        poll.privatePollStatus == 0 &&
        this.walletStore &&
        this.walletStore.registred.includes(this.poll.pollId) == false
      "
      @click="register"
      class="vote-button"
    >
      Зарегистрироваться
    </button>
    <button
      v-if="
        poll && poll.isPrivate && poll.privatePollStatus == 0 && poll.isOwner
      "
      @click="completeRegistaration"
      class="vote-button"
    >
      Завершить регистрацию
    </button>
    <button
      v-if="
        poll &&
        ((poll.isPrivate && poll.privatePollStatus == 1) ||
          poll.isPrivate == false)
      "
      @click="submitVote"
      :disabled="
        !selectedOptionId || poll?.isFinished || hasVoted || !hasPermission
      "
      class="vote-button"
    >
      Проголосовать
    </button>

    <button
      v-if="poll && poll.isOwner && !poll.isFinished"
      @click="endPoll"
      class="end-button"
    >
      Завершить голосование
    </button>

    <router-link to="/personal-account/polls" class="back-button"
      >Вернуться к списку</router-link
    >
  </div>
</template>

<script>
import { getPollDetails } from "../services/pollService";
import { useWalletStore } from "../services/walletStore";
import { sendTransaction, signData } from "../services/walletService";
import forge from "node-forge";
import cryptoJS from "crypto-js";
import axios from "axios";
import { ec as EC } from "elliptic";
// import { groth16 } from 'snarkjs';

export default {
  props: ["id"],
  setup() {
    const walletStore = useWalletStore();
    return { walletStore };
  },
  data() {
    return {
      poll: null,
      selectedOptionId: null,
      hasVoted: false,
      hasPermission: true,
      tokenAmounts: {},
      commitHex: "",
      nullifierHex: "",
      weight: 0,
      merklePath: [],
    };
  },
  async mounted() {
    await this.loadPoll();
    this.checkVoteStatus();
  },
  methods: {
    async loadPoll() {
      const request = {
        Address: this.walletStore.credentials.address,
        PollId: this.id,
      };
      this.poll = await getPollDetails(request);
      this.hasPermission = this.poll.hasPermission;
      // console.log("Голоса:", this.poll.votes);
      console.log(this.poll);
    },
    checkVoteStatus() {
      const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
      this.hasVoted = this.walletStore.voted.includes(voteKey) === true;
    },
    async submitVote() {
      // if (this.poll.isPrivate)
      //   this.submitZKPVote();
      // else
      this.submitUsualVote();
    },
    async submitUsualVote() {
      if (!this.selectedOptionId) {
        alert(`Выберите вариант, за который будете голосовать!`);
        return;
      }
      try {
        const keys = this.walletStore.getKeyes();
        const publicKey = forge.pki.publicKeyFromPem(this.poll.publicKey);

        // 1. Преобразуем selectedOption в хэш (как число)
        const md = forge.md.sha256.create();
        md.update(this.selectedOptionId, "utf8");
        const mBytes = md.digest().getBytes();
        const m = new forge.jsbn.BigInteger(forge.util.bytesToHex(mBytes), 16);
        // 2. Параметры открытого ключа подписанта
        const e = publicKey.e; // 65537
        const n = publicKey.n; // публичный модуль
        // 3. Случайное r такое, что gcd(r, n) = 1
        // Адаптер для генератора случайных байтов
        const rng = forge.random.createInstance();
        const rngAdapter = {
          nextBytes: function (ba) {
            const bytes = rng.getBytesSync(ba.length);
            for (let i = 0; i < ba.length; i++) {
              ba[i] = bytes.charCodeAt(i);
            }
          },
        };
        // Генерация случайного числа r, взаимно простого с n
        let r;
        do {
          r = new forge.jsbn.BigInteger(n.bitLength(), rngAdapter);
        } while (!r.gcd(n).equals(forge.jsbn.BigInteger.ONE));
        // 4. m' = m * r^e mod n (ослеплённое сообщение)
        const re = r.modPow(e, n);
        const blinded = m.multiply(re).mod(n);
        const blindedHex = blinded.toString(16);
        console.log("blindedHex", blindedHex);

        const signBlindedTransaction = {
          transactionType: 6,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: "",
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
          blindedMessage: blindedHex,
        };

        //получить анонимную подпись, разослепить и отправить анонимно голос.
        const rawData = `${signBlindedTransaction.publicKey}${signBlindedTransaction.fromAddress}${signBlindedTransaction.timestamp}${signBlindedTransaction.blindedMessage}${signBlindedTransaction.pollId}`;
        signBlindedTransaction.signature = await signData(
          rawData,
          keys.privateKey
        );
        const signedBlindedResponse = await sendTransaction(
          "poll/sign-blinded",
          signBlindedTransaction
        );
        console.log("SignedResponse", signedBlindedResponse.data);
        const signedBlindedHex =
          signedBlindedResponse.data.payload.signedBlindedMessage;

        console.log("signedBlindedHex", signedBlindedHex);
        console.log("r", r);

        // Преобразуем hex в BigInteger
        const signedBlinded = new forge.jsbn.BigInteger(signedBlindedHex, 16);
        // Получаем параметры публичного ключа
        const n1 = publicKey.n; // Модуль из публичного ключа
        // Вычисляем r^(-1) mod n
        const rInv = r.modInverse(n1);
        // Вычисляем разослепленное сообщение: s = s' * r^(-1) mod n
        const unblinded = signedBlinded.multiply(rInv).mod(n).toString(16);

        const anonimusOption = {
          transactionType: 7,
          publicKey: "",
          fromAddress: "",
          signature: signedBlindedResponse.data.signature,
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
          optionId: this.selectedOptionId,
          tokens: this.poll.tokensAvailable,
          signedUnblinded: unblinded,
          payload: signedBlindedResponse.data.payload,
        };
        const voteResponse = await sendTransaction(
          "poll/anonimus-vote",
          anonimusOption
        );
        console.log("VoteResponse", voteResponse);

        const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
        // localStorage.setItem(voteKey, "true");
        this.walletStore.voted.push(voteKey);
        this.hasVoted = true;

        if (this.poll.votes[this.selectedOptionId]) {
          this.poll.votes[this.selectedOptionId] += this.poll.tokensAvailable;
        } else {
          this.poll.votes[this.selectedOptionId] = this.poll.tokensAvailable;
        }
      } catch (error) {
        console.error(error.message);
      }
    },
    async submitZKPVote() {
      const secretHex = this.getOrCreateSecret();
      const { commitHex, weight, merklePath } = await axios
        .get(
          `http://192.168.1.87:5000/api/poll/${this.poll.pollId}/membership-path`,
          {
            params: { commit: this.commitHex },
          }
        )
        .then((r) => r.data);

      const nullifier = cryptoJS
        .SHA256(secretHex + this.poll.pollId)
        .toString();
      const selectedIndex = this.poll.options.findIndex(
        (opt) => opt.id === this.selectedOptionId
      );
      const oneBasedChioce = selectedIndex + 1;
      const m = oneBasedChioce * weight;

      const gHex = this.poll.votingKeyPair.gHex;
      const hHex = this.poll.votingKeyPair.hHex;

      const secp256k1 = new EC("secp256k1");
      const g = secp256k1.keyFromPublic(gHex, "hex").getPublic(); // G точка
      const h = secp256k1.keyFromPublic(hHex, "hex").getPublic(); // H = G^x

      const r = secp256k1.genKeyPair(); // случайный скаляр r
      const rScalar = r.getPrivate(); // число r
      const gr = g.mul(rScalar); // c1 = g^r
      const hr = h.mul(rScalar); // h^r
      const mPoint = g.mul(m); // m как точка: G * m
      const c2 = hr.add(mPoint); // c2 = h^r + G*m

      const { c1Hex, c2Hex } = {
        c1Hex: gr.encodeCompressed("hex"),
        c2Hex: c2.encodeCompressed("hex"),
      };

      const leaf = await this.makeLeaf(
        this.walletStore.credentials.address.toString(),
        secretHex
      );
      console.log("leaf", leaf);
      const decimalLeaf = this.hexToDecimalString(leaf);
      console.log("decimalLeaf", decimalLeaf);
      const leafBytes = this.hexToBytes(leaf);
      console.log("leafBytes", leafBytes);
      console.log("commitBytes", this.hexToBytes(commitHex));
      console.log("weightBytes", this.int32ToUint64LittleEndianBytes(weight));

      const inputMembership = {
        secret: this.hexToDecimalString(secretHex),
        pollId: this.hexToDecimalString(this.poll.pollId),
        weight: weight.toString(),

        leaf: decimalLeaf, // из твоей функции
        commit: this.hexToDecimalString(commitHex),
        nullifier: this.hexToDecimalString(nullifier),

        merklePath: merklePath.map((p) =>
          this.hexToDecimalString(p.siblingHex)
        ),
        merkleDirections: merklePath.map((p) => (p.dir === "left" ? 0 : 1)),
      };
      console.log(
        "Input being passed to fullProve:",
        JSON.stringify(inputMembership, null, 2)
      );
      // const { proof: proofMembership, publicSignals } = await groth16.fullProve(
      //   inputMembership,
      //   "/zk/membership.wasm",
      //   "/zk/membership.zkey"
      // );

      // const gXY = this.pointToDecimalXY(g);
      // const hXY = this.pointToDecimalXY(h);
      // const c1XY = this.pointToDecimalXY(gr);  // g^r
      // const c2XY = this.pointToDecimalXY(c2);  // h^r + g^m

      // const inputVote = {
      //   gX: gXY.x,
      //   gY: gXY.y,
      //   hX: hXY.x,
      //   hY: hXY.y,
      //   c1X: c1XY.x,
      //   c1Y: c1XY.y,
      //   c2X: c2XY.x,
      //   c2Y: c2XY.y,
      //   r: rScalar.toString(10),               // r как decimal
      //   choice: oneBasedChioce.toString(),     // выбор: 1, 2, 3, ...
      //   weight: weight.toString()              // вес
      // };

      // const { proof: proofVote, publicSignals: publicSignalsVote } = await groth16.fullProve(
      //   inputVote,
      //   "/zk/vote.wasm",
      //   "/zk/vote.zkey"
      // );

      // const proofTransaction = {
      //   pollId: this.poll.pollId,
      //   nullifier: this.hexToDecimalString(nullifier),
      //   ciphertext: {
      //     c1: c1Hex,
      //     c2: c2Hex
      //   },
      //   proofMembership,
      //   proofVote
      // };

      console.log("selectedOptionId    :", this.selectedOptionId);
      console.log("selectedIndex       :", selectedIndex);
      console.log("oneBasedChioce      :", oneBasedChioce);
      console.log("secretHex      (%d) :", secretHex.length, secretHex);
      console.log("commitHex      (%d) :", commitHex.length, commitHex);
      console.log("weight              :", weight);
      console.log("nullifier           :", nullifier);
      console.log("m                   :", m);
      console.log("gHex                :", gHex);
      console.log("hHex                :", hHex);
      console.log("g                   :", g);
      console.log("h                   :", h);
      console.log("r                   :", r);
      console.log("rScalar             :", rScalar);
      console.log("gr                  :", gr);
      console.log("hr                  :", hr);
      console.log("mPoint              :", mPoint);
      console.log("c2                  :", c2);
      console.log("c1Hex               :", c1Hex);
      console.log("c2Hex               :", c2Hex);
      console.log(
        "address.toString()  :",
        this.walletStore.credentials.address.toString()
      );
      console.log("inputMembership     :", inputMembership);
      // console.log("proofMembership     :", proofMembership);
      // console.log("publicSignals       :", publicSignals);
      // console.log("inputVote           :", inputVote);
      // console.log("proofVote           :", proofVote);
      // console.log("publicSignalsVote   :", publicSignalsVote);
      // console.log("proofTransaction    :", proofTransaction);
      console.log("merklePath", merklePath);
    },
    async submitZKPVote1() {
      // const secretHex = this.getOrCreateSecret();
      // if (!secretHex)
      //   throw "not registered in this poll on this device";
      // if (!this.commitHex)
      // {
      //   console.error("no commitHex");
      //   return;
      // }
      // const { commitHex, weight, merklePath } =
      //   await axios.get(`http://192.168.1.87:5000/api/poll/${this.poll.pollId}/membership-path`, {
      //         params:{ commit: this.commitHex }
      //   }).then(r => r.data);
      // const pollIdHex = this.poll.pollId.replace(/^0x/, "");
      // const nullifierHex = this.sha256Hex(secretHex + pollIdHex);
      // this.nullifierHex = "0x" + nullifierHex;
      // this.commitHex = commitHex;
      // this.weight = weight;
      // this.merklePath = merklePath;
      // const choiceId   = this.selectedOptionId;   // 0-based индекс варианта
      // const publicKey = this.poll.votingKeyPair;     // { g: "...", h: "..." }
      // const g = secp.ProjectivePoint.BASE;
      // const h = secp.ProjectivePoint.fromHex(publicKey.hHex);
      // const kHex  = secp.utils.bytesToHex(secp.utils.randomPrivateKey());   // 64-hex
      // const kBig  = bigInt("0x" + kHex);                                    // native BigInt
      // const mBig  = bigInt(choiceId) * bigInt(weight);
      // const c1 = g.multiply(kBig);                        // g^k
      // const c2 = h.multiply(kBig).add(g.multiply(mBig));  // h^k · g^m
      // this.ciphertext = {
      //   c1: secp.utils.bytesToHex(c1.toRawBytes(true)),   // 66-символов
      //   c2: secp.utils.bytesToHex(c2.toRawBytes(true))
      // };
      // // сохраняем m строкой — понадобится в zk-схеме «ValidVote»
      // this.choiceTimesWeight = mBig.toString(10);
      // console.groupCollapsed("📊  ZKP-vote debug");
      // console.log("secretHex      (%d) :", secretHex.length, secretHex);
      // console.log("nullifierHex   (%d) :", this.nullifierHex.length, this.nullifierHex);
      // console.log("commitHex      (%d) :", commitHex.length, commitHex);
      // console.log("weight                :", weight);
      // console.log("merklePath length     :", merklePath.length);
      // console.log("choiceId              :", choiceId);
      // console.log("m (choice×w)          :", this.choiceTimesWeight);
      // console.log("kHex          (%d) :", kHex.length, kHex);
      // console.log("cipher.c1     (%d) :", this.ciphertext.c1.length, this.ciphertext.c1.slice(0,10) + "…");
      // console.log("cipher.c2     (%d) :", this.ciphertext.c2.length, this.ciphertext.c2.slice(0,10) + "…");
      // console.groupEnd();
    },
    hexToDecimalString(hex) {
      return new forge.jsbn.BigInteger(hex, 16).toString(10);
    },
    pointToDecimalXY(point) {
      return {
        x: point.getX().toString(10),
        y: point.getY().toString(10),
      };
    },
    async register() {
      const keys = this.walletStore.getKeyes();
      const secretHex = this.getOrCreateSecret();
      const leafHex = await this.makeLeaf(
        this.walletStore.credentials.address.toString(),
        secretHex
      );
      const confirmParticipationTransaction = {
        transactionType: 8,
        publicKey: keys.publicKey.toString(),
        fromAddress: this.walletStore.credentials.address.toString(),
        signature: "",
        timestamp: new Date().toISOString(),
        pollId: this.poll.pollId,
        leaf: leafHex,
      };
      const rawData = `${confirmParticipationTransaction.publicKey}${confirmParticipationTransaction.fromAddress}${confirmParticipationTransaction.timestamp}${confirmParticipationTransaction.pollId}${confirmParticipationTransaction.leaf}`;
      confirmParticipationTransaction.signature = await signData(
        rawData,
        keys.privateKey
      );
      const response = await sendTransaction(
        "poll/confirm-registration",
        confirmParticipationTransaction
      );
      this.commitHex = response.data.commitHex;
      this.walletStore.registred.push(this.poll.pollId);
      console.log(response);
    },
    async completeRegistaration() {
      const keys = this.walletStore.getKeyes();
      const completeRegistration = {
        transactionType: 9,
        publicKey: keys.publicKey.toString(),
        fromAddress: this.walletStore.credentials.address.toString(),
        signature: "",
        timestamp: new Date().toISOString(),
        pollId: this.poll.pollId,
      };
      const rawData = `${completeRegistration.publicKey}${completeRegistration.fromAddress}${completeRegistration.timestamp}${completeRegistration.pollId}`;
      completeRegistration.signature = await signData(rawData, keys.privateKey);
      const response = await sendTransaction(
        "poll/finish-registration",
        completeRegistration
      );
      console.log(response);
    },
    sha256Hex(strUtf8) {
      return cryptoJS
        .SHA256(cryptoJS.enc.Utf8.parse(strUtf8))
        .toString(cryptoJS.enc.Hex); // 64-симв hex
    },
    hexToBytes(hex) {
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
      }
      return bytes;
    },
    int32ToUint64LittleEndianBytes(weight) {
      const bytes = new Uint8Array(8);
      const w = forge.jsbn.BigInteger.asUintN(
        64,
        forge.jsbn.BigInteger(weight)
      ); // расширяем до 64 бит без знака

      for (let i = 0; i < 8; i++) {
        bytes[i] = Number((w >> forge.jsbn.BigInteger(i * 8)) & 0xffn);
      }

      return Array.from(bytes); // возвращаем как обычный массив JS чисел
    },
    getOrCreateSecret() {
      let hex = localStorage.getItem("zkpSecret");
      if (!hex) {
        const wa = cryptoJS.lib.WordArray.random(32);
        hex = wa.toString(cryptoJS.enc.Hex);
        localStorage.setItem("zkpSecret", hex);
      }
      return hex; // 64-симв. hex-строка
    },
    makeLeaf(addrString, secretHex) {
      const addrWA = cryptoJS.enc.Utf8.parse(addrString); // WordArray
      const secretWA = cryptoJS.enc.Hex.parse(secretHex); // WordArray
      const allWA = addrWA.concat(secretWA); // склейка

      const digest = cryptoJS.SHA256(allWA); // SHA-256
      return digest.toString(cryptoJS.enc.Hex); // hex-строка
    },
    async endPoll() {
      const keys = this.walletStore.getKeyes();
      const transactionData = {
        transactionType: 5,
        publicKey: keys.publicKey.toString(),
        fromAddress: this.walletStore.credentials.address.toString(),
        signature: "",
        timestamp: new Date().toISOString(),
        pollId: this.poll.pollId,
      };
      const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.pollId}`;
      transactionData.signature = await signData(rawData, keys.privateKey);
      await sendTransaction("poll/finish-poll", transactionData);

      console.log("Транзакция успешно отправлена.");

      this.poll.isFinished = true;
    },
  },
};
</script>
<style scoped>
.poll-details {
  max-width: 500px;
  margin: auto;
  padding: 20px;
  text-align: center;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.option-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.option-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-input {
  display: none;
  width: 80px;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
}

h2 {
  color: #333;
  font-size: 22px;
}

.finished-message,
.voted-message {
  color: #dc3545;
  font-size: 18px;
  font-weight: bold;
  margin: 15px 0;
}

.options {
  display: flex;
  flex-direction: column;
  align-items: start;
  margin-bottom: 20px;
}

.option-label {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px;
  margin: 5px 0;
  border-radius: 5px;
  cursor: pointer;
  background: #f1f1f1;
  transition: 0.3s;
}

.option-label:hover {
  background: #ddd;
}

.vote-count {
  font-size: 14px;
  color: #555;
  font-weight: bold;
}

input[type="radio"] {
  margin-right: 10px;
}

button {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.vote-button {
  background: #007bff;
  color: white;
}

.vote-button:hover {
  background: #0056b3;
}

.vote-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.end-button {
  background: #dc3545;
  color: white;
}

.end-button:hover {
  background: #c82333;
}

.end-button:active {
  background: #a71d2a;
}

.back-button {
  display: block;
  margin-top: 15px;
  text-decoration: none;
  color: #007bff;
  font-size: 16px;
}

.back-button:hover {
  text-decoration: underline;
}
</style>
