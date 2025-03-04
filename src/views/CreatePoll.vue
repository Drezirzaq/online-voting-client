<template>
  <div class="poll-container">
    <h2>Создание онлайн голосования</h2>
    <form @submit.prevent="submitPoll">
      <div class="form-group">
        <label for="title">Название голосования:</label>
        <input type="text" id="title" v-model="pollTitle" required placeholder="Введите название голосования" />
      </div>

      <div v-for="(option, index) in options" :key="index" class="form-group option-group">
        <input
          type="text"
          v-model="options[index]"
          required
          placeholder="Введите вариант"
        />
        <button type="button" class="remove-btn" @click="removeOption(index)" v-if="options.length > 2">✖</button>
      </div>
      <button type="button" class="add-btn" @click="addOption">Добавить вариант</button>
      <button type="submit">Создать голосование</button>
    </form>
    <div v-if="pollCreated" class="poll-preview">
      <h3>Новое голосование:</h3>
      <p><strong>Название:</strong> {{ pollTitle }}</p>
      <p><strong>Варианты:</strong> {{ options.join(' | ') }}</p>
    </div>
  </div>
</template>

<script>
import { sendTransaction, signData } from '../services/walletService';
import { useWalletStore } from '../services/walletStore';

export default {
  data() {
    return {
      pollTitle: "", 
      options: ["", ""],
      pollCreated: false,
    };
  },
  setup() {
    const walletStore = useWalletStore();
    return { 
      walletStore
    };
  },
  methods: {
    addOption() {
      this.options.push("");
    },
    removeOption(index) {
      if (this.options.length > 2) {
        this.options.splice(index, 1);
      }
    },
    async submitPoll() {

      try {
        const keys = this.walletStore.getKeyes();
        const transactionData = {
          transactionType: 1,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature : '',
          timestamp: new Date().toISOString(),
          pollTitle: this.pollTitle,
          options: this.options
        };
        const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.pollTitle}`;
        transactionData.signature = await signData(rawData, keys.privateKey);
        await sendTransaction("poll/create-poll", transactionData);
        console.log("Транзакция создания голосования успешно отправлена.");
        this.pollCreated = true;
        this.pollTitle = "";
        this.options = ["", ""];
      } catch (error) {
        console.error(error.message);
      }
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

h2 {
  text-align: center;
  font-size: 22px;
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
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

.add-btn {
  background-color: #28a745;
}

.add-btn:hover {
  background-color: #218838;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  margin-left: 10px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 5px;
}

.remove-btn:hover {
  background-color: #c82333;
}

.poll-preview {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 5px;
  text-align: center;
}
</style>
