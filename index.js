import { apply, isSupported } from './invoker.js';
if (!isSupported()) apply();
