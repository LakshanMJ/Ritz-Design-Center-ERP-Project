const INITIAL_STATE = {
    isLoggedIn: typeof window !== 'undefined' && localStorage.getItem('session') !== null,
    authUser: typeof window !== 'undefined' && localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')) : null,
};

const AuthReducer = (state = INITIAL_STATE, action: { type: any; payload: any; }) => {
    switch (action.type) {
        case 'SET_AUTH_STATE':
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};

export default AuthReducer;