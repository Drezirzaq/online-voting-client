<template>
  <div class="node-status">
    <h1>Мониторинг состояния нод</h1>
    <button @click="refreshStatuses" class="refresh-button">Обновить статус</button>
    <div class="node-grid">
      <div v-for="node in nodes" :key="node.address" class="node-card">
        <h2>{{ node.address }}</h2>
        <div v-if="node.status">
          <p><strong>Количество блоков:</strong> {{ node.status.totalBlocks }}</p>
          <p><strong>Ожидающие транзакции:</strong> {{ node.status.pendingTransactionsCount }}</p>
          <p><strong>Подключенные пиры:</strong> {{ node.status.connectedPeers }}</p>
          <button @click="toggleDetails(node)" class="details-button">
            {{ node.showDetails ? 'Скрыть детали' : 'Показать детали' }}
          </button>
          <div v-if="node.showDetails" class="details">
            <h3>Блоки</h3>
            <div v-for="block in node.blocks" :key="block.hash" class="block">
              <p><strong>Индекс:</strong> {{ block.index }}</p>
              <p><strong>Хэш:</strong> <span class="wrap-text">{{ block.hash }}</span></p>
              <p><strong>Предыдущий хэш:</strong> <span class="wrap-text">{{ block.previousHash }}</span></p>
              <p><strong>Транзакции:</strong></p>
              <ul>
                <li v-for="transaction in block.transactions" :key="transaction.transactionId">
                  От: <span class="wrap-text">{{ transaction.fromAddress }}</span> → Кому: <span class="wrap-text">{{ transaction.toAddress }}</span> ({{ transaction.Amount }})
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div v-else>
          <p class="error">Не удалось получить статус ноды.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'NodeStatus',
  data() {
    return {
      nodes: [
        { address: 'http://192.168.1.87:5000', status: null, showDetails: false, blocks: [] },
        { address: 'http://192.168.1.87:5001', status: null, showDetails: false, blocks: [] },
        { address: 'http://192.168.1.87:5002', status: null, showDetails: false, blocks: [] },
        { address: 'http://192.168.1.87:5003', status: null, showDetails: false, blocks: [] },
        { address: 'http://192.168.1.87:5008', status: null, showDetails: false, blocks: [] },
      ]
    };
  },
  mounted() {
    this.fetchNodeStatuses();
  },
  methods: {
    async fetchNodeStatuses() {
      const requests = this.nodes.map(async (node) => {
        try {
          const response = await axios.get(`${node.address}/api/blockchain/status`);
          node.status = response.data;
        } catch (error) {
          console.error(`Ошибка при получении статуса для ${node.address}:`, error);
          node.status = null;
        }
      });
      await Promise.all(requests);
    },
    refreshStatuses() {
      this.nodes.forEach(node => {
        node.status = null;
        node.showDetails = false;
        node.blocks = [];
      });
      this.fetchNodeStatuses();
    },
    toggleDetails(node) {
      node.showDetails = !node.showDetails;
      if (node.showDetails && node.blocks.length === 0) {
        this.fetchNodeBlocks(node);
      }
    },
    async fetchNodeBlocks(node) {
      try {
        const response = await axios.get(`${node.address}/api/blockchain/blocks`);
        node.blocks = response.data;
      } catch (error) {
        console.error(`Ошибка при получении блоков для ${node.address}:`, error);
      }
    }
  }
};
</script>

<style scoped>
.node-status {
  font-family: 'Inter', sans-serif;
  padding: 20px;
  max-width: 1200px;
  margin: auto;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

.refresh-button {
  display: block;
  margin: 0 auto 20px;
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.refresh-button:hover {
  background-color: #3aa876;
}

.node-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.node-card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 350px;
  word-wrap: break-word;
}

.node-card h2 {
  margin-bottom: 10px;
  color: #333;
  text-align: center;
}

.node-card p {
  margin: 5px 0;
}

.details-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
  display: block;
  width: 100%;
}

.details-button:hover {
  background-color: #0056b3;
}

.details {
  margin-top: 15px;
  background-color: #eef5f9;
  padding: 15px;
  border-radius: 8px;
}

.block {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.block p {
  margin: 3px 0;
}

.wrap-text {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.error {
  color: red;
  text-align: center;
}

@media (max-width: 900px) {
  .node-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .node-grid {
    grid-template-columns: 1fr;
  }
}
</style>
