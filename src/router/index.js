import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import CreateWallet from '../views/CreateWallet.vue';
import AuthPage from '../views/AuthPage.vue';
import PersonalAccount from '../views/PersonalAccount.vue';
import NodeStatus from '../views/NodeStatus.vue';
import CreatePoll from '../views/CreatePoll.vue';
import PollList from '../views/PollList.vue';
import PollDetails from '../views/PollDetails.vue';
import ProofDemo from '../views/ProofDemo.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/create-wallet', component: CreateWallet },
  { path: '/auth', component: AuthPage },
  { path: '/node-status', component: NodeStatus },
  { path: '/proof-demo', component: ProofDemo },
  { path: '/personal-account', component: PersonalAccount },
  { path: '/personal-account/create-poll', component: CreatePoll },
  { path: '/personal-account/polls/:id', component: PollDetails, props: true },
  { path: '/personal-account/polls', component: PollList },
  { path: '/personal-account/polls', component: PollList },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;