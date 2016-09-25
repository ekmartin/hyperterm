import { combineReducers } from 'redux';
import ui from './ui';
import sessions from './sessions';
import termGroups from './term-groups';
import terms from './terms';

export default combineReducers({
  ui,
  sessions,
  termGroups,
  terms
});
