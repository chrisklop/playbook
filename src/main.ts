import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startLoop } from './game/loop';

const app = mount(App, {
  target: document.getElementById('app')!,
});

startLoop();

export default app;
