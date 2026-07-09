import {combineReducers} from 'redux';
import CostingReducer from "./costing/CostingReducer";
import AuthReducer from './Auth/AuthReducer';

const rootReducer = combineReducers({
    CostingReducer: CostingReducer,
    AuthReducer: AuthReducer,
});

export {rootReducer};
