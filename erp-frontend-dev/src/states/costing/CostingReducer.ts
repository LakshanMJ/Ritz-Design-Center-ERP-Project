const INITIAL_STATE = {
  order_inquiry: {},
  metadata: {}
};

const CostingReducer = (state = INITIAL_STATE, action: any) => {
  switch (action.type) {
    case 'SET_COSTING_REDUCER_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export default CostingReducer;
