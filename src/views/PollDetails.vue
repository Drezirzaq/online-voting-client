<template>
  <div class="poll-details">
    <h2>{{ poll ? poll.title : 'Голосование не найдено' }}</h2>

    <p v-if="poll && poll.isFinished" class="finished-message">Голосование завершено</p>

    <p v-else-if="hasVoted" class="voted-message">Вы уже приняли участие в этом голосовании</p>

    <div class="options" v-if="poll">
      <label v-for="option in poll.options" :key="option.id" class="option-label">
        <input
          type="radio"
          v-model="selectedOption"
          :value="option.id"
          :disabled="poll.isFinished || hasVoted"
        />
        {{ option.option }} 
        <span class="vote-count">({{ poll.votes[option.id] || 0 }} голосов)</span>
      </label>
    </div>

    <button
      @click="submitVote"
      :disabled="!selectedOption || poll?.isFinished || hasVoted"
      class="vote-button"
    >
      Проголосовать
    </button>

    <button v-if="poll && poll.isOwner && !poll.isFinished" @click="endPoll" class="end-button">
      Завершить голосование
    </button>

    <router-link to="/personal-account/polls" class="back-button">Вернуться к списку</router-link>
  </div>
</template>


---

### **🔹 Обновленный `script`**
```vue
<script>
import { getPollDetails } from '../services/pollService';
import { useWalletStore } from '../services/walletStore';
import { sendTransaction, signData } from '../services/walletService';

export default {
  props: ["id"],
  setup() {
    const walletStore = useWalletStore();
    return { walletStore };
  },
  data() {
    return {
      poll: null,
      selectedOption: null,
      hasVoted: false 
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
        PollId: this.id
      };
      this.poll = await getPollDetails(request);
      console.log("Голоса:", this.poll.votes);
    },
    checkVoteStatus() {
      const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
      this.hasVoted = localStorage.getItem(voteKey) === "true";
    },
    async submitVote() {
      if (!this.selectedOption) {
        alert(`Выберите вариант, за который будете голосовать!`);
        return;
      }
      try {
        const keys = this.walletStore.getKeyes();
        const transactionData = {
          transactionType: 2,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature: '',
          timestamp: new Date().toISOString(),
          toAddress: this.selectedOption,
          pollId: this.poll.pollId
        };
        const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.toAddress}${transactionData.pollId}`;
        transactionData.signature = await signData(rawData, keys.privateKey);
        await sendTransaction("poll/vote", transactionData);
        console.log("Транзакция успешно отправлена.");

        const voteKey = `voted_${this.walletStore.credentials.address}_${this.id}`;
        localStorage.setItem(voteKey, "true");
        this.hasVoted = true;

        if (this.poll.votes[this.selectedOption]) {
          this.poll.votes[this.selectedOption] += 1;
        } else {
          this.poll.votes[this.selectedOption] = 1;
        }
      } catch (error) {
        console.error(error.message);
      }
    },
    async endPoll() {
      const keys = this.walletStore.getKeyes();
      const transactionData = {
        transactionType: 5,
        publicKey: keys.publicKey.toString(),
        fromAddress: this.walletStore.credentials.address.toString(),
        signature: '',
        timestamp: new Date().toISOString(),
        pollId: this.poll.pollId
      };
      const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.pollId}`;
      transactionData.signature = await signData(rawData, keys.privateKey);
      await sendTransaction("poll/finish-poll", transactionData);

      console.log("Транзакция успешно отправлена.");
      
      this.poll.isFinished = true;
    }
  }
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

h2 {
  color: #333;
  font-size: 22px;
}

.finished-message, .voted-message {
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
