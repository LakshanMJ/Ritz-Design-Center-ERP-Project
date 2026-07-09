
export function getCWQuantiMatrixInputName(country_id: number, colorway_id: number, size_id: number) {
    return country_id + "_" + colorway_id + "_" + size_id;
}
export function getCWQuantiMatrixEstimateQty(country_id: number, colorway_id: number) {
    
    return country_id + "_" + colorway_id;
}
//Added to GeneralPo Module
export function apifyUIStateGeneralPOCWQuantityMatrixList(data: {}) {
    const apiData = [];

    for (let key in data) {
        let name = key;
        let value = data[key];
        apiData.push(apifyUIStateGeneralPOCWQuantityMatrixValue(name, value))
    }
    return apiData;
}

export function apifyUIStateGeneralPOCWQuantityMatrixValue(name: any, value: any) {
    const ids = name.split("_");
    const data = {
        country_id: parseInt(ids[0]),
        colorway_id: parseInt(ids[1]),
        size_id: parseInt(ids[2]),
        quantity: parseFloat(value)
    };
    return data
}

//End- General PO part

export function apifyUIStateCWQuantityMatrixValue(name: any, value: number) {
    const ids = name.split("_");
    const data = {
        country: parseInt(ids[0]),
        colorway: parseInt(ids[1]),
        size: parseInt(ids[2]),
        cad_quantity: value
    };
    return data
}
export function apifyUIStateCWEstimateMatrixValue(name: any, value: number) {
    const ids = name.split("_");
    const data = {
        country: parseInt(ids[0]),
        colorway: parseInt(ids[1]),
        estimated_quantity: value
    };
    return data
}
export function processGeneralPoQuantityMatrixAPIResponse(quantities: any) {
    let processedData = {}

    for (let i=0; i < quantities.length; i++) {
        const quantity = quantities[i];
        let quantityName = getCWQuantiMatrixInputName(quantity.country, quantity.colorway, quantity.size);
        processedData[quantityName] = quantity.quantity;
    }
    return processedData;
}

export function apifyUIStateCWQuantityMatrixList(data: {}) {
    const apiData = [];

    for (let key in data) {
        let name = key;
        let value = data[key];
        apiData.push(apifyUIStateCWQuantityMatrixValue(name, value))
    }
    return apiData;
}
export function apifyUIStateCWEstimateQuantityMatrixList(data: {}) {
    const apiData = [];
    for (let key in data) {
        let name = key;
        let value = data[key];
        apiData.push(apifyUIStateCWEstimateMatrixValue(name, value))
    }
    return apiData;
}
export function processQuantityMatrixAPIResponse(quantities: any) {
    let processedData = {}

    for (let i=0; i < quantities.length; i++) {
        const quantity = quantities[i];
        let quantityName = getCWQuantiMatrixInputName(quantity.country, quantity.colorway, quantity.size);
        processedData[quantityName] = quantity.cad_quantity;
    }
    return processedData;
}

export function processEstimateQuantityMatrixAPIResponse(estimateQuantities: any) {
    let processedData = {}

    for (let i=0; i < estimateQuantities.length; i++) {
        const estimateQuantity = estimateQuantities[i];
        let estimateQuantityName = getCWQuantiMatrixEstimateQty(estimateQuantity.country, estimateQuantity.colorway);
        processedData[estimateQuantityName] = estimateQuantity.estimated_quantity;
    }
    return processedData;
}


