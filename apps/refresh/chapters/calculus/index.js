import { createApp } from 'vue';
import Calculus from './Calculus.vue';
import './style.css';

const container = document.querySelector('[data-calculus]');
if (container) createApp(Calculus).mount(container);
