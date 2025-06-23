<template>
  <div class="poll-details">
    <h2>{{ poll ? poll.title : "Голосование не найдено" }}</h2>

    <div class="info-messages">
      <p v-if="pollWeight" class="info-message">
        Вес вашего голоса: <strong>{{ pollWeight }}</strong>
      </p>

      <p v-if="poll && poll.isFinished" class="info-message">
        Голосование завершено
      </p>
      <p v-else-if="hasVoted" class="info-message">
        Вы уже приняли участие в этом голосовании, ожидайте завершения
        голосования
      </p>
      <p v-else-if="!hasPermission" class="info-message">
        Вы не можете принять участие в этом голосовании
      </p>
    </div>

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
            :value="option.id.toString()"
            :disabled="!isVotingStage || hasVoted || !hasPermission"
          />
          {{ option.option }}
          <span class="vote-count">
            ({{ poll.votes[option.id] || 0 }} голосов)
          </span>
        </div>

        <input
          v-if="poll.isPrivate && hasPermission && isVotingStage && !hasVoted"
          type="number"
          min="1"
          :max="poll.tokensAvailable"
          class="token-input"
          v-model.number="tokenAmounts[option.id]"
          :disabled="selectedOptionId !== option.id.toString()"
          placeholder="Токены"
        />
      </label>
    </div>

    <button
      v-if="
        poll &&
        poll.isPrivate &&
        poll.privatePollStatus == 0 &&
        walletStore &&
        !walletStore.registred.includes(poll.pollId) &&
        !localRegisteredPolls.includes(poll.pollId)
      "
      @click="register"
      class="vote-button"
      :disabled="isRegistering"
    >
      {{ isRegistering ? "Регистрация..." : "Зарегистрироваться" }}
    </button>

    <button
      v-if="
        poll && poll.isPrivate && poll.privatePollStatus == 0 && poll.isOwner
      "
      @click="completeRegistaration"
      class="vote-button"
      :disabled="isCompletingRegistration"
    >
      {{ isCompletingRegistration ? "Завершение..." : "Завершить регистрацию" }}
    </button>
    <button
      v-if="
        poll &&
        ((poll.isPrivate && poll.privatePollStatus == 1) ||
          poll.isPrivate == false)
      "
      @click="submitVote"
      :disabled="
        !selectedOptionId ||
        poll?.isFinished ||
        hasVoted ||
        !hasPermission ||
        isVoting
      "
      class="vote-button"
    >
      {{ isVoting ? "Голосование..." : "Проголосовать" }}
    </button>
    <button
      v-if="poll && poll.isOwner && !poll.isFinished"
      @click="endPoll"
      :disabled="isFinishingPoll"
      class="end-button"
    >
      {{ isFinishingPoll ? "Завершение..." : "Завершить голосование" }}
    </button>

    <router-link to="/personal-account/polls" class="back-button">
      Вернуться к списку
    </router-link>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script>
import { getPollDetails } from "../services/pollService";
import { useWalletStore } from "../services/walletStore";
import { sendTransaction, signData } from "../services/walletService";
import { toBig, encrypt, babyjub } from "../services/zkSnarksService";
import { buildPoseidon } from "circomlibjs";
import axios from "axios";
import { groth16 } from "snarkjs";

export default {
  props: ["id"],
  computed: {
    isVotingStage() {
      if (!this.poll) return false;
      if (this.poll.isFinished) return false;
      if (this.poll.isPrivate) {
        return this.poll.privatePollStatus === 1;
      }
      return true;
    },
    votedOption() {
      if (!this.poll || !this.hasVoted) return null;
      const votedId = localStorage.getItem(`votedOption_${this.poll.pollId}`);
      if (!votedId) return null;

      return this.poll.options.find((o) => o.id === votedId);
    },
  },
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
      errorMessage: "",
      isRegistering: false,
      localRegisteredPolls: [],
      isCompletingRegistration: false,
      isVoting: false,
      isFinishingPoll: false,
      pollWeight: null,
    };
  },
  async mounted() {
    this.localRegisteredPolls = JSON.parse(
      localStorage.getItem("localRegisteredPolls") || "[]"
    );
    try {
      await this.loadPoll();
      if (this.poll?.isFinished) {
        await this.fetchResults();
      }
      this.checkVoteStatus();
    } catch (e) {
      this.processError(e);
    }
  },
  methods: {
    processError(error) {
      console.error(error);
      this.errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.toString() ||
        "Неизвестная ошибка";
    },
    async loadPoll() {
      this.errorMessage = "";
      try {
        const request = {
          Address: this.walletStore.credentials.address,
          PollId: this.id,
        };
        this.poll = await getPollDetails(request);
        console.log("Poll options", this.poll.options);

        this.hasPermission = this.poll.hasPermission;
        const localVote = localStorage.getItem(
          `votedOption_${this.poll.pollId}`
        );
        if (localVote) {
          this.selectedOptionId = localVote;
        }
        const allWeights = JSON.parse(
          localStorage.getItem("weightsPerPoll") || "{}"
        );
        this.pollWeight = allWeights[this.poll.pollId] || null;
      } catch (e) {
        this.processError(e);
      }
    },
    async fetchResults() {
      if (this.poll.isPrivate == false) return;
      try {
        const { results } = await axios
          .get(
            `https://192.168.1.87:5000/api/poll/${this.poll.pollId}/poll-results`
          )
          .then((r) => r.data);

        this.poll.votes = {};
        for (const [index, count] of Object.entries(results)) {
          const option = this.poll.options[Number(index)];
          if (option) {
            this.poll.votes[option.id] = count;
          }
        }
      } catch (e) {
        this.processError(e);
      }
    },
    checkVoteStatus() {
      try {
        const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
        this.hasVoted = this.walletStore.voted.includes(voteKey);

        if (this.hasVoted && !localStorage.getItem(`votedOption_${this.id}`)) {
          const savedId = this.poll?.options?.find((opt) => opt.votedByUser);
          if (savedId) {
            localStorage.setItem(
              `votedOption_${this.poll.pollId}`,
              this.selectedOptionId.toString()
            );
          }
        }
      } catch (e) {
        this.processError(e);
      }
    },
    async submitVote() {
      this.errorMessage = "";
      this.isVoting = true;
      try {
        if (this.poll.isPrivate) {
          await this.submitZKPVote();
        } else {
          await this.submitUsualVote();
        }

        const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
        if (!this.walletStore.voted.includes(voteKey)) {
          this.walletStore.voted.push(voteKey);
        }

        localStorage.setItem(
          `votedOption_${this.poll.pollId}`,
          this.selectedOptionId.toString()
        );

        await this.loadPoll();
        this.checkVoteStatus();
      } catch (e) {
        this.processError(e);
      } finally {
        this.isVoting = false;
      }
    },
    async submitZKPVote() {
      try {
        const secret = localStorage.getItem("secret");
        const weight = localStorage.getItem("weight");
        const allWeights = JSON.parse(
          localStorage.getItem("weightsPerPoll") || "{}"
        );
        allWeights[this.poll.pollId] = weight;
        localStorage.setItem("weightsPerPoll", JSON.stringify(allWeights));

        this.pollWeight = weight;
        if (!secret || !weight) {
          throw new Error("Отсутствуют обязательные данные (secret/weight)");
        }

        const poseidon = await buildPoseidon();
        const F = poseidon.F;
        const sh = F.toString(poseidon([secret]));
        const commit = F.toString(poseidon([sh, weight.toString()]));

        const { siblings, merklePath, root, pk_x, pk_y } = await axios
          .get(
            `https://192.168.1.87:5000/api/poll/${this.poll.pollId}/membership-tree-data`,
            {
              params: { commit },
            }
          )
          .then((r) => r.data);

        const optionId = this.poll.options.findIndex(
          (o) => o.id === this.selectedOptionId
        );
        const pollId = this.poll.pollId;
        const weightHash = F.toString(poseidon([weight]));
        const nullifier = F.toString(poseidon([commit, pollId]));
        const optionSecretHash = F.toString(poseidon([optionId, secret]));

        const pk = [
          babyjub.F.e(window.BigInt(pk_x)),
          babyjub.F.e(window.BigInt(pk_y)),
        ];
        const { C1, C2, k } = encrypt(pk, window.BigInt(weight));
        const membershipInput = {
          root,
          pathElements: siblings,
          pathIndices: merklePath,
          nullifier,
          secret: secret.toString(),
          pollId,
          weight: weight.toString(),
          weightHash,
          commit,
          optionId: optionId.toString(),
          optionSecretHash,
        };

        const voteInput = {
          C1x: toBig(C1[0]).toString(),
          C1y: toBig(C1[1]).toString(),
          C2x: toBig(C2[0]).toString(),
          C2y: toBig(C2[1]).toString(),
          PubX: toBig(pk[0]).toString(),
          PubY: toBig(pk[1]).toString(),
          k: k.toString(),
          m: weight.toString(),
        };

        console.log(voteInput);

        const membershipWasm = "/circom/PoseidonCheck_js/PoseidonCheck.wasm";
        const membershipZkey = "/circom/PoseidonCheck.zkey";
        const membershipVkey = await fetch(
          "/circom/PoseidonCheck.vkey.json"
        ).then((r) => r.json());

        const voteWasm = "/circom/ElGamalCheck_js/ElGamalCheck.wasm";
        const voteZkey = "/circom/ElGamalCheck.zkey";
        const voteVkey = await fetch("/circom/ElGamalCheck.vkey.json").then(
          (r) => r.json()
        );

        const { proof: membershipProof, publicSignals: membershipSignals } =
          await groth16.fullProve(
            membershipInput,
            membershipWasm,
            membershipZkey
          );

        const { proof: voteProof, publicSignals: voteSignals } =
          await groth16.fullProve(voteInput, voteWasm, voteZkey);

        const membershipVerified = await groth16.verify(
          membershipVkey,
          membershipSignals,
          membershipProof
        );

        const voteVerified = await groth16.verify(
          voteVkey,
          voteSignals,
          voteProof
        );

        if (!membershipVerified || !voteVerified) {
          throw new Error("Локальная валидация доказательств не пройдена");
        }

        const proof = {
          membershipProof,
          membershipSignals,
          voteProof,
          voteSignals,
          nullifier,
          pollId,
          weightHash,
          root,
          optionId,
          C1x: toBig(C1[0]).toString(),
          C1y: toBig(C1[1]).toString(),
          C2x: toBig(C2[0]).toString(),
          C2y: toBig(C2[1]).toString(),
        };

        await sendTransaction("poll/anonimus-vote", proof);
      } catch (e) {
        this.processError(e);
      }
    },
    async submitUsualVote() {
      this.errorMessage = "";
      try {
        const keys = this.walletStore.getKeyes();
        const tx = {
          transactionType: 2,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: "",
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
          optionId: this.selectedOptionId,
        };
        const rawData = `${tx.publicKey}${tx.fromAddress}${tx.timestamp}${tx.pollId}${tx.optionId}`;
        tx.signature = await signData(rawData, keys.privateKey);

        await sendTransaction("poll/usual-vote", tx);
      } catch (e) {
        this.processError(e);
      }
    },
    async register() {
      this.errorMessage = "";
      this.isRegistering = true;
      try {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;
        const secret = this.randomBigInt();
        localStorage.setItem("secret", secret.toString());
        const sh = F.toString(poseidon([secret]));

        const keys = this.walletStore.getKeyes();
        const tx = {
          transactionType: 8,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: "",
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
          sh,
        };
        const rawData = `${tx.publicKey}${tx.fromAddress}${tx.timestamp}${tx.pollId}${tx.sh}`;
        tx.signature = await signData(rawData, keys.privateKey);

        const response = await sendTransaction("poll/confirm-registration", tx);
        if (response.status === 200) {
          localStorage.setItem("weight", response.data.weight);
          this.localRegisteredPolls.push(this.poll.pollId);
          localStorage.setItem(
            "localRegisteredPolls",
            JSON.stringify(this.localRegisteredPolls)
          );
        }
      } catch (e) {
        this.processError(e);
      } finally {
        this.isRegistering = false;
      }
    },
    async completeRegistaration() {
      this.errorMessage = "";
      this.isCompletingRegistration = true;
      try {
        const keys = this.walletStore.getKeyes();
        const tx = {
          transactionType: 9,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: "",
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
        };
        const rawData = `${tx.publicKey}${tx.fromAddress}${tx.timestamp}${tx.pollId}`;
        tx.signature = await signData(rawData, keys.privateKey);
        await sendTransaction("poll/finish-registration", tx);

        await this.loadPoll();
      } catch (e) {
        this.processError(e);
      } finally {
        this.isCompletingRegistration = false;
      }
    },
    async endPoll() {
      this.errorMessage = "";
      this.isFinishingPoll = true;
      try {
        const keys = this.walletStore.getKeyes();
        const tx = {
          transactionType: 5,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: "",
          timestamp: new Date().toISOString(),
          pollId: this.poll.pollId,
        };
        const rawData = `${tx.publicKey}${tx.fromAddress}${tx.timestamp}${tx.pollId}`;
        tx.signature = await signData(rawData, keys.privateKey);

        await sendTransaction("poll/finish-poll", tx);

        this.poll.isFinished = true;
        this.fetchResults();
      } catch (e) {
        this.processError(e);
      } finally {
        this.isFinishingPoll = false;
      }
    },
    randomBigInt(bitLength = 256) {
      try {
        const byteLength = bitLength / 8;
        const randomBytes = new Uint8Array(byteLength);
        crypto.getRandomValues(randomBytes);
        randomBytes[0] |= 0b10000000;
        const hex =
          "0x" +
          Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return window.BigInt(hex);
      } catch (e) {
        this.processError(e);
        return 0n;
      }
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

.error-message {
  color: #dc3545;
  font-size: 16px;
  margin: 10px 0;
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
.weight-message {
  margin: 10px 0;
  font-size: 16px;
  color: #155724;
  background: #e6f4ea;
  padding: 8px 12px;
  border-radius: 6px;
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
