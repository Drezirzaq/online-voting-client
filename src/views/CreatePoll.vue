<template>
  <div class="poll-container">
    <h2>Создание онлайн голосования</h2>
    <form @submit.prevent="submitPoll">
      <div class="form-group">
        <label for="title">Название голосования:</label>
        <input type="text" id="title" v-model="pollTitle" required placeholder="Введите название голосования" />
      </div>

      <div v-for="(option, index) in options" :key="index" class="form-group option-group">
        <input type="text" v-model="options[index]" required placeholder="Введите вариант" />
        <button type="button" class="remove-btn" @click="removeOption(index)" v-if="options.length > 2">✖</button>
      </div>

      <button type="button" class="add-btn" @click="addOption">Добавить вариант</button>

      <div class="checkbox-group">
        <input type="checkbox" id="private" v-model="isPrivate" />
        <label for="private">Закрытое голосование</label>
      </div>


      <div v-if="isPrivate" class="invited-users">
        <label>Приглашённые пользователи:</label>
        <div
          v-for="(user, index) in invitedUsers"
          :key="index"
          class="invited-user-row"
        >
          <input type="text" v-model="invitedUsers[index]" placeholder="Имя пользователя" />
          <button
            type="button"
            class="remove-btn"
            @click="removeUser(index)"
            v-if="invitedUsers.length > 1"
          >✖</button>
        </div>
        <button type="button" class="add-user-btn" @click="addUser">Добавить пользователя</button>
      </div>  

      <div class="form-group">
        <label for="tokens">Количество токенов:</label>
        <input type="number" id="tokens" v-model.number="tokenAmount" min="0" placeholder="Введите количество токенов" />
      </div>

      <button type="submit">Создать голосование</button>
    </form>

    <div v-if="pollCreated" class="poll-preview">
      <h3>Новое голосование:</h3>
      <p><strong>Название:</strong> {{ pollTitle }}</p>
      <p><strong>Варианты:</strong> {{ options.join(' | ') }}</p>
      <p><strong>Тип:</strong> {{ isPrivate ? 'Закрытое' : 'Открытое' }}</p>
      <p v-if="isPrivate"><strong>Приглашённые:</strong> {{ invitedUsers.join(', ') }}</p>
      <p><strong>Токены:</strong> {{ tokenAmount }}</p>
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
      tokenAmount: 0,
      isPrivate: false,
      invitedUsers: [""],
    };
  },
  setup() {
    const walletStore = useWalletStore();
    return { 
      walletStore
    };
  },
  methods: {
    addUser() {
      this.invitedUsers.push("");
    },
    removeUser(index) {
      this.invitedUsers.splice(index, 1);
    },
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
        console.log("KEYS", keys.privateKey);
        const transactionData = {
          transactionType: 1,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature : '',
          timestamp: new Date().toISOString(),
          pollTitle: this.pollTitle,
          options: this.options,
          isPrivate: this.isPrivate,
          invitedUsers: this.invitedUsers,
          tokensAmount: this.tokenAmount
        };
        console.log("TRANSACTION");
        const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.pollTitle}`;
        transactionData.signature = await signData(rawData, keys.privateKey);
        console.log("SIGNATURE");
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
.checkbox-group {
  margin-top: 10px;
  align-items: center;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-right: 10px;
}
.invited-users {
  margin-top: 10px;
  padding: 10px;
  background: #f1f1f1;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.invited-user-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.invited-user-row input {
  flex: 1;
}

.invited-user-row .remove-btn {
  margin-left: 10px;
  padding: 6px 10px;
}

.add-user-btn {
  width: 100%;
  background-color: #28a745;
  margin-top: 5px;
}

.add-user-btn:hover {
  background-color: #218838;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin: 10px 0;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-right: 10px;
}
</style>
