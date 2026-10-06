import { mount } from 'svelte';
import App from './App.svelte';
import './ui/styles/app.css';
import './ui/styles/paper.css';

const target = document.getElementById('app');
if (!target) throw new Error('elemento #app non trovato');

const app = mount(App, { target });

export default app;
