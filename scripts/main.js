// Entry point module: import core utilities and feature modules, then start the app
import { initApp } from './script.js';
import './presentation.js';
import './objectives.js';
import './data-collect.js';
import './resume.js';
import './job-offer.js';

// Wait for DOM to be ready, then initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
