import {applyMiddleware, createStore} from 'redux'
import {composeWithDevTools} from 'redux-devtools-extension'
import {rootReducer} from './reducers';
import {createLogger} from 'redux-logger';

const initialState = {};

let enhancers;
// if (['development', 'local', 'test', 'dev', 'staging'].includes(process?.env?.NEXT_PUBLIC_ENV as any)) {
//     enhancers = composeWithDevTools(
//         applyMiddleware(
//             createLogger()
//         ),
//     );
// }

const store = createStore(rootReducer, initialState, enhancers);

export default store;
