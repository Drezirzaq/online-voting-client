<template>
  <div id="app">
    <nav>
      <router-link to="/node-status">Статус</router-link>
      <router-link to="/personal-account">Личный кабинет</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
nav {
  display: flex;
  gap: 20px;
  background-color: #42b983;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
}

nav a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

nav a.router-link-exact-active {
  text-decoration: underline;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
