import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import TileMockup from './TileMockup.svelte';
import { startLoop } from './game/loop';

const mockup = new URLSearchParams(window.location.search).get('mockup');

const target = document.getElementById('app')!;
const app = mockup === 'tiles'
  ? mount(TileMockup, { target })
  : mount(App, { target });

if (mockup !== 'tiles') startLoop();

export default app;
