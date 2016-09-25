import { TERM_NEW } from '../constants/terms';
import { SESSION_PTY_EXIT, SESSION_USER_EXIT } from '../constants/sessions';

// This can't be immutable
// because of circular references in hterm:
const initialState = {
  terms: {}
};

const deleteTerm = (state, action) => {
  const terms = Object.keys(state.terms)
    .filter(uid => uid !== action.uid)
    .reduce((terms, uid) => Object.assign({}, terms, {
      [uid]: state.terms[uid]
    }), {});

  return { terms };
};

const createTerm = (state, action) => ({
  terms: Object.assign({}, state.terms, {
    [action.uid]: action.term
  })
});

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case TERM_NEW:
      return createTerm(state, action);
    case SESSION_PTY_EXIT:
    case SESSION_USER_EXIT:
      return deleteTerm(state, action);
    default:
      return state;
  }
};

export default reducer;
