export const APP_TITLE = 'Nexa ERP';

export const VALIDATION_ERROR_CODE = 400;

export const ERROR_MESSAGES = {
    [VALIDATION_ERROR_CODE]: 'Invalid request. Please check your input and try again.',
    401: 'Unauthorized. Please log in again to continue.',
    403: 'Access denied. You do not have permission to access this resource.',
    404: 'Resource not found.',
    500: 'An internal server error occurred.',
    DEFAULT: 'An error occurred. Please try again later.',
}

export const DEFAULT_SUCCESS = 'Your changes have been saved.';

export const ACTIVE_STATUS = 'Active';
export const INACTIVE_STATUS = 'Inactive';
export const OPEN_STATUS = 'Open';
export const CLOSE_STATUS = 'Close';

export const REFRESH_TOKEN_EXPIRED = 'refresh_token_expired'
export const ACCESS_TOKEN_EXPIRED = 'token_not_valid'

export const MUI_AUTOCOMPLETE_REMOVE_OPTION = 'removeOption'; // From mui documentation
export const MUI_AUTOCOMPLETE_CLEAR_OPTION = 'clear'; // From mui documentation

export const ORDER_MATERIAL_SELECT_SUPPLIER_SELECT_PHASE = 'select_supplier';

// Order material related variables
export const ORDER_MATERIAL_PACK_TYPE = 'orderpack';
export const ORDER_MATERIAL_PACK_ITEM_TYPE = 'orderpackitem';
export const ORDER_MATERIAL_TYPE = 'material';
export const ORDER_PACKAGING_TYPE = 'packaging';


// Service Edit Types
export const ORDER_PACK_ITEM_WASH_SERVICE_TYPE = 'wash_service';

export const ORDER_PACK_ITEM_EMB_SERVICE_TYPE = 'embellishment_service';
