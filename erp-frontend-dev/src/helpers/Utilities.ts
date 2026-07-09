import store from "@/states/store";
import { ERROR_MESSAGES } from "./constants/Constants";

export const buildFormData = (formJson: any, formMethod = 'POST') => {
    let form = new FormData();
    formJson = { ...formJson, ...{ _method: formMethod } };
    for (const key in formJson) {
        form.append(key, formJson[key]);
    }
    return form;
};

export const CapitalizeFirstLetterEachWord = (text: any) => {
    const words = text.split("_");

    for (let i = 0; i < words.length; i++) {
        words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    }

    return words.join(" ");
}

export const getDefaultError = (statusCode: number) => ERROR_MESSAGES[statusCode] || ERROR_MESSAGES['DEFAULT'];

export const hasRole = (role: string) => {
    const userRoles = store.getState().AuthReducer?.authUser?.role_set?.map((i: any) => i.name);
    return userRoles.includes(role) || userRoles.includes('ADMIN');
}

export const hasRoleMultiple = (roles: string[]) => {
    const userRoles = store.getState().AuthReducer?.authUser?.role_set?.map((i: any) => i.name);
    return roles.some((role) => userRoles.includes(role)) || userRoles.includes('ADMIN');
};
export const getNumberDisplayValue = (value: any) => {
    let displayValue = value;

    if (!value) {
        displayValue = '--';
    }

    if (value == 0) {
        displayValue = 0;
    }
    return displayValue;
}

export const formatAmount = (amount: any) => {
    const numericAmount = isNaN(Number(amount)) ? 0 : Number(amount);
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericAmount);
};

