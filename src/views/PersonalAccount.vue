<template>
  <div class="personal-account">
    <div class="account-header">
      <h1>Личный кабинет</h1>
      <div class="wallet-info">
        <div class="info-item">
          <span class="label">Адрес кошелька:</span>
          <span class="value mono">{{ this.walletStore.credentials.address }}</span>
        </div>
        <div class="info-item">
          <span class="label">Баланс:</span>
          <span class="value">{{ this.balance }} ETH</span>
        </div>
      </div>
    </div>

  
    <div class="transaction-card">
      <h2 class="section-title">
        <i class="fas fa-paper-plane"></i>
        Отправить транзакцию
      </h2>
      
      <div class="form-group">
        <label for="recipient-address" class="input-label">
          Адрес получателя
          <input
            type="text"
            id="recipient-address"
            v-model="recipientAddress"
            placeholder="0x..."
            class="modern-input"
          />
        </label>
      </div>

      <div class="form-group">
        <label for="amount" class="input-label">
          Сумма
          <div class="input-with-suffix">
            <input
              type="number"
              id="amount"
              v-model="sendAmount"
              placeholder="0.00"
              class="modern-input"
              min="0"
              step="0.0001"
            />
            <span class="suffix">ETH</span>
          </div>
        </label>
      </div>

      <button @click="sendTransaction" class="gradient-button">
        Подтвердить перевод
        <i class="fas fa-arrow-right"></i>
      </button>
            
    </div>
    <WalletKeys v-if="showKeys" :public-key="this.infoKeys.publicKey" :private-key="this.infoKeys.privateKey" />
    <div class="action-buttons">
      <button @click="toggleKeys" class="icon-button">
        <i :class="['fas', showKeys ? 'fa-eye-slash' : 'fa-key']"></i>
        {{ showKeys ? 'Скрыть ключи' : 'Показать ключи' }}
      </button>
      
      <button @click="logout" class="icon-button">
        <i class="fas fa-sign-out-alt"></i>
        Выйти
      </button>
      <button @click="poll" class="icon-button">
        <!-- <i class="fas fa-sign-out-alt"></i> -->
        Голосование
      </button>
    </div>
  </div>
</template>
<script>

import WalletKeys from '../components/WalletKeys.vue';
import { getWalletBalance } from '../services/walletService';
import { signData } from '../services/walletService';
import { sendTransaction } from '../services/walletService';
import { useWalletStore } from '../services/walletStore';

export default {
  name: 'PersonalAccount',
  components: {
    WalletKeys,
  },
  setup() {
    const walletStore = useWalletStore();

    return { 
      walletStore
    };
  },
  data(){
    return{
      infoKeys:{
        publicKey: '',
        privateKey: ''
      },
      balance: 0,
      showKeys: false,
      recipientAddress: '',
      sendAmount: 0,
    }
  },
  async created() {
  },
  async mounted() {
    await this.getBalance();
  },
  methods:{
    toggleKeys(){
      if (!this.showKeys){       
        try {
          const keyes = this.walletStore.getKeyes();
          this.infoKeys.publicKey = keyes.publicKey;
          this.infoKeys.privateKey = keyes.privateKey;
          this.showKeys = true;
        } catch (error) {
          alert(error.message);
        }
      } else {
        this.showKeys = false;
        this.infoKeys.publicKey = '';
        this.infoKeys.privateKey = '';
      }
    },
    logout() {
      this.$router.push('/');
    },
    poll() {
      this.$router.push('/personal-account/polls')
    },
    async getBalance() {
      try {
        if (!this.walletStore.credentials.address)
          throw new Error("Адрес кошелька отсутствует");
        this.balance = await getWalletBalance(this.walletStore.credentials.address);
      }
      catch (error) {
        console.error(error.message);
      }
    },
    async sendTransaction() {
      if (!this.recipientAddress || this.sendAmount <= 0) {
        console.warn("Введите корректные данные для отправки транзакции.");
        return;
      }
      try {
        const keys = this.walletStore.getKeyes();
        const transactionData = {
          transactionType: 0,
          publicKey: keys.publicKey.toString(),
          fromAddress: this.walletStore.credentials.address.toString(),
          signature : '',
          timestamp: new Date().toISOString(),
          toAddress: this.recipientAddress.toString(),
          amount: this.sendAmount,
        };
        const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.toAddress}${transactionData.amount}`;
        transactionData.signature = await signData(rawData, keys.privateKey);
        console.log(transactionData.timestamp);
        await sendTransaction("wallet/transfer", transactionData);
        this.sendAmount = 0;    
        console.log("Транзакция успешно отправлена.");
      } catch (error) {
        console.error(error.message);
      }
    },
  },
}
</script>
<style src="../styles/PersonalAccount.css" scoped></style>