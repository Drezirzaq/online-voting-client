<template>
  <div class="poll-list">
    <h2>Доступные голосования</h2>

    <div class="poll-columns">
      <div class="poll-column">
        <h3>Активные</h3>
        <ul v-if="activePolls.length">
          <li v-for="poll in activePolls" :key="poll.pollId">
            <router-link :to="'/personal-account/polls/' + poll.pollId" class="poll-link">
              <span v-if="poll.isPrivate" class="lock-icon">🔒</span>
              {{ poll.title }}
            </router-link>
          </li>
        </ul>
        <p v-else class="empty-message">Нет активных голосований.</p>
      </div>

      <div class="poll-column">
        <h3>Завершённые</h3>
        <ul v-if="finishedPolls.length">
          <li v-for="poll in finishedPolls" :key="poll.pollId">
            <router-link :to="'/personal-account/polls/' + poll.pollId" class="poll-link finished">
              <span v-if="poll.isPrivate" class="lock-icon">🔒</span>
              {{ poll.title }}
            </router-link>
          </li>
        </ul>
        <p v-else class="empty-message">Нет завершённых голосований.</p>
      </div>
    </div>

    <router-link to="/personal-account/create-poll" class="create-button">Создать голосование</router-link>
  </div>
</template>

<script>
import { getPolls } from '../services/pollService';

export default {
  data() {
    return {
      polls: []
    };
  },
  computed: {
    activePolls() {
      return this.polls.filter(poll => !poll.isFinished);
    },
    finishedPolls() {
      return this.polls.filter(poll => poll.isFinished);
    }
  },
  async mounted() {
    this.polls = await getPolls();
  }
};
</script>

<style scoped>
.poll-list {
  max-width: 800px;
  margin: auto;
  padding: 20px;
  text-align: center;
}

h2 {
  color: #333;
  font-size: 24px;
  margin-bottom: 20px;
}

.poll-columns {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.poll-column {
  flex: 1;
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 10px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin: 10px 0;
}

.poll-link {
  position: relative;
  display: block;
  padding: 10px 15px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  transition: 0.3s;
  text-align: center;
}

.poll-link .lock-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
}

.poll-link:hover {
  background: #0056b3;
}


.poll-link.finished {
  background: #6c757d;
}

.poll-link.finished:hover {
  background: #5a6268;
}

.create-button {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 15px;
  background: #28a745;
  color: white;
  border-radius: 5px;
  text-decoration: none;
}

.create-button:hover {
  background: #218838;
}

.empty-message {
  color: #999;
  font-size: 16px;
}

</style>
