import hterm from '../hterm';
import { TERM_NEW } from '../constants/terms';
import { resizeSession, sendSessionData } from './sessions';

const createReadyCallback = (dispatch, getState, term, uid) => () => {
  const io = term.io.push();
  io.onVTKeystroke = io.sendString = (data) => dispatch(sendSessionData(uid, data));
  io.onTerminalResize = (cols, rows) => {
    const { sessions } = getState();
    const session = sessions.sessions[uid];
    if (cols !== session.cols || rows !== session.rows) {
      dispatch(resizeSession(uid, cols, rows));
    }
  };

  // term.CursorNode_ is available at this point.
  const { ui } = getState();
  term.setCursorShape(ui.cursorShape);
};

export function createNewTerm ({ uid, cols, rows }) {
  return (dispatch, getState) => {
    const term = new hterm.Terminal();
    term.onTerminalReady = createReadyCallback(dispatch, getState, term, uid);
    dispatch({
      type: TERM_NEW,
      uid,
      term
    });
  };
}
